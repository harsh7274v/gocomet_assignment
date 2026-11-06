# System Memory & Domain Invariant Register

---

## 1. Domain Glossary
- **RFQ (Request for Quotation):** A formal invitation sent by a buyer to multiple pre-qualified logistics suppliers to submit binding price quotes for specified shipment requirements.
- **British Auction (Reverse Procurement context):** A dynamic downward auction format where suppliers submit successively lower bids to improve their rank. If a qualifying bid occurs near the closing time, the closing time is extended, subject to an immutable forced close deadline.
- **Trigger Window ($X$ minutes):** The time threshold before the auction's current closing time during which eligible supplier activity triggers an automatic extension.
- **Extension Duration ($Y$ minutes):** The incremental time added to the auction's scheduled close time when a trigger condition is met.
- **$L1, L2, L3\dots$ Ranking:**
  - $L1$: Lowest-priced supplier quote (leader).
  - $L2$: Second-lowest-priced quote.
  - $L3$: Third-lowest-priced quote.
  - In case of identical quote amounts, the supplier who submitted earlier is granted the higher rank.
- **Forced Bid Close Time ($T_{forced}$):** The non-negotiable operational deadline beyond which no auction can be extended, ensuring freight operations proceed on schedule.

---

## 2. Critical Invariant Rules (Must NEVER Be Violated)

1. **Ceiling Invariant:**
   $$\forall t, \quad T_{close}(t) \le T_{forced}$$
   No calculation, trigger, or extension may set $T_{close} > T_{forced}$. If $T_{close} + Y > T_{forced}$, $T_{close}$ is clamped exactly to $T_{forced}$.

2. **Server Clock Sovereignty:**
   The client's local system time is never trusted. All timestamp validations, window checks, and state transitions are evaluated using the server's UTC clock.

3. **Downside Bidding Invariant:**
   For any supplier $S_k$, if $S_k$ has already placed a valid bid with total $A_{prev}$, any subsequent bid $A_{new}$ from $S_k$ must satisfy:
   $$A_{new} < A_{prev}$$
   A supplier cannot increase their price or submit an identical price to their own prior bid.

4. **Charge Component Sum Consistency:**
   $$\text{total\_amount} = \text{freight\_charges} + \text{origin\_charges} + \text{destination\_charges}$$
   The server always computes `total_amount` directly from the charge line items.

5. **Bid Immutability:**
   Historical bids are never updated or deleted. Every bid submission generates a new row in the `bids` table with its own submission timestamp. Leaderboards are dynamically derived from each supplier's latest valid bid.

6. **Trigger Window Definition:**
   A bid submitted at timestamp $T_{event}$ falls within the Trigger Window if and only if:
   $$T_{close} - X \text{ minutes} \le T_{event} < T_{close}$$

---

## 3. Extension Trigger Decision Matrix

| Configured Trigger Type | Condition Evaluated at $T_{event} \in [T_{close} - X, T_{close})$ | Extension Action Taken | Reason Logged |
|---|---|---|---|
| `bid_received` | Any invited supplier submits a valid down-bid. | Extend by $\min(Y, T_{forced} - T_{close})$ | `"New bid received in last X minutes"` |
| `any_rank_change` | The newly submitted bid alters the relative order of any two suppliers in the leaderboard. | Extend by $\min(Y, T_{forced} - T_{close})$ | `"Supplier rank shift detected in last X minutes"` |
| `any_rank_change` | Supplier places a down-bid, but their rank remains unchanged (e.g., remains $L3$). | **No extension** | None |
| `l1_change` | Supplier places a down-bid that overtakes the existing $L1$ supplier. | Extend by $\min(Y, T_{forced} - T_{close})$ | `"Lowest bidder (L1) replaced in last X minutes"` |
| `l1_change` | Supplier places a down-bid and moves from $L3$ to $L2$ (prevailing $L1$ unchanged). | **No extension** | None |

---

## 4. Key Architectural Decisions Log (ADRs)

- **ADR-01: Dual Storage Support (SQLite Dev / PostgreSQL Prod)**
  - *Context:* The application requires seamless local evaluation and zero-dependency testing without requiring a running PostgreSQL server, while maintaining full production compatibility with PostgreSQL.
  - *Decision:* Use SQLAlchemy 2.0 with portable data types (`DateTime(timezone=True)`, `Float` / `Numeric`, `String`, `JSON`). Default to local SQLite (`sqlite:///./rfq_auction.db`) if PostgreSQL `DATABASE_URL` is not provided.
- **ADR-02: Native WebSockets over External Message Brokers**
  - *Context:* Need fast real-time push to React clients for live countdown and leaderboard shifts without heavy infrastructure overhead (Kafka/Redis).
  - *Decision:* Implement an in-memory `ConnectionManager` inside FastAPI that handles connection lifecycle, room subscriptions per `rfq_id`, and async broadcasts.
- **ADR-03: Dynamic Leaderboard Computation vs Cached Materialized Views**
  - *Context:* Auctions typically have 3–20 participating carriers with 10–100 bids per RFQ.
  - *Decision:* Querying the latest bid per supplier via SQL window functions (`ROW_NUMBER() OVER (PARTITION BY supplier_id ORDER BY submitted_at DESC)`) is sub-millisecond fast, perfectly consistent, and eliminates cache-invalidation bugs.
