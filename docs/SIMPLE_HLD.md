# High-Level Design (HLD): British Auction in RFQ System

---

## 1. System Architecture Diagram

```mermaid
flowchart TD
    %% Client Layer
    subgraph CLIENT ["1. CLIENT LAYER (Web Browser)"]
        direction LR
        B_UI["Buyer Studio<br/>• Create RFQ<br/>• Target Budget Slider<br/>• Live Leaderboard<br/>• Cancel Auction"]
        S_UI["Carrier Terminal<br/>• Itemized Quote Entry<br/>• L1-L3 Win Guidance<br/>• Real-Time Countdown<br/>• Activity Logs"]
        ZOD["Zod Schema Validation<br/>• Login & Timings<br/>• Charges & Budget Cap"]
        LENIS["Lenis Smooth Scroll & Canvas Motion"]
    end

    %% Gateway & Transport
    subgraph GATEWAY ["2. API GATEWAY & TRANSPORT (Port 8001)"]
        direction LR
        REST["FastAPI REST Endpoints<br/>/api/auth • /api/rfqs • /api/rfqs/{id}/bids"]
        WS["Native WebSocket Hub<br/>/ws/auctions/{rfq_id}"]
    end

    %% Engine Core
    subgraph ENGINE ["3. BUSINESS ENGINES & EVALUATORS"]
        direction TB
        AUTH["Auth & JWT Service<br/>RBAC: BUYER / SUPPLIER"]
        A_ENG["AuctionEngine<br/>• UTC Milestone Clock<br/>• Server-Side Charge Calculation<br/>• Target Budget Validation"]
        EXT["ExtensionService<br/>• British Trigger Rules (A, B, C)<br/>• Window Monitor: (Close - X mins)<br/>• Dynamic Add: (Close + Y mins)<br/>• Hard Ceiling Clamp: min(T_new, T_forced)"]
        RANK["RankingService<br/>• Sort Ascending (Lowest Price = L1)<br/>• Tie-Breaking (Timestamp Priority)"]
    end

    %% Data Layer
    subgraph DATA ["4. PERSISTENCE & STORAGE LAYER"]
        direction LR
        DB[(Relational DB<br/>SQLite / PostgreSQL)]
        T_USERS[("users<br/>supplier_profiles")]
        T_RFQS[("rfqs<br/>auction_configurations")]
        T_BIDS[("bids<br/>rfq_invitations")]
        T_LOGS[("activity_logs")]
    end

    %% Wiring
    B_UI --> ZOD
    S_UI --> ZOD
    ZOD -->|HTTP POST / GET| REST
    B_UI <-->|Bid & Extension Events| WS
    S_UI <-->|Live Stream| WS

    REST --> AUTH
    REST --> A_ENG
    A_ENG --> RANK
    A_ENG --> EXT

    A_ENG -->|Broadcast Event| WS
    EXT -->|Extension Alert| WS

    AUTH --> DB
    A_ENG --> DB
    RANK --> DB
    EXT --> DB

    DB --- T_USERS
    DB --- T_RFQS
    DB --- T_BIDS
    DB --- T_LOGS

    %% Node Styles
    style CLIENT fill:#f8f9fa,stroke:#212529,stroke-width:2px
    style GATEWAY fill:#f1f3f5,stroke:#212529,stroke-width:2px
    style ENGINE fill:#e9ecef,stroke:#212529,stroke-width:2px
    style DATA fill:#dee2e6,stroke:#212529,stroke-width:2px
```

---

## 2. Visual Architecture Box Diagram (Overview)

