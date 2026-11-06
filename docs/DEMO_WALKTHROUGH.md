# Step-by-Step Demo & Evaluation Walkthrough Guide
## British Auction in RFQ System

This walkthrough provides a script for testing or presenting all features of the **British Auction in RFQ System**, including all three extension trigger conditions, the forced close hard ceiling, downside bidding validations, real-time WebSockets, and contract awarding.

---

### 🚀 Setup & Verification
Ensure both servers are running:
- **Frontend:** [http://localhost:5174/](http://localhost:5174/)
- **Backend API & Swagger Docs:** [http://localhost:8001/docs](http://localhost:8001/docs)

---

### 📋 Walkthrough Scenarios

#### Scenario 1: Overview of the Buyer Dashboard & Active Auction
1. Open [http://localhost:5174/](http://localhost:5174/) in your browser.
2. In the top navigation bar, ensure you are on **Buyer (Acme)** (or click `Buyer (Acme)` in the 1-click Demo Switcher).
3. Observe the summary KPI cards:
   - **Total RFQs:** Displays count of seeded auctions.
   - **Active Auctions:** Live auctions open for bidding.
4. In the RFQ table, click **"Monitor Live"** next to **Delhi to Mumbai FTL Freight (Active Auction)**.
5. On the Auction Details page, observe:
   - **Green Badge:** Live WebSocket synchronization active.
   - **Live Auction Countdown:** Dual timers displaying the Scheduled Bid Close Deadline and Forced Close Hard Ceiling.
   - **Leaderboard Table:** Current leader is **Blue Dart Express ($L1$ at ₹48,000)**, followed by **DHL Express ($L2$ at ₹50,000)** and **FedEx ($L3$ at ₹52,000)**.
   - **Audit Log:** Chronological record of auction activation and prior quotes.

---

#### Scenario 2: Test Trigger C (L1 Rank Change in Last X Minutes)
1. On the Auction Details page, locate the **"Evaluator Live Simulation Cockpit"** at the top.
2. Click **"1. Enter Trigger Window"**:
   - The close time dynamically shifts to **3 minutes from now**, entering the 10-minute trigger window.
   - Notice the countdown badge lights up: `TRIGGER WINDOW ACTIVE (10m)`.
3. Click **"2. DHL Underbids (₹46k)"**:
   - DHL submits a counter-bid of ₹46,000, undercutting Blue Dart's ₹48,000.
   - **Result:**
     - DHL instantly moves to **$L1$**.
     - An animated gold banner slides in: **`AUCTION AUTOMATICALLY EXTENDED: +5 Minutes Added!`**.
     - Trigger explanation: *"New L1 lowest bidder (DHL Express India) emerged in the last 10 minutes"*.
     - The scheduled closing countdown automatically increases by 5 minutes across all connected screens via WebSockets.

---

#### Scenario 3: Test Multi-Tab Concurrent Bidding (Carrier View)
1. Open a new browser window or Incognito tab to [http://localhost:5174/](http://localhost:5174/).
2. In the top demo switcher, click **"FedEx (L3)"**.
3. Notice the interface switches to the **Carrier Bidding Terminal**:
   - Header shows: *"Welcome, FedEx Supply Chain"*.
   - Click on the active Delhi to Mumbai auction.
4. Review the Bidding Cockpit:
   - Big Rank Badge shows **$L3$** (Challenger).
   - Enter a counter-bid:
     - Freight Charges: `₹40,000`
     - Origin Charges: `₹2,000`
     - Destination Charges: `₹3,000`
     - Total: `₹45,000` (undercuts DHL's ₹46,000).
5. Click **"Transmit Lower Counter-Bid"**.
6. Switch back to your Buyer tab:
   - FedEx is instantly **$L1$** on the leaderboard.
   - Another **+5 minute extension** is logged and broadcast over WebSockets.

---

#### Scenario 4: Test Downside Bidding Validation (Rejection)
1. While logged in as **FedEx** (current best bid is ₹45,000):
2. In the counter-bid form, try entering a higher freight amount:
   - Freight Charges: `₹45,000` (bringing total to `₹50,000`).
3. Notice:
   - The total text turns **Red**.
   - A real-time validation warning displays: `⚠️ Must be lower than previous bid (₹45,000)`.
   - If the carrier attempts to submit, the backend returns **HTTP 400 Bad Request**:
     `"Downside bidding rule violation: Your new bid must be strictly lower than your previous bid."`

---

#### Scenario 5: Test Forced Close Hard Ceiling Clamping
1. In the Evaluator Cockpit or by submitting consecutive counter-bids near the deadline:
2. When the calculated extension ($T_{close} + Y$) exceeds the Forced Close Time ($T_{forced}$):
3. The engine automatically clamps the extension:
   $$T_{close}^{new} = T_{forced}$$
4. The activity log records:
   `"Extended to Forced Close ceiling of HH:MM:SS UTC. No further extensions permitted beyond hard deadline."`

---

#### Scenario 6: Exporting the Complete Bids Audit Report (CSV)
1. In the Buyer view on the Auction Details page, scroll to the Leaderboard.
2. Click **"Export Audit CSV"** (or visit `/api/rfqs/{id}/export-csv`).
3. Open the downloaded CSV file:
   - Contains RFQ Reference ID, Carrier Name, Total Amount, Freight, Origin, Destination, Transit Days, Validity Days, and UTC Timestamps for all bids submitted during the auction.

---

#### Scenario 7: Officially Awarding the Contract
1. On the Buyer Leaderboard table, review all competing carriers ($L1$, $L2$, $L3$).
2. Locate the winning carrier and click **"Award Contract"**.
3. The auction officially closes:
   - Status updates to **CONTRACT AWARDED**.
   - A green `AWARDED` badge is pinned to the carrier.
   - An activity log is committed: *"CONTRACT OFFICIALLY AWARDED to [Carrier] at final price of ₹X by Buyer"*.
   - A real-time notification is broadcast over WebSockets to all participating carriers.
