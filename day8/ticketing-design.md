# TicketHub: System Architecture & Scaling Design Document

## 1. Requirements

### 1.1 Functional Requirements
- **Browse & Search Events:** Users can search and filter events by title, artist, venue, city, and date.
- **Interactive Seat Map:** Users can view the seat layout of a venue and inspect real-time seat availability (available, held, or booked).
- **Seat Hold (Temporary Reservation):** Users can select up to 4 available seats and hold them for exactly 10 minutes while entering payment details.
- **Checkout & Payment:** Users can securely submit payment. Once verified, the held seats are permanently transitioned to "booked", and an order is created.
- **View Tickets:** Users can view their purchased tickets, complete with order receipts and unique digital entry barcodes/QR codes.

### 1.2 Non-Functional Requirements
- **Correctness & Zero Double-Booking:** The system must strictly enforce ACID guarantees. Under no circumstances can two concurrent users hold or purchase the same seat.
- **Fairness & Anti-Bot Protection:** High-demand sales must follow a First-In-First-Out (FIFO) queue via a virtual waiting room. Rate limiting and CAPTCHAs prevent automated scalpers from hoarding seats.
- **Low Latency & High Speed:** Event browsing and seat availability rendering must respond in $<200\text{ ms}$ at the 95th percentile ($p95$).
- **High Availability & Fault Tolerance:** The platform must maintain 99.99% availability during traffic surges, failing gracefully under extreme loads rather than crashing.

---

## 2. Traffic & Capacity Estimates

### 2.1 Baseline Facts
- **Registered Users:** 2,000,000 (2 million)
- **Normal Day Traffic:**
  - 50,000 daily visitors
  - 10 page views per visitor = 500,000 page views/day
  - 5,000 tickets sold/day
- **Big Sale Peak Traffic:**
  - 200,000 concurrent users attempt to buy 20,000 available seats within the first 10 minutes (600 seconds) of release.

### 2.2 Normal Day Estimates
- **Page Views per Second:**  
  $$\frac{500,000\text{ views}}{86,400\text{ s}} \approx 5.79\text{ views/sec}$$
- **Ticket Purchases per Second:**  
  $$\frac{5,000\text{ tickets}}{86,400\text{ s}} \approx 0.058\text{ purchases/sec}$$

### 2.3 Big Sale Peak Estimates (10-minute / 600-second window)
- **Concurrent Active Users:** 200,000 users active simultaneously.
- **Seat Map & Queue Polling Requests:**  
  Assuming each user makes an average of 15 requests during the 10-minute rush (queue polling, seat map refreshes, hold attempts, payment):  
  $$200,000\text{ users} \times 15\text{ requests} = 3,000,000\text{ requests over } 600\text{ s}$$  
  $$\text{Peak Request Throughput} = \frac{3,000,000}{600} = \mathbf{5,000\text{ requests/sec (RPS)}}$$
- **Hold / Booking Contention Rate:**  
  With 200,000 users competing for 20,000 seats, assuming 2 to 3 hold attempts per user:  
  $$\frac{500,000\text{ hold attempts}}{600\text{ s}} \approx \mathbf{833.33\text{ hold attempts/sec}}$$
- **Successful Ticket Purchases per Second:**  
  $$\frac{20,000\text{ seats}}{600\text{ s}} \approx \mathbf{33.33\text{ purchases/sec}}$$

### 2.4 Comparison: Normal vs. Big Sale
| Metric | Normal Day | Big Sale Peak | Surge Factor |
| :--- | :--- | :--- | :--- |
| **Active Concurrent Users** | ~500 | 200,000 | **400&times;** |
| **Request Throughput** | ~5.8 RPS | 5,000 RPS | **860&times;** |
| **Purchases / Sec** | 0.058 / sec | 33.33 / sec | **570&times;** |
| **Seat Contention** | Negligible (seats readily available) | Extreme (10 users per single seat) | **Infinite contention** |

---

## 3. API Design

### 1. `GET /api/v1/events`
- **Description:** Browses and searches upcoming events with optional filtering.
- **Query Parameters:** `q` (keyword), `city`, `genre`, `from_date`, `page`, `limit`.
- **Response (200 OK):**
  ```json
  {
    "page": 1,
    "total": 1,
    "events": [
      {
        "id": "evt_101",
        "title": "Coldplay Music of the Spheres",
        "venue": "Wembley Stadium",
        "city": "London",
        "event_date": "2026-11-20T19:30:00Z",
        "starting_price": 75.00
      }
    ]
  }
  ```

