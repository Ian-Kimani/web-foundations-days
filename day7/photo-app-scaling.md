# SnapShare: System Scaling & Architecture Plan

This document outlines the architectural scaling plan for **SnapShare**, a photo-sharing platform where users upload photos and scroll through an aggregated feed of photos posted by accounts they follow.

---

## 1. Assumptions & Baseline Facts

Based on the provided specifications:
- **Total Registered Users:** 10,000,000 (10 million)
- **Daily Active Users (DAU) Ratio:** 10%
- **Daily Active Users (DAU):** $10,000,000 \times 0.10 = 1,000,000$ active users per day
- **Upload Activity:** 1 photo per active user per day
- **Feed Browsing Activity:** 50 feed pages viewed per active user per day
- **Average Photo Size:** 2 MB
- **Thumbnail Size:** 50 KB ($0.05\text{ MB}$)
- **Peak Traffic Multiplier:** $5\times$ the daily average
- **Seconds per Day:** $86,400\text{ seconds}$ (approximately $10^5\text{ seconds}$)

---

## 2. Capacity Estimations & Throughput

### 2.1 Uploads per Second
- **Total Uploads per Day:**  
  $$1,000,000\text{ active users} \times 1\text{ photo/day} = 1,000,000\text{ uploads/day}$$
- **Average Uploads per Second:**  
  $$\frac{1,000,000}{86,400} \approx 11.57\text{ uploads/sec}$$
- **Peak Uploads per Second ($5\times$ peak):**  
  $$11.57 \times 5 \approx 57.87\text{ uploads/sec}$$

### 2.2 Feed Views per Second
- **Total Feed Views per Day:**  
  $$1,000,000\text{ active users} \times 50\text{ feed views/day} = 50,000,000\text{ views/day}$$
- **Average Feed Views per Second:**  
  $$\frac{50,000,000}{86,400} \approx 578.70\text{ views/sec}$$
- **Peak Feed Views per Second ($5\times$ peak):**  
  $$578.70 \times 5 \approx 2,893.52\text{ views/sec}$$

### 2.3 Storage Requirements per Year
- **Storage per Photo (Original + Thumbnail):**  
  $$2\text{ MB} + 0.05\text{ MB} = 2.05\text{ MB per uploaded photo}$$
- **Daily Storage Ingestion:**  
  $$1,000,000\text{ photos} \times 2.05\text{ MB} = 2,050,000\text{ MB} \approx 2.05\text{ TB/day}$$
  - *Original photos:* $1,000,000 \times 2\text{ MB} = 2.00\text{ TB/day}$
  - *Thumbnails:* $1,000,000 \times 0.05\text{ MB} = 50\text{ GB/day}$ ($0.05\text{ TB/day}$)
- **Yearly Storage Ingestion ($365\text{ days}$):**  
  $$2.05\text{ TB/day} \times 365\text{ days} \approx 748.25\text{ TB/year}$$  
  *(Approximately $750\text{ TB}$ of storage added annually).*

---

## 3. Read vs. Write Workload Analysis

### 3.1 Workload Classification
SnapShare is overwhelmingly **read-heavy**.
- **Ratio:** 50,000,000 feed page views vs. 1,000,000 photo uploads equates to a **50:1 read-to-write ratio** (and even higher when counting individual photo views within feeds).

### 3.2 Design Implications
1. **Aggressive Multi-Tier Caching:** Because reads outnumber writes by 50 to 1, user feeds and hot metadata must be served from high-performance in-memory caches (e.g., Redis) to prevent querying the database on every scroll.
2. **Database Read Replicas:** Read queries must be routed to read-only database replicas, leaving the primary database dedicated strictly to writes and transactional updates.
3. **CDN Offloading:** Binary media requests (photos and thumbnails) should be served almost entirely by edge CDN points of presence rather than hitting application servers.

### 3.3 Media Storage: Why Not Inside the Database?
Photos and thumbnails should **never** be stored as binary BLOBs inside a relational database:
- **Performance Degradation:** Storing large binary objects bloats the database storage engine, pollutes RAM buffer pools, slows down indexing, and degrades query performance.
- **Cost and Operational Complexity:** Database storage is vastly more expensive per gigabyte than object storage, and handling hundreds of terabytes of media inside database backups/restores creates massive operational overhead.
- **Dedicated Alternative:** Photos and thumbnails must reside in distributed **Object Storage** (e.g., Amazon S3, Google Cloud Storage, or Azure Blob Storage). Object storage is horizontally scalable, highly durable (99.999999999%), cheap, and natively integrates with Content Delivery Networks (CDNs). The database only stores lightweight string URLs and metadata pointing to the object storage assets.

---

## 4. Architecture Diagram

```
                             +-------------------+
                             |    User Client    |
                             +---------+---------+
                                       |
                +----------------------+----------------------+
                | (Media Requests: photos/thumbnails)         | (API Requests: feed/upload)
                v                                             v
        +---------------+                             +---------------+
        |      CDN      |                             | Load Balancer |
        +-------+-------+                             +-------+-------+
                |                                             |
                | (Cache miss fetch)                          v
                |                                     +---------------+
                |                                     |  App Servers  |
                |                                     +--+----+----+--+
                |                                        |    |    |
                |         +------------------------------+    |    +--------------------+
                |         | (Read/Write Cache)                |                         |
                |         v                                   v                         v
                |  +-------------+                     +-------------+           +-------------+
                |  |    Cache    |                     |   Primary   |           |   Message   |
                |  |   (Redis)   |                     |  Database   |           |    Queue    |
                |  +-------------+                     |   (Write)   |           +------+------+
                |                                      +------+------+                  |
                |                                             |                         |
                |                                             | (Async Replication)     | (Job: resize)
                |                                             v                         v
                |                                      +-------------+           +-------------+
                |                                      |    Read     |           |  Thumbnail  |
                |                                      |   Replica   |           |   Worker    |
                |                                      +-------------+           +------+------+
                |                                                                       |
                +----------------------------+------------------------------------------+
                                             | (Upload & retrieve raw photos & thumbnails)
                                             v
                                  +---------------------+
                                  |   Object Storage    |
                                  |    (e.g., S3)       |
                                  +---------------------+
```

