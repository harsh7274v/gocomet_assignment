# British Auction in RFQ System
### Dynamic Reverse Procurement Platform with Automatic Extensions & Forced Close Rules

Built with **FastAPI (Python)**, **React (TypeScript + Vite)**, **Tailwind CSS**, **SQLAlchemy**, and **Native WebSockets**.

---

## 📚 Complete Project Documentation

All formal technical and product specifications are located in the [`docs/`](./docs) directory:

1. 🏛️ **[SIMPLE_HLD.md](./docs/SIMPLE_HLD.md):** Simple High-Level Design with system flowchart and sequence diagrams.
2. 🗄️ **[SCHEMA_DESIGN.md](./docs/SCHEMA_DESIGN.md):** Complete database schema design, Mermaid ERD, table specs, and indexing strategy.
3. 📄 **[PRD (Product Requirements Document)](./docs/PRD.md):** User personas, market problem, user journeys, functional specs, business goals, and acceptance criteria.
4. 📋 **[REQUIREMENTS.md](./docs/REQUIREMENTS.md):** Functional & non-functional requirements, strict validation rules, and leaderboard ranking algorithm.
5. 🏗️ **[ARCHITECTURE.md](./docs/ARCHITECTURE.md):** System architecture diagram, sequence diagram for concurrent extension locking, complete ERD (7 tables), and API/WebSocket specifications.
6. 🧠 **[MEMORY.md](./docs/MEMORY.md):** Domain invariants, trigger decision matrices, and architectural decision records (ADRs).
7. 🚀 **[PHASES_AND_ROADMAP.md](./docs/PHASES_AND_ROADMAP.md):** 9-stage engineering roadmap, end-to-end flow diagrams, and verification checklist.
8. 🖼️ **[Diagram Atlas](./docs/diagrams/index.html):** Static, offline gallery of every HLD and schema diagram, with zoom, SVG, and PNG downloads. Open the file in a browser.

---

## ⚡ Key Highlights of the Implementation

- **Strict Server-Side Bidding Engine:** All deadlines, trigger windows, and extensions are evaluated against the server's UTC clock. Client countdowns are presentation-only.
- **Three Configurable British Auction Triggers:**
  - **Option A (`bid_received`):** Any qualifying bid received in the last $X$ minutes extends the auction by $Y$ minutes.
  - **Option B (`any_rank_change`):** Any supplier rank shift ($L_i \leftrightarrow L_j$) in the last $X$ minutes extends the auction.
  - **Option C (`l1_change`):** Only an overtake of the prevailing lowest bidder ($L1$) in the last $X$ minutes extends the auction.
- **Target Budget Dragging Bar & Ceiling Enforcement:** Buyers can set a maximum budget with an interactive dragging range slider. Any supplier bid exceeding this budget ceiling is rejected immediately on both the client (Zod) and server (FastAPI).
- **Zod Schema & Authentication Validation:** Full client-side runtime validation using Zod for credentials, RFQ timings cross-refinements (`forced_close_at > initial_close_at > bid_start_at`), and multi-component bid inputs.
- **Dynamic Win-Probability & Bidding Guidance:** Suppliers can bid flexibly (lower, equal, or higher than the current market leader) with dynamic win-chance indicators and guidance banners.
- **Forced Close Hard Ceiling:**
  $$T_{close}' = \min(T_{close} + Y \text{ minutes}, T_{forced})$$
  Under no circumstance can any extension exceed the non-negotiable operational deadline.
- **Real-Time Live Cockpit & WebSockets:** Live bids, leaderboard rank changes, and animated extension alerts stream via native WebSockets.
- **Auction Lifecycle Control:** Active auctions can be cancelled with immediate supplier notification and instant timer freezing.
- **1-Click Multi-Account Demo Switcher:** Seamlessly switch between Enterprise Buyer and 4 competing carriers (Blue Dart, DHL, FedEx, Delhivery) across tabs.

---

## 👥 Pre-Configured Demo Accounts

All demo accounts use the standard password: `password123`

