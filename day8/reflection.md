# Web Foundations: Course Reflection

### 1. The Most Difficult Concept & Overcoming It
The most challenging concept for me was mastering asynchronous control flow and distributed state coordination—specifically transitioning from synchronous DOM manipulation to managing promises, network latency, and transactional data integrity across multi-tiered systems. Initially, handling asynchronous race conditions, error boundaries (`try/catch/finally`), and optimistic versus pessimistic locking felt abstract. I overcame this hurdle through systematic hands-on experimentation: isolating asynchronous functions into lightweight test harnesses, diagramming request-response lifecycles, and testing failure scenarios directly in playground environments (such as mocking network timeouts and testing SQLite constraints against duplicate records).

### 2. Improving My Capstone Based on Feedback
Based on peer and instructor feedback, the primary area I would improve in my capstone project is client-side resilience and accessible user feedback. While the core application logic and backend database schemas functioned correctly, my user interface relied heavily on generic status paragraphs rather than contextual, accessible, inline notifications. In an updated iteration, I would implement non-blocking toast notifications with appropriate ARIA live regions, add robust client-side input sanitization before network dispatch, and refine offline caching so that temporary network dropouts do not interrupt active draft editing.

### 3. What I Will Learn Next
Moving forward, I plan to advance into modern full-stack engineering with TypeScript, Next.js, and PostgreSQL. I want to deepen my understanding of backend system design—particularly building resilient microservices with Docker, implementing Redis caching layers, and mastering relational database performance tuning with advanced query indexing and connection pooling.
