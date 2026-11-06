# High-Level Architecture & Technical Specification

---

## 1. System Overview & Technology Stack

The British Auction RFQ platform is built on an enterprise multi-tier architecture designed for low-latency state synchronization, strict data consistency, and seamless user experiences.

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client (React + TypeScript + Vite)"]
        UI_Buyer["Buyer Dashboard & RFQ Studio"]
        UI_Supplier["Supplier Bidding Terminal"]
        WS_Client["WebSocket Real-Time Listener"]
        State_Sync["Auction Clock & State Engine"]
    end

    subgraph APILayer["FastAPI Application Server"]
        Router_Auth["Auth Router (JWT / RBAC)"]
        Router_RFQ["RFQ & Auction Router"]
        Router_Bid["Bidding Engine Router"]
        WS_Hub["WebSocket Room Manager"]
    end

    subgraph ServiceLayer["Core Domain Services"]
        AuctionEngine["Auction Engine (Trigger & Extension Logic)"]
        RankingService["Ranking & Leaderboard Service"]
        ValidationService["Bid & Timing Validation"]
        ActivityLogger["Audit & Activity Logging"]
    end

    subgraph PersistenceLayer["Database & Storage"]
        DB[(PostgreSQL / SQLite via SQLAlchemy)]
        Tables["users | rfqs | bids | auction_configurations | invitations | activity_logs"]
    end

    UI_Buyer -->|HTTP REST| Router_Auth
    UI_Buyer -->|HTTP REST| Router_RFQ
    UI_Supplier -->|HTTP REST| Router_Bid
    WS_Client <-->|Full Duplex WS| WS_Hub

    Router_Bid --> ValidationService
    ValidationService --> AuctionEngine
    AuctionEngine --> RankingService
    AuctionEngine --> ActivityLogger

    AuctionEngine -->|Serialized DB Tx| DB
    AuctionEngine -->|Broadcast Event| WS_Hub
    WS_Hub -->|Push Real-time State| WS_Client