### 2. `GET /api/v1/events/:id/seats`
- **Description:** Returns the interactive seating plan and real-time availability.
- **Response (200 OK):**
  ```json
  {
    "event_id": "evt_101",
    "seats": [
      {
        "seat_id": "st_4501",
        "section": "A1",
        "row": "10",
        "number": "14",
        "price": 120.00,
        "status": "available"
      }
    ]
  }
  ```

### 3. `POST /api/v1/events/:id/holds`
- **Description:** Temporarily reserves selected seats for 10 minutes.
- **Request Body:**
  ```json
  {
    "seat_ids": ["st_4501", "st_4502"]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "hold_id": "hld_9882",
    "expires_at": "2026-10-18T19:55:00Z",
    "ttl_seconds": 600,
    "seats": ["st_4501", "st_4502"],
    "total_amount": 240.00
  }
  ```

### 4. `POST /api/v1/orders`
- **Description:** Submits payment token to confirm the held seats and complete the order.
- **Request Body:**
  ```json
  {
    "hold_id": "hld_9882",
    "payment_token": "tok_visa_4242"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "order_id": "ord_5521",
    "status": "confirmed",
    "total_paid": 240.00,
    "ticket_ids": ["tkt_001", "tkt_002"],
    "created_at": "2026-10-18T19:48:12Z"
  }
  ```

### 5. `GET /api/v1/users/me/tickets`
- **Description:** Retrieves all purchased tickets and QR barcodes for the authenticated user.
- **Response (200 OK):**
  ```json
  {
    "tickets": [
      {
        "ticket_id": "tkt_001",
        "event_title": "Coldplay Music of the Spheres",
        "venue": "Wembley Stadium",
        "event_date": "2026-11-20T19:30:00Z",
        "section": "A1",
        "row": "10",
        "number": "14",
        "barcode_url": "https://cdn.tickethub.com/barcodes/tkt_001.png"
      }
    ]
  }
  ```

---

## 4. Data Model

```
+---------------+           +---------------+
|     users     |           |    events     |
+---------------+           +---------------+
| user_id (PK)  |           | event_id (PK) |
| name          |           | title         |
| email (UQ)    |           | venue_name    |
| password_hash |           | event_date    |
| created_at    |           | total_seats   |
+-------+-------+           +-------+-------+
        |                           |
        | 1:N                       | 1:N
        v                           v
+---------------+           +---------------+
|    orders     |           |     seats     |
+---------------+           +---------------+
| order_id (PK) |           | seat_id (PK)  |
| user_id (FK)  |           | event_id (FK) |
| event_id (FK) |           | section       |
| total_amount  |           | row_number    |
| status        |           | seat_number   |
| payment_ref   |           | price         |
| created_at    |           | status        |
+-------+-------+           | held_by (FK)  |
        |                   | expires_at    |
        | 1:N               | version       |
        v                   +-------+-------+
+---------------+                   |
|    tickets    |<------------------+ 1:1
+---------------+
| ticket_id (PK)|
| order_id (FK) |
| seat_id (FK,UQ)|
| barcode_hash  |
+---------------+
```

### 4.1 Schema Definitions

#### Table: `users`
- `user_id`: UUID / BIGINT PRIMARY KEY
- `name`: VARCHAR(100) NOT NULL
- `email`: VARCHAR(255) NOT NULL UNIQUE
- `password_hash`: VARCHAR(255) NOT NULL
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### Table: `events`
- `event_id`: UUID / BIGINT PRIMARY KEY
- `title`: VARCHAR(200) NOT NULL
- `venue_name`: VARCHAR(150) NOT NULL
- `event_date`: TIMESTAMP NOT NULL
- `total_seats`: INT NOT NULL
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### Table: `seats`
- `seat_id`: UUID / BIGINT PRIMARY KEY
- `event_id`: UUID / BIGINT NOT NULL REFERENCES `events(event_id)`
- `section`: VARCHAR(20) NOT NULL
- `row_number`: VARCHAR(10) NOT NULL
- `seat_number`: VARCHAR(10) NOT NULL
- `price`: DECIMAL(10,2) NOT NULL
- `status`: VARCHAR(20) NOT NULL CHECK (`status` IN ('available', 'held', 'booked'))
- `held_by_user_id`: UUID / BIGINT REFERENCES `users(user_id)` NULL
- `hold_expires_at`: TIMESTAMP NULL
- `version`: INT DEFAULT 1 NOT NULL -- used for optimistic locking
- **Constraint:** `UNIQUE (event_id, section, row_number, seat_number)`