```text
+---------------------------------------------------------------------------------------------------+
|                                       1. CLIENT PRESENTATION LAYER                                |
|                                                                                                   |
|   +---------------------------------------------+   +-----------------------------------------+   |
|   |         ENTERPRISE BUYER STUDIO             |   |         CARRIER BIDDING TERMINAL        |   |
|   |  - RFQ Creation with Budget Slider (Zod)    |   |  - Itemized Quote Entry (Freight+Origin)|   |
|   |  - Live Reverse Auction Leaderboard         |   |  - Dynamic L1-L3 Win-Probability Guide  |   |
|   |  - Cancel Auction & Audit Log Viewer        |   |  - Dual Timers (Close vs Forced Cap)    |   |
|   +---------------------------------------------+   +-----------------------------------------+   |
|                                         |                                 |                       |
|                                         v                                 v                       |
|   +-------------------------------------------------------------------------------------------+   |
|   |                  ZOD VALIDATION ENGINE  &  LENIS SMOOTH SCROLL / CANVAS MOTION            |   |
|   +-------------------------------------------------------------------------------------------+   |
+-----------------------------------------------|---------------------------------------------------+
                                                | HTTP Requests & WebSockets
                                                v
+---------------------------------------------------------------------------------------------------+
|                                   2. API GATEWAY & ROUTER LAYER                                   |
|                                                                                                   |
|   +---------------------------------------------+   +-----------------------------------------+   |
|   |         FASTAPI REST CONTROLLERS            |   |        WEBSOCKET CONNECTION MANAGER     |   |
|   |  - POST /api/auth/login                     |   |  - /ws/auctions/{rfq_id} (Room Based)   |   |
|   |  - GET/POST /api/rfqs                       |   |  - Real-time Bid & Extension Broadcast  |   |
|   |  - POST /api/rfqs/{id}/bids                 |   |  - Active Reconnect & Fallback Polling  |   |
|   +---------------------------------------------+   +-----------------------------------------+   |
+-----------------------------------------------|---------------------------------------------------+
                                                |
                                                v
+---------------------------------------------------------------------------------------------------+
|                                 3. BUSINESS & AUCTION ENGINES                                     |
|                                                                                                   |
|   +-------------------------+  +--------------------------+  +--------------------------------+   |
|   |      AUCTION ENGINE     |  |     RANKING SERVICE      |  |       EXTENSION SERVICE        |   |
|   | - UTC Clock Authority   |  | - Reverse Sorting (Min ₹)|  | - Trigger Window Check (X min) |   |
|   | - Total Amount Compute  |  | - Tie-Breaking via Time  |  | - Dynamic Add (Y min)          |   |
|   | - Budget Ceiling Check  |  | - Rank Assign (L1,L2,L3) |  | - Forced Ceiling Clamp Rule    |   |
|   +-------------------------+  +--------------------------+  +--------------------------------+   |
+-----------------------------------------------|---------------------------------------------------+
                                                | SQL / ORM Queries
                                                v
+---------------------------------------------------------------------------------------------------+
|                                     4. DATABASE STORAGE LAYER                                     |
|                                                                                                   |
|   [users] -----------> [supplier_profiles]           [rfqs] <----------> [auction_configurations] |
|      |                                                 |                                          |
|      +---------------------+---------------------------+                                          |
|                            |                           |                                          |
|                            v                           v                                          |
|                     [rfq_invitations]                [bids] -------------> [activity_logs]        |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. End-to-End Bidding & Extension Decision Flowchart

```mermaid
flowchart TD
    START(["Carrier Submits Bid"]) --> V1{"Client Zod Validation<br/>Charges >= 0 & Total > 0?"}
    
    V1 -- No --> ERR1["Show Validation Error<br/>Block Submission"]
    V1 -- Yes --> API["POST /api/rfqs/{id}/bids"]

    API --> AUTH{"Valid JWT Token &<br/>Carrier Invited?"}
    AUTH -- No --> ERR2["HTTP 403 Forbidden"]
    
    AUTH -- Yes --> BUDGET{"Does Total Exceed<br/>Target Budget Ceiling?"}
    BUDGET -- Yes --> ERR3["HTTP 400 Bad Request<br/>Budget Ceiling Exceeded"]

    BUDGET -- No --> STATUS{"Auction Active?<br/>(bid_start <= Now < current_close)"}
    STATUS -- No --> ERR4["HTTP 400 Bad Request<br/>Auction Concluded / Closed"]

    STATUS -- Yes --> SAVE_BID["Insert Bid to DB<br/>Total = Freight + Origin + Dest"]

    SAVE_BID --> RECALC["RankingService:<br/>Calculate New Leaderboard<br/>(L1, L2, L3...)"]

    RECALC --> TRIG_WINDOW{"Is Current Time Inside<br/>Trigger Window?<br/>(Now >= current_close - X mins)"}

    TRIG_WINDOW -- No --> NO_EXT["No Extension Triggered"]
    
    TRIG_WINDOW -- Yes --> EVAL_RULE{"Evaluate Extension Trigger Rule"}

    EVAL_RULE -->|Option A: any_bid| EXT_TRIGGERED["Condition Satisfied!"]
    EVAL_RULE -->|Option B: any_rank_change| CHK_B{"Did any supplier<br/>rank shift?"}
    EVAL_RULE -->|Option C: l1_change| CHK_C{"Did prevailing L1<br/>leader change?"}

    CHK_B -- No --> NO_EXT
    CHK_B -- Yes --> EXT_TRIGGERED

    CHK_C -- No --> NO_EXT
    CHK_C -- Yes --> EXT_TRIGGERED

    EXT_TRIGGERED --> COMPUTE_NEW["Compute Proposed Close:<br/>Proposed = current_close + Y mins"]

    COMPUTE_NEW --> CLAMP{"Is Proposed Close > Forced Close Ceiling?<br/>(Proposed > forced_close)"}

    CLAMP -- Yes --> CAP_APPLIED["Clamp to Ceiling:<br/>new_close = forced_close<br/>(Hard Ceiling Enforced)"]
    CLAMP -- No --> REG_APPLIED["Apply Full Extension:<br/>new_close = Proposed"]

    CAP_APPLIED --> UPDATE_DB["Update rfq.current_close_at in DB<br/>Log AUCTION_EXTENDED event"]
    REG_APPLIED --> UPDATE_DB

    UPDATE_DB --> WS_EXT["WebSocket Broadcast:<br/>AUCTION_EXTENDED Event<br/>(+Y mins, Reason, New Deadline)"]

    NO_EXT --> WS_BID["WebSocket Broadcast:<br/>NEW_BID & RANKING_CHANGED Event"]
    WS_EXT --> WS_BID

    WS_BID --> SUCCESS(["201 Created: Return Bid & Live Rank"])

    %% Styles
    style START fill:#000000,color:#fff
    style SUCCESS fill:#10b981,color:#fff
    style ERR1 fill:#ef4444,color:#fff
    style ERR2 fill:#ef4444,color:#fff
    style ERR3 fill:#ef4444,color:#fff
    style ERR4 fill:#ef4444,color:#fff
    style EXT_TRIGGERED fill:#f59e0b,color:#000
    style CAP_APPLIED fill:#f97316,color:#fff