---

## 5. Component Descriptions (Problem Solved)

- **CDN (Content Delivery Network):** Caches and serves static media files (photos and thumbnails) at geographically distributed edge locations close to users, dramatically reducing latency and preventing direct media traffic from saturating origin servers.
- **Load Balancer:** Distributes incoming HTTP/API traffic evenly across multiple backend application servers, preventing any single server from becoming a bottleneck and providing automatic failover.
- **App Servers:** Executes application business logic, manages authentication, processes feed requests, and coordinates between databases, caches, queues, and object storage while remaining stateless for effortless horizontal scaling.
- **Cache:** Stores precomputed user feeds, active session records, and frequently accessed metadata in memory (RAM), eliminating repeated database lookups for high-velocity read operations.
- **Primary Database:** Handles all write operations—such as creating user accounts, recording follow relationships, and storing new photo metadata—guaranteeing ACID transactional consistency as the authoritative source of truth.
- **Read Replica Database:** Continuously mirrors the primary database via asynchronous replication to absorb the heavy volume of read queries for feeds, profiles, and follower lists without burdening the primary write database.
- **Object Storage:** Stores unstructured binary photo files and generated thumbnails in a durable, cost-effective, and horizontally scalable storage service designed for high throughput.
- **Message Queue:** Decouples time-intensive background processing—such as thumbnail creation and notification delivery—from synchronous user request threads, keeping upload endpoints fast and responsive.
- **Thumbnail Worker:** Consumes thumbnail processing tasks from the message queue in the background, resizing newly uploaded photos into 50 KB thumbnails and updating object storage and database records asynchronously.

---

## 6. Step-by-Step Photo Upload Flow

1. **Upload Request:** The client sends an authenticated `POST /photos` request containing the photo binary (2 MB) and metadata (caption, location, timestamps) through the Load Balancer to an App Server.
2. **Object Storage Ingestion:** The App Server validates the file and uploads the full-resolution 2 MB image directly to Object Storage, obtaining a unique object key/URL.
3. **Metadata Persistence:** The App Server writes the photo record (with `user_id`, `photo_url`, `created_at`, and `thumbnail_status = 'pending'`) to the **Primary Database**.
4. **Queue Job Dispatch:** The App Server enqueues a `generate_thumbnail` task containing the `photo_id` and raw image storage key into the **Message Queue**.
5. **Fast Client Response:** The App Server immediately returns a success status (`201 Created` or `202 Accepted`) with the newly created photo details to the user, ensuring the user is not forced to wait for image processing.
6. **Asynchronous Worker Processing:** A Thumbnail Worker pulls the job from the Message Queue, downloads the 2 MB photo from Object Storage, and compresses/resizes it into a standardized 50 KB thumbnail.
7. **Thumbnail Storage & Database Update:** The Thumbnail Worker uploads the 50 KB thumbnail to Object Storage and updates the photo record in the Primary Database with the `thumbnail_url` and `thumbnail_status = 'ready'`.
8. **Cache Invalidation / Fan-out:** The background worker or event handler invalidates or updates the cached feed records of the user's followers in the Cache tier, making the new photo immediately viewable in their feeds.
9. **CDN Distribution:** When followers subsequently browse their feed, thumbnail and photo requests are fetched and cached at the nearest CDN edge node for instant viewing.

---

## 7. Architectural Trade-Offs

### Trade-Off 1: Asynchronous vs. Synchronous Thumbnail Generation
- **Decision:** Generate thumbnails asynchronously using a message queue and background workers.
- **Pros:** Keeps upload latency minimal (users do not wait for CPU-intensive image resizing), isolates failures (a failing image processor will not crash web servers), and allows workers to scale independently based on queue length.
- **Cons:** Introduces eventual consistency where a newly uploaded photo might briefly lack a thumbnail or show a placeholder in the feed for a couple of seconds until background processing completes.

### Trade-Off 2: Fan-Out on Write (Push) vs. Fan-Out on Read (Pull) for Feeds
- **Decision:** Hybrid feed strategy (Fan-out on write for regular users; Fan-out on read for high-follower celebrity accounts).
- **Pros:** Because the system is 50:1 read-heavy, precomputing feeds on write allows feed retrieval to be a single $O(1)$ cache lookup rather than executing an expensive multi-table join across thousands of followed users on every page view.
- **Cons:** Increases write amplification and storage consumption, as one photo post must be pushed into hundreds of follower feed lists in the cache. To mitigate this for accounts with millions of followers, celebrity posts are pulled at read time rather than pushed to millions of mailboxes simultaneously.

### Trade-Off 3: Read Replicas & CDN Caching vs. Immediate Read Consistency
- **Decision:** Utilize asynchronous database read replicas and CDN edge caching.
- **Pros:** Enables horizontal scaling capable of supporting peak loads exceeding 2,800 feed views per second without overloading the primary database or backend network bandwidth.
- **Cons:** Asynchronous replication introduces a brief replication lag (typically milliseconds), meaning a follower might occasionally refresh immediately after a friend posts and not see the new photo for a fraction of a second until the replica and CDN cache catch up.