#### Table: `orders`
- `order_id`: UUID / BIGINT PRIMARY KEY
- `user_id`: UUID / BIGINT NOT NULL REFERENCES `users(user_id)`
- `event_id`: UUID / BIGINT NOT NULL REFERENCES `events(event_id)`
- `total_amount`: DECIMAL(10,2) NOT NULL
- `status`: VARCHAR(20) NOT NULL CHECK (`status` IN ('pending', 'confirmed', 'failed', 'refunded'))
- `payment_reference`: VARCHAR(100) NOT NULL
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

#### Table: `tickets`
- `ticket_id`: UUID / BIGINT PRIMARY KEY
- `order_id`: UUID / BIGINT NOT NULL REFERENCES `orders(order_id)`
- `seat_id`: UUID / BIGINT NOT NULL UNIQUE REFERENCES `seats(seat_id)` -- enforces 1:1 binding
- `barcode_hash`: VARCHAR(255) NOT NULL UNIQUE
- `created_at`: TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### 4.2 Entity Relationships
- **`events` &rarr; `seats` (1:N):** An event has many physical seats.
- **`users` &rarr; `orders` (1:N):** A user can make multiple orders.
- **`orders` &rarr; `tickets` (1:N):** An order contains one or more issued tickets.
- **`seats` &rarr; `tickets` (1:1):** A specific seat for an event can only ever map to at most one valid ticket, enforced by a `UNIQUE` foreign key constraint.

---

## 5. Preventing Double-Booking

Preventing two users from acquiring the same seat requires a multi-layered locking and transactional strategy.

### 5.1 Step 1: Distributed In-Memory Lock (Fast First Defense)
When a user clicks "Hold Seat", the application attempts to set an atomic key in Redis using `SET key value NX EX 600`:
```redis
SET lock:event:evt_101:seat:st_4501 user_123 NX EX 600
```
- The `NX` flag ensures the key is written **only if it does not already exist**.
- If two users click simultaneously, exactly one Redis command succeeds in $<1\text{ ms}$; the second user instantly receives an HTTP 409 Conflict ("Seat is currently held by another user"), entirely sparing the database from lock contention.

### 5.2 Step 2: Atomic Database Conditional Update (ACID Source of Truth)
To guard against cache crashes, the database transaction executes an atomic conditional update:
```sql
BEGIN TRANSACTION;

UPDATE seats
SET 
    status = 'held',
    held_by_user_id = :user_id,
    hold_expires_at = NOW() + INTERVAL '10 minutes',
    version = version + 1
WHERE seat_id = :seat_id 
  AND (status = 'available' OR (status = 'held' AND hold_expires_at < NOW()));

-- Check affected rows:
-- If affected_rows == 1: Hold secured!
-- If affected_rows == 0: Seat was already taken; ROLLBACK and abort.

COMMIT;
```
Because the `UPDATE` query evaluates the condition `status = 'available'` within the database's row-level lock, race conditions are mathematically impossible. Even if two queries execute at the exact same millisecond, the database engine processes them sequentially: the first updates the row, and the second finds 0 matching rows and fails safely.

### 5.3 Step 3: Atomic Purchase Finalization
When the payment gateway approves the charge, the hold is converted to a final booking inside an isolated transaction:
```sql
BEGIN TRANSACTION;

UPDATE seats
SET status = 'booked', hold_expires_at = NULL
WHERE seat_id = :seat_id
  AND status = 'held'
  AND held_by_user_id = :user_id
  AND hold_expires_at >= NOW();

INSERT INTO orders (order_id, user_id, event_id, total_amount, status, payment_reference)
VALUES (:order_id, :user_id, :event_id, :total, 'confirmed', :pay_ref);

INSERT INTO tickets (ticket_id, order_id, seat_id, barcode_hash)
VALUES (:ticket_id, :order_id, :seat_id, :barcode);

COMMIT;
```
If the 10-minute timer expired prior to payment confirmation, `affected_rows` will be 0, triggering an automatic refund and rolling back the transaction.

### 5.4 Step 4: Automatic Hold Expiration (Background Sweeper)
A lightweight background worker runs every 10 seconds:
```sql
UPDATE seats
SET status = 'available', held_by_user_id = NULL, hold_expires_at = NULL
WHERE status = 'held' AND hold_expires_at < NOW();
```
Any seats whose hold timer expired without payment are seamlessly returned to the available inventory.

---

## 6. Architecture & Surviving the Big Sale

### 6.1 Architecture Diagram

