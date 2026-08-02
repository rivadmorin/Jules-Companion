## 2023-10-24 - Parallelize Network Requests in Session Deployment
**Learning:** When deploying sessions for multiple agents, iterating sequentially with `for...of` loops causes O(N) network bottleneck as each API request to Google REST API blocks the next. This significantly impacts performance when dealing with 30+ specialized agents.
**Action:** Use `Promise.all()` to parallelize multiple independent network requests (like `deploySession`). Buffer `console.log` statements inside the individual promises and print them after resolution to prevent interleaved console output.

## 2026-08-02 - HTTP Keep-Alive for Batch API Requests
**Learning:** When making multiple concurrent API requests to Google Jules API via REST, establishing a new TLS connection for every request adds significant overhead. While `Promise.all()` handles the concurrency, the network latency of TLS handshakes per connection creates a bottleneck.
**Action:** Use a shared `https.Agent({ keepAlive: true })` across the application so that TCP connections to the API host are reused, bypassing repeated TLS negotiation and drastically speeding up batch operations like deploying multiple agents or listing sessions.
