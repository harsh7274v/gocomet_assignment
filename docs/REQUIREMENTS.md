# System Requirements & Business Rules Document

---

## 1. System Overview
The **British Auction in RFQ System** governs reverse auction procurement for logistics and freight services. This document outlines the functional requirements, strict validation rules, business logic formulas, and edge-case behaviors required for full compliance with procurement standards.

---

## 2. Functional Requirements Breakdown

### FR-01: User Management & Authentication
- **FR-01.1:** System shall support two explicit roles: `BUYER` and `SUPPLIER`.
- **FR-01.2:** Authentication must utilize industry-standard JWT (JSON Web Tokens) with encrypted password hashing (bcrypt / argon2).
- **FR-01.3:** Role-based access control (RBAC) must restrict RFQ creation and supplier invitations exclusively to `BUYER` accounts.
- **FR-01.4:** Supplier quote submission and re-bidding endpoints must be restricted strictly to invited `SUPPLIER` accounts.

### FR-02: RFQ Lifecycle & Scheduling
- **FR-02.1:** A buyer can create an RFQ with:
  - Reference ID (Unique string)
  - Title, Service Description, Route (Origin, Destination)
  - Scheduled Pickup Date/Time
  - Bidding Start Date/Time ($T_{start}$)
  - Bid Close Date/Time ($T_{close}$)
  - Forced Bid Close Date/Time ($T_{forced}$)
- **FR-02.2:** An RFQ can have British Auction mode toggled ON or OFF.
- **FR-02.3:** A buyer can invite one or more registered suppliers to an RFQ.
- **FR-02.4:** State transitions must adhere strictly to:
  $$\text{DRAFT} \longrightarrow \text{SCHEDULED} \longrightarrow \text{ACTIVE} \longrightarrow (\text{CLOSED} \lor \text{FORCE\_CLOSED})$$

### FR-03: British Auction Configuration
When British Auction is enabled:
- **FR-03.1: Trigger Window ($X$):** Buyer specifies $X$ in minutes ($1 \le X \le 60$). System monitors bidding during $[T_{close} - X, T_{close})$.
- **FR-03.2: Extension Duration ($Y$):** Buyer specifies $Y$ in minutes ($1 \le Y \le 60$). Extra time added on trigger.
- **FR-03.3: Extension Trigger Modes:**
  - `bid_received`: Any valid bid placed within $X$ minutes of $T_{close}$ extends the auction.
  - `any_rank_change`: A bid placed within $X$ minutes of $T_{close}$ that shifts *any* supplier's rank extends the auction.
  - `l1_change`: A bid placed within $X$ minutes of $T_{close}$ that replaces the prevailing $L1$ supplier extends the auction.
- **FR-03.4: Forced Close Ceiling:**
  The new closing time $T_{close}'$ is computed as:
  $$T_{close}' = \min(T_{close} + Y \text{ minutes}, T_{forced})$$
  Under no circumstance shall $T_{close}' > T_{forced}$.

### FR-04: Bidding & Quotation Engine
- **FR-04.1:** Initial quotes require:
  - Freight Charges ($\ge 0$)
  - Origin Handling Charges ($\ge 0$)
  - Destination Handling Charges ($\ge 0$)
  - Transit Time in Days ($> 0$)
  - Quote Validity in Days ($> 0$)
- **FR-04.2:** Total quote amount must be computed server-side:
  $$\text{Total} = \text{Freight} + \text{Origin} + \text{Destination}$$
- **FR-04.3:** Re-bidding: A supplier may submit a revised bid only if:
  - The auction is `ACTIVE`.
  - The supplier is an invited participant.
  - $\text{Total}_{new} < \text{Total}_{prev}$ (Downside bidding rule).
- **FR-04.4:** Immutability: Every submitted quote/bid is stored as a distinct row in `bids`. Existing bid rows are never overwritten or deleted.

### FR-05: Real-Time Synchronization & WebSockets
- **FR-05.1:** WebSocket connection `/ws/auctions/{rfq_id}` broadcasts:
  - `bid_placed`: New bid recorded with masked/anonymized details as appropriate.
  - `leaderboard_updated`: New ranking table ($L1, L2, L3\dots$).
  - `auction_extended`: Details of new closing time, minutes extended, and triggering reason.
  - `auction_closed`: Final closure announcement.
- **FR-05.2:** Clients reconnect automatically with exponential backoff on network interruption.

---

## 3. Strict Validation Rules

| Rule ID | Parameter | Constraint Rule | Error Response / System Behavior |
|---|---|---|---|
| **VR-01** | Timings | $T_{start} < T_{close}$ | `422 Bad Request`: Bid close time must be after start time. |
| **VR-02** | Timings | $T_{close} < T_{forced}$ | `422 Bad Request`: Forced close time must be strictly greater than bid close time. |
| **VR-03** | Config | $X > 0 \land Y > 0$ | `422 Bad Request`: Trigger window and extension duration must be positive integers. |
| **VR-04** | Quote Pricing | All charge items $\ge 0$ | `422 Bad Request`: Charges cannot be negative. |
| **VR-05** | Downside Bid | $\text{Total}_{new} < \text{Total}_{own\_previous}$ | `400 Bad Request`: Bid amount must be lower than your previous bid. |
| **VR-06** | Auction Window | $T_{event} < T_{close} \land T_{event} < T_{forced}$ | `400 Bad Request`: Auction is closed. No further bids accepted. |
| **VR-07** | Invitation | `supplier_id` in invited list | `403 Forbidden`: Supplier is not invited to participate in this RFQ. |
| **VR-08** | Capped Extension | $T_{close} + Y > T_{forced}$ | Clamp to $T_{forced}$. Log `AUCTION_EXTENDED_CAPPED`. |

---

## 4. Leaderboard Ranking Algorithm

For an active RFQ:
1. Fetch the **latest valid bid** for each unique supplier who has submitted at least one quote.
2. Sort the latest bids by:
   - Primary: `total_amount` ascending (lowest price gets top rank).
   - Secondary (Tie-breaker 1): `submitted_at` ascending (earlier bid takes precedence).
   - Tertiary (Tie-breaker 2): `id` ascending (deterministic fallback).
3. Assign ranks:
   - Rank 1 $\rightarrow L1$
   - Rank 2 $\rightarrow L2$
   - Rank 3 $\rightarrow L3$
   - Rank $N \rightarrow LN$

---

## 5. Activity Log & Audit Requirements
Every material state change in an RFQ must be recorded in the `activity_logs` table:
- `BID_SUBMITTED`: Supplier ID, Amount, Timestamp.
- `RANKING_CHANGED`: Affected suppliers, previous ranks, new ranks.
- `AUCTION_EXTENDED`: Trigger type, Triggering bid ID, Previous Close Time, New Close Time, Extended Minutes, Forced Close Time.
- `AUCTION_CLOSED`: Timestamp, winning $L1$ supplier, final closing price.
- `AUCTION_FORCE_CLOSED`: Timestamp of hard ceiling breach.