| Role | Entity / Carrier | Email | Initial Status |
|---|---|---|---|
| **Buyer** | Acme Corp Logistics | `buyer@acme.com` | Creates RFQs, configures auction rules, reviews bids |
| **Supplier** | Blue Dart Express | `bluedart@supplier.com` | Prevailing $L1$ leader on active RFQ (₹48,000) |
| **Supplier** | DHL Express India | `dhl@supplier.com` | $L2$ challenger on active RFQ (₹50,000) |
| **Supplier** | FedEx Express India | `fedex@supplier.com` | $L3$ participant on active RFQ (₹52,000) |
| **Supplier** | Delhivery Logistics | `delhivery@supplier.com` | Invited carrier partner |

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Python 3.9+**
- **Node.js 18+ & npm**

### 2. Start the Backend API (FastAPI)
```bash
./start_backend.sh
```
*Backend runs on `http://localhost:8001`. Swagger API docs available at `http://localhost:8001/docs`.*

### 3. Start the Frontend (React + Vite)
```bash
./start_frontend.sh
```
*Frontend runs on `http://localhost:5173`.*

---

## 🧪 Automated Test Suite

Run the full backend test suite covering all 3 triggers, forced close clamping, downside bidding rules, and API endpoints:

```bash
source backend/venv/bin/activate
PYTHONPATH=backend pytest backend/tests/ -v
```

### Verified Test Cases (12/12 Passing):
1. `test_health`: API health check.
2. `test_login_buyer`: Buyer authentication with JWT issuance.
3. `test_login_supplier`: Supplier authentication and carrier profile resolution.
4. `test_list_rfqs_and_bid`: End-to-end API lifecycle test with live bid submission and audit log verification.
5. `test_higher_bid_allowed_with_rank_assignment`: Carrier can place bid higher than current lowest with correct rank assignment.
6. `test_budget_ceiling_rejection`: Rejection of bids exceeding buyer's target budget ceiling with HTTP 400.
7. `test_cancel_rfq`: Immediate RFQ cancellation and status transition.
8. `test_trigger_a_bid_received_inside_window`: Inside window extends by $Y$ minutes.
9. `test_trigger_a_bid_received_outside_window`: Outside window does not extend.
10. `test_trigger_b_any_rank_change`: Extends on rank swap; rejects extension if rank unchanged.
11. `test_trigger_c_l1_rank_change`: Extends when $L1$ changes; does not extend when only $L2/L3$ shift.
12. `test_forced_close_ceiling_clamping`: Enforces $T_{close} = T_{forced}$ when $T_{close} + Y > T_{forced}$.

---

## 📐 Project Directory Structure

```text
gocomet_assignment/
├── docs/
│   ├── PRD.md                     # Product Requirements Document
│   ├── REQUIREMENTS.md            # Detailed Functional & Validation Specs
│   ├── ARCHITECTURE.md            # System Architecture, ERD & Concurrency
│   ├── MEMORY.md                  # Domain Glossary & Critical Invariants
│   ├── PHASES_AND_ROADMAP.md      # 9 Implementation Stages & Flow
│   └── diagrams/                  # SVG/PNG diagram renders + offline atlas
├── backend/
│   ├── app/
│   │   ├── core/                  # Security, DB configuration, JWT
│   │   ├── models/                # 7 SQLAlchemy models (RFQ, Bid, etc.)
│   │   ├── schemas/               # Pydantic v2 schemas
│   │   ├── services/              # AuctionEngine, RankingService, ExtensionService
│   │   ├── websockets/            # Real-time WebSocket connection manager
│   │   ├── routers/               # Auth, RFQs, Bids, Auctions REST APIs
│   │   ├── seed.py                # Demo database seeder
│   │   └── main.py                # FastAPI application entrypoint
│   └── tests/                     # Pytest unit and integration test suite
├── frontend/
│   ├── src/
│   │   ├── components/            # Countdown, Leaderboard, AuditLog, Banner
│   │   ├── context/               # AuthContext with 1-click account switcher
│   │   ├── hooks/                 # useAuctionSocket real-time hook
│   │   ├── pages/                 # BuyerDashboard, SupplierBiddingPage, etc.
│   │   ├── services/              # API client methods
│   │   └── types.ts               # Shared TypeScript interfaces
│   └── package.json
├── start_backend.sh               # One-click backend launcher
├── start_frontend.sh              # One-click frontend launcher
└── README.md
```

