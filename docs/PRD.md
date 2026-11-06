# Product Requirements Document (PRD)
## British Auction Engine in RFQ Procurement Platform

---

### 1. Document Control & Metadata
- **Project Name:** British Auction RFQ System
- **Product Domain:** Logistics & Freight Procurement (B2B SaaS)
- **Version:** 1.0.0
- **Status:** Approved / Ready for Implementation
- **Target Audience:** Procurement Managers (Buyers), Freight Carriers/Logistics Service Providers (Suppliers), Engineering & QA Teams

---

### 2. Executive Summary
In global freight and logistics procurement, buyers issue **Requests for Quotation (RFQs)** to solicit bids from verified carriers. Traditional static sealed-bid or fixed-deadline quotation processes suffer from severe limitations:
1. **Bid Sniping / Last-Second Manipulation:** Suppliers hold back their true competitive prices until the final moments (e.g. 1 minute before closing), leaving competitors zero reaction window and denying the buyer genuine market-rate price discovery.
2. **Sub-optimal Final Pricing:** Without dynamic market pressure and iterative counter-bidding, suppliers bid conservatively with high margins.
3. **Lack of Transparency:** Suppliers have no feedback on whether their quote is competitive, leading to disengagement.

This project introduces a **British Auction Engine** tailored for reverse procurement. Unlike forward auctions (where buyers bid prices up), this reverse auction features:
- **Downside Bidding:** Suppliers actively lower their quotes to capture top rank (`L1`).
- **Dynamic Time Extensions:** If bidding activity occurs within a configurable **Trigger Window ($X$ minutes)** before closing, the auction deadline automatically extends by **$Y$ minutes**.
- **Forced Close Hard Ceiling:** To prevent auctions from running indefinitely and stalling freight operations, an immutable **Forced Bid Close Time** caps all extensions.
- **Configurable Extension Triggers:** Buyers can configure whether extensions trigger on:
  - *Option A:* Any valid bid submitted in the last $X$ minutes.
  - *Option B:* Any change in supplier rank ($L1, L2, L3\dots$) in the last $X$ minutes.
  - *Option C:* A change in the $L1$ (lowest bidder) spot in the last $X$ minutes.

---

### 3. User Personas & User Journeys

#### Persona 1: Enterprise Buyer (Logistics Procurement Manager)
- **Name:** Priya Sharma (Acme Global Supply Chain)
- **Goals:** Secure reliable freight transportation between origin and destination at the lowest true market rate; eliminate manual negotiations; ensure fairness among preferred carrier partners.
- **Pain Points:** Carriers claim they "could have beaten the winning quote if they had 5 more minutes"; rush bids in the final 60 seconds.
- **User Journey:**
  1. Logs into Buyer Dashboard.
  2. Clicks **"Create RFQ"**, fills shipment route (e.g., Delhi to Mumbai, 15 Nov Pickup).
  3. Configures British Auction: Enables toggle, specifies $X=10$ min (Trigger Window), $Y=5$ min (Extension Duration), selects Trigger condition (e.g. *L1 Rank Change*), and defines Initial Close Time and Forced Close Time.
  4. Selects and invites pre-approved carrier partners (DHL, Blue Dart, FedEx, Delhivery).
  5. Publishes RFQ; monitors live bids, countdowns, extension audit log, and leaderboard in real-time.
  6. Evaluates final quotations (charges breakdown, transit days, validity) upon auction closure to award the contract.

#### Persona 2: Freight Carrier / Supplier
- **Name:** Rajesh Patel (Fleet Operations Lead, Blue Dart)
- **Goals:** Win freight volume by bidding aggressively while maintaining healthy margins; gain clear visibility on whether the company is currently $L1$ or being undercut.
- **Pain Points:** Getting sniped at 5:59:59 PM with no chance to counter; lack of clarity on how much time remains.
- **User Journey:**
  1. Receives notification / sees newly invited RFQ on Supplier Dashboard.
  2. Reviews shipment criteria, terms, and auction rules ($X, Y$, Forced Close Time).
  3. Submits Initial Quotation: Freight charges, Origin charges, Destination charges, Transit Time, Quote Validity.
  4. Sees real-time status: Rank badge (e.g. $L2$), current lowest price ($L1$), and countdown timer.
  5. Decides to lower quote before close time to become $L1$; submits a revised bid.
  6. If submitted during the trigger window, observes the auction close time dynamically extend by $Y$ minutes (capped by Forced Close).
  7. Receives real-time feedback until final closure.

---

### 4. Product Goals & Business Objectives
| Goal | Description | Target Impact |
|---|---|---|
| **Eliminate Bid Sniping** | Automatic extensions give all participants adequate time to react to last-minute price cuts. | 100% elimination of un-countered last-minute snipes |
| **Maximize Price Discovery** | Progressive competitive bidding drives prices toward the true carrier marginal cost. | 8% - 15% reduction in freight procurement cost |
| **Predictable Operational Windows** | Forced Close Time guarantees the procurement cycle completes within logistics planning SLAs. | Zero auction overruns beyond operational deadlines |
| **Auditability & Fair Competition** | Transparent real-time event logs detailing timestamp, bid values, rank shifts, and extension justifications. | Full compliance with corporate procurement audit standards |