```

---

## 4. Auction Lifecycle State Machine Flowchart

```mermaid
flowchart LR
    DRAFT["DRAFT<br/>RFQ Created by Buyer"] -->|Set Schedule & Publish| SCHED["SCHEDULED<br/>Now < bid_start_at"]
    
    SCHED -->|Now >= bid_start_at| ACTIVE["ACTIVE<br/>Bidding Open to Invited Carriers"]
    
    ACTIVE -->|Trigger Condition Met inside Window| EXT["ACTIVE (EXTENDED)<br/>Deadline Pushed by +Y mins"]
    
    EXT -->|Further Trigger Met inside Window| EXT
    
    ACTIVE -->|Now >= current_close_at| CLOSED["CLOSED<br/>Scheduled Time Elapsed"]
    EXT -->|Now >= current_close_at| CLOSED
    
    ACTIVE -->|Now >= forced_close_at| F_CLOSED["FORCE_CLOSED<br/>Hard Ceiling Elapsed"]
    EXT -->|Now >= forced_close_at| F_CLOSED
    
    SCHED -->|Buyer Action| CANCELLED["CANCELLED<br/>Immediate Freeze"]
    ACTIVE -->|Buyer Action| CANCELLED
    EXT -->|Buyer Action| CANCELLED

    %% State Node Styles
    style DRAFT fill:#f3f4f6,stroke:#6b7280,stroke-width:2px
    style SCHED fill:#dbeafe,stroke:#3b82f6,stroke-width:2px
    style ACTIVE fill:#dcfce7,stroke:#22c55e,stroke-width:2px
    style EXT fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    style CLOSED fill:#e5e7eb,stroke:#374151,stroke-width:2px
    style F_CLOSED fill:#fee2e2,stroke:#ef4444,stroke-width:2px
    style CANCELLED fill:#fecdd3,stroke:#e11d48,stroke-width:2px
