## 2023-10-24 - Parallelize Network Requests in Session Deployment
**Learning:** When deploying sessions for multiple agents, iterating sequentially with `for...of` loops causes O(N) network bottleneck as each API request to Google REST API blocks the next. This significantly impacts performance when dealing with 30+ specialized agents.
**Action:** Use `Promise.all()` to parallelize multiple independent network requests (like `deploySession`). Buffer `console.log` statements inside the individual promises and print them after resolution to prevent interleaved console output.