---

### 5. Detailed Functional Specifications

#### 5.1 RFQ Creation & Configuration
- **Fields:**
  - `Reference ID`: Auto-generated unique format (`RFQ-YYYYMMDD-XXXX`).
  - `RFQ Name`: Human-readable title (e.g., "Full Truckload Freight: Delhi to Mumbai").
  - `Pickup / Service Date`: Scheduled carrier pickup datetime.
  - `Pickup Location` & `Destination`: Geographic route details.
  - `Bid Start Date & Time`: Timestamp when suppliers can begin bidding.
  - `Bid Close Date & Time` (`initial_close_at`): Scheduled end time.
  - `Forced Bid Close Date & Time` (`forced_close_at`): Hard deadline.
  - `British Auction Toggle`: Enabled / Disabled.
  - `Trigger Window (X minutes)`: Duration before close time monitored for trigger conditions ($X \in [1, 60]$).
  - `Extension Duration (Y minutes)`: Added time when trigger activates ($Y \in [1, 60]$).
  - `Extension Trigger Type`: Single-choice enum:
    1. `bid_received`: Any qualifying bid in last $X$ minutes.
    2. `any_rank_change`: Any supplier rank shift ($L_i \leftrightarrow L_j$) in last $X$ minutes.
    3. `l1_change`: Change in $L1$ leader in last $X$ minutes.

#### 5.2 Supplier Quote & Bid Submission
- **Initial Quote Submission:**
  - `Carrier Name`: Text string / profile lookup.
  - `Freight Charges`: Numeric $\ge 0$.
  - `Origin Handling Charges`: Numeric $\ge 0$.
  - `Destination Handling Charges`: Numeric $\ge 0$.
  - `Total Amount`: Server-calculated ($Freight + Origin + Destination$). Frontend submission of total is strictly rejected if mismatched.
  - `Transit Time (Days)`: Integer $> 0$.
  - `Quote Validity (Days)`: Integer $> 0$.
- **Re-bidding Rules:**
  - A supplier can submit subsequent bids as long as the auction is in `ACTIVE` state.
  - **Downside Rule:** A supplier's new total bid must be strictly lower than their own previous lowest valid total bid ($Bid_{new} < Bid_{prev}$).
  - Suppliers provide an updated breakdown matching their new total.

#### 5.3 Extension Engine Business Logic
Let $T_{close}$ be the current closing timestamp, $T_{forced}$ be the forced close timestamp, $X$ be the trigger window in minutes, and $Y$ be the extension duration in minutes.
When a bid is submitted at timestamp $T_{event}$:
1. **Window Check:** Is $T_{close} - X \text{ min} \le T_{event} < T_{close}$?
   - If `NO`, no extension occurs.
2. **Trigger Condition Check:**
   - Case `bid_received`: Condition is met unconditionally.
   - Case `any_rank_change`: Compute new ranking from latest bids across all suppliers. If the sorted order of suppliers differs from the pre-bid order, condition is met.
   - Case `l1_change`: If the previous $L1$ supplier $\neq$ new $L1$ supplier, condition is met.
3. **Extension Computation:**
   $$\text{Tentative Close} = T_{close} + Y \text{ minutes}$$
   $$T_{close}^{new} = \min(\text{Tentative Close}, T_{forced})$$
4. If $T_{close}^{new} > T_{close}$:
   - Update $T_{close}$ to $T_{close}^{new}$.
   - Create an `activity_log` record with event `AUCTION_EXTENDED`, recording old close time, new close time, trigger type, and qualifying supplier.
   - Emit WebSocket message `auction_extended` to all room subscribers.

#### 5.4 Auction States & Transitions
- `DRAFT`: Saved by buyer, not yet published.
- `SCHEDULED`: Published; current time $< T_{start}$.
- `ACTIVE`: Current time $\ge T_{start}$ and $< T_{close}$. Bids accepted.
- `CLOSED`: Auction reached $T_{close}$ without exceeding $T_{forced}$.
- `FORCE_CLOSED`: Auction terminated at $T_{forced}$.

---

### 6. Non-Functional & Technical Requirements
- **Server Authority:** The server clock (UTC) is the single source of truth for all deadlines and timestamps. Client countdowns are presentation-only.
- **Concurrency & Atomicity:** Database transactions serialize bid evaluations (`SELECT ... FOR UPDATE` on the RFQ record) to prevent race conditions during simultaneous bids.
- **Sub-Second Real-Time Updates:** WebSockets push leaderboard changes, extension notices, and countdown synchronizations with $< 200\text{ ms}$ latency.
- **Audit Trails:** Immutable activity logs store every bid, ranking transition, and time extension with detailed contextual metadata.