```

---

## 5. Real-Time Telemetry & WebSocket Event Distribution

```mermaid
flowchart TD
    subgraph SENDER ["Event Trigger Source"]
        B1["Supplier Bid Submitted"]
        E1["Extension Evaluated & Clamped"]
        C1["Auction Cancelled by Buyer"]
    end

    subgraph ENGINE ["Central Dispatcher"]
        HUB["WebSocket Connection Manager<br/>(Room: rfq_id)"]
    end

    subgraph RECEIVERS ["Connected Browser Clients"]
        direction LR
        BUYER["Buyer Dashboard<br/>• Live Leaderboard Flash<br/>• Countdown Timer Sync<br/>• Animated Extension Banner"]
        L1_SUP["Leading Carrier (L1)<br/>• Trophy Badge Confirmed<br/>• Rate Locked"]
        L2_SUP["Challenger Carriers (L2/L3)<br/>• Outbid Notice<br/>• Win Guidance Banner<br/>• Clock Extended Notice"]
    end

    B1 --> HUB
    E1 --> HUB
    C1 --> HUB

    HUB -->|Push JSON Payload| BUYER
    HUB -->|Push JSON Payload| L1_SUP
    HUB -->|Push JSON Payload| L2_SUP

    style HUB fill:#000000,color:#fff,stroke:#333,stroke-width:2px
    style BUYER fill:#ffffff,stroke:#000,stroke-width:2px
    style L1_SUP fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    style L2_SUP fill:#fef3c7,stroke:#d97706,stroke-width:2px
```

---

## 6. Mathematical Formulas & Invariants

```text
+---------------------------------------------------------------------------------------------------+
| 1. QUOTATION TOTAL CALCULATION                                                                    |
|    Total = Freight_Charges + Origin_Charges + Destination_Charges                                 |
+---------------------------------------------------------------------------------------------------+
| 2. TARGET BUDGET CEILING INVARIANT                                                                |
|    Total <= Target_Budget  (Bids > Target_Budget are rejected with HTTP 400)                      |
+---------------------------------------------------------------------------------------------------+
| 3. TRIGGER WINDOW INCLUSION FORMULA                                                               |
|    Inside_Window = (Current_Time >= Current_Close_Time - X minutes) AND (Current_Time < Close)    |
+---------------------------------------------------------------------------------------------------+
| 4. EXTENSION ADDITION & HARD CEILING CLAMPING FORMULA                                             |
|    T_proposed = Current_Close_Time + Y minutes                                                    |
|    New_Close_Time = min(T_proposed, Forced_Close_Time)                                            |
+---------------------------------------------------------------------------------------------------+
| 5. REVERSE LEADERBOARD RANKING DETERMINATION                                                      |
|    Rank = Order_By(Total_Amount ASC, Submitted_At ASC)                                            |
|    (Lowest price captures L1; ties broken by earliest submission timestamp)                       |
+---------------------------------------------------------------------------------------------------+
```