```
                                  +-------------------+
                                  |    User Client    |
                                  +---------+---------+
                                            |
                                            v
                                    +---------------+
                                    |      CDN      | (Static assets & cached event metadata)
                                    +-------+-------+
                                            |
                                            v
                            +-------------------------------+
                            | Virtual Waiting Room (Queue)  | (Throttles incoming traffic: FIFO)
                            +---------------+---------------+
                                            |
                                            v
                                    +---------------+
                                    | Load Balancer | (SSL termination, round-robin)
                                    +-------+-------+
                                            |
                                            v
                                    +---------------+
                                    |  App Servers  | (Stateless auto-scaling API cluster)
                                    +--+----+----+--+
                                       |    |    |
                +----------------------+    |    +--------------------+
                | (Atomic holds &          |                         | (Payment processing)
                |  seat status cache)       |                         v
                v                           |                 +---------------+
         +-------------+                    |                 |    Payment    |
         | Redis Cache |                    |                 |    Gateway    |
         |  & Lock     |                    |                 |   (Stripe)    |
         +-------------+                    |                 +---------------+
                                            |
                           +----------------+----------------+
                           | (Writes: Holds, Orders)         | (Reads: Available seats)
                           v                                 v
                    +-------------+                   +-------------+
                    |   Primary   |                   |    Read     |
                    |  Database   |==================>|   Replica   |
                    | (PostgreSQL)| (Async Replic.)   |  Databases  |
                    +-------------+                   +-------------+
```

### 6.2 Component Explanations & Big Sale Defense Strategy

1. **CDN (Content Delivery Network):** Caches event posters, seat map SVGs, and landing pages at edge nodes, absorbing over 90% of static browse requests without touching origin infrastructure.
2. **Virtual Waiting Room (e.g., Cloudflare Waiting Room / Redis Token Bucket):** Intercepts the 200,000 concurrent surge and buffers users in an orderly FIFO queue, releasing only 500 users per second to the ticketing engine. This is the **primary mechanism that ensures system survival**, converting an uncontrollable 5,000 RPS stampede into a predictable, steady stream that fits within backend capacity.
3. **Load Balancer:** Distributes the metered traffic evenly across the fleet of auto-scaled app servers and performs health checks to isolate degraded nodes.
4. **App Servers (Stateless Cluster):** Stateless containers (e.g., in Kubernetes) that auto-scale horizontally from 5 instances to 50+ instances based on CPU and request latency metrics.
5. **Redis Cache & Distributed Locks:** Holds real-time seat status bitmasks and atomic hold locks in RAM, allowing seat checks and lock attempts to execute in $<1\text{ ms}$ while absorbing repeated polling.
6. **Primary Relational Database:** Dedicated exclusively to write transactions (holds, order completions, ticket generation), operating with strict ACID compliance.
7. **Read Replica Databases:** Absorb read traffic (event lists, user order histories, venue layouts) so read queries never lock or slow down active ticket sales.
8. **Payment Gateway Integration:** Offloads credit card processing and PCI compliance to third-party providers (Stripe/Adyen) via asynchronous webhooks.

---

## 7. Architectural Trade-Offs

### Trade-Off 1: Virtual Waiting Room vs. Open Instant Access
- **Decision:** Gate the sale behind a Virtual Waiting Room during peak demand.
- **Pros:** Completely shields databases and application servers from catastrophic collapse due to connection pooling exhaustion, eliminates server crashes, and ensures an equitable FIFO purchasing process.
- **Cons:** Users must wait in an artificial queue, which introduces friction compared to instant checkout.

### Trade-Off 2: Redis In-Memory Hold Locks vs. Pure Database Pessimistic Locking
- **Decision:** Use Redis `SETNX` as a fast preliminary lock backed by an atomic database update.
- **Pros:** Rejects 99% of competing seat clicks in RAM in sub-millisecond time, preventing hundreds of concurrent transactions from blocking each other on database row locks (`SELECT ... FOR UPDATE`).
- **Cons:** Introduces architectural complexity by managing state across two datastores (cache and database) and requires automated reconciliation (TTL sweeper) if an application process dies mid-hold.

### Trade-Off 3: Strong Consistency on Seats vs. Eventual Consistency on General Event Discovery
- **Decision:** Enforce absolute linearizable consistency for seat holds and orders, while allowing read replicas and CDN caches to be eventually consistent for general event listings.
- **Pros:** Gives the system massive read scalability for the millions of browsing requests without sacrificing the strict correctness required for monetary transactions.
- **Cons:** Event listings or search results might show an event as "available" for a few seconds after the final seat is booked until the CDN edge cache invalidates.