```

### Component Stack
| Tier | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite | Fast Single Page Application (SPA) |
| **Styling & UI** | Tailwind CSS, Lucide Icons | Responsive modern procurement interface |
| **Backend API** | Python 3.9+, FastAPI, Pydantic v2 | High-throughput async REST endpoints |
| **ORM / Storage** | SQLAlchemy 2.0 (PostgreSQL / SQLite) | ACID transactions, explicit relation models |
| **Real-Time** | FastAPI Native WebSockets (`WebSocketEndpoint`) | Bi-directional auction events & countdown sync |
| **Security** | Python-jose, Passlib (bcrypt), OAuth2 Bearer | JWT authentication, role guards |

---

## 2. Concurrency & Extension Atomicity

In live reverse auctions, two suppliers may submit bids within milliseconds of each other. A race condition could result in:
1. Double-calculating extensions (e.g. extending by $2Y$ instead of $Y$).
2. Stale rank evaluations (wrong supplier declared $L1$).

### Locking & Serialization Strategy
```mermaid
sequenceDiagram
    autonumber
    actor S1 as Supplier A
    actor S2 as Supplier B
    participant API as FastAPI Router
    participant Engine as Auction Engine
    participant DB as PostgreSQL (Tx)
    participant WS as WebSocket Hub

    S1->>API: POST /api/rfqs/{id}/bids ($44,000)
    S2->>API: POST /api/rfqs/{id}/bids ($43,500)
    
    Note over API,DB: Begin Transaction with Row-Level Lock
    API->>DB: SELECT * FROM rfqs WHERE id = :id FOR UPDATE
    Note over DB: RFQ record locked for S1

    Engine->>DB: Fetch previous ranks & latest bids
    Engine->>DB: Insert new bid ($44,000)
    Engine->>Engine: Re-evaluate ranks (S1 becomes L1)
    Engine->>Engine: Trigger check: L1 Changed in last X mins? -> YES
    Engine->>Engine: New Close = min(Close + Y, ForcedClose)
    Engine->>DB: UPDATE rfqs SET current_close_at = :new_close
    Engine->>DB: INSERT INTO activity_logs (AUCTION_EXTENDED)
    DB->>API: COMMIT
    API->>WS: Broadcast ('auction_extended', new_leaderboard)

    Note over DB: RFQ lock released -> S2 Transaction begins
    API->>DB: SELECT * FROM rfqs WHERE id = :id FOR UPDATE
    Engine->>DB: Fetch latest bids (now includes S1's $44,000)
    Engine->>DB: Insert S2 bid ($43,500)
    Engine->>Engine: Re-evaluate ranks (S2 becomes new L1)
    Engine->>Engine: Trigger check: L1 Changed? -> YES
    Engine->>Engine: New Close = min(Close + Y, ForcedClose)
    Engine->>DB: UPDATE rfqs SET current_close_at = :new_close_2
    DB->>API: COMMIT
    API->>WS: Broadcast ('auction_extended', new_leaderboard)
```

---

## 3. Database Schema Design (7 Tables)

```mermaid
erDiagram
    users ||--o{ rfqs : "creates (as buyer)"
    users ||--o| supplier_profiles : "has"
    users ||--o{ rfq_invitations : "invited to"
    users ||--o{ bids : "submits"
    users ||--o{ activity_logs : "triggers"

    rfqs ||--|| auction_configurations : "configured with"
    rfqs ||--o{ rfq_invitations : "invites"
    rfqs ||--o{ bids : "contains"
    rfqs ||--o{ activity_logs : "records"

    users {
        string id PK
        string email UK
        string password_hash
        string full_name
        string role "BUYER | SUPPLIER"
        boolean is_active
        datetime created_at
    }

    supplier_profiles {
        string id PK
        string user_id FK
        string carrier_name
        string contact_number
        string address
        datetime created_at
    }

    rfqs {
        string id PK
        string reference_id UK
        string buyer_id FK
        string name
        string description
        string service_type
        string pickup_location
        string destination
        datetime pickup_at
        datetime bid_start_at
        datetime initial_close_at
        datetime current_close_at
        datetime forced_close_at
        string status "DRAFT | SCHEDULED | ACTIVE | CLOSED | FORCE_CLOSED"
        datetime created_at
    }

    auction_configurations {
        string id PK
        string rfq_id FK, UK
        integer trigger_window_minutes "X"
        integer extension_duration_minutes "Y"
        string extension_trigger "bid_received | any_rank_change | l1_change"
        datetime created_at
    }

    rfq_invitations {
        string id PK
        string rfq_id FK
        string supplier_id FK
        string invitation_status "INVITED | ACCEPTED | DECLINED"
        datetime invited_at
    }

    bids {
        string id PK
        string rfq_id FK
        string supplier_id FK
        numeric freight_charges
        numeric origin_charges
        numeric destination_charges
        numeric total_amount
        integer transit_days
        integer validity_days
        datetime submitted_at
        string idempotency_key
    }

    activity_logs {
        string id PK
        string rfq_id FK
        string actor_id FK
        string event_type "BID_SUBMITTED | RANKING_CHANGED | AUCTION_EXTENDED | AUCTION_CLOSED | AUCTION_FORCE_CLOSED"
        text description
        json metadata_json
        datetime created_at
    }
```

---

## 4. API Endpoints Specification

### 4.1 Authentication (`/api/auth`)
- `POST /api/auth/register`: Create user (`BUYER` or `SUPPLIER` + carrier profile).
- `POST /api/auth/login`: Form-encoded login returning JWT `access_token` and user profile.
- `GET /api/auth/me`: Current user session and claims.

### 4.2 RFQ Management (`/api/rfqs`)
- `POST /api/rfqs`: Create new RFQ with British Auction configuration.
- `GET /api/rfqs`: List RFQs (filtered by status or buyer ownership).
- `GET /api/rfqs/{id}`: Detailed RFQ view with configuration and current status.
- `POST /api/rfqs/{id}/publish`: Transition from `DRAFT` to `SCHEDULED` or `ACTIVE`.
- `POST /api/rfqs/{id}/invite`: Invite supplier(s) by ID or email.

### 4.3 Bidding & Auctions (`/api/rfqs/{id}/bids` & `/api/auctions`)
- `POST /api/rfqs/{id}/bids`: Submit initial quote or counter-bid.
- `GET /api/rfqs/{id}/leaderboard`: Return sorted list of participants ($L1, L2, \dots$) with current prices.
- `GET /api/rfqs/{id}/my-bids`: Retrieve historical bids submitted by the authenticated supplier.
- `GET /api/rfqs/{id}/bids`: Complete audit trail of bids for Buyer.
- `GET /api/rfqs/{id}/activity`: Complete activity log including extension reasons.

### 4.4 WebSocket Real-Time Channel (`/ws/auctions/{rfq_id}`)
- **Client Handshake:** `ws://localhost:8000/ws/auctions/{rfq_id}?token={jwt}`
- **Server Events:**
  - `CONNECTED`: Initial sync of clock time, current close time, forced close time, and status.
  - `BID_PLACED`: Inform subscribers of new quote event.
  - `LEADERBOARD_UPDATED`: Full updated rankings.
  - `AUCTION_EXTENDED`: `{ new_close_at, extension_minutes, reason, forced_close_at }`
  - `AUCTION_CLOSED`: `{ status: "CLOSED" | "FORCE_CLOSED" }`
