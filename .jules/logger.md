## 02-10-2026 - [Strict JSON Payload Requirements for IPC]
**Discovery:** Normal text logging breaks the system integration, specifically with `scripts/jules_menu.ts` and IDE IPC clients.
**Analysis:** The CLI interface acts as an API layer for external IDE clients. Standard `console.log` statements with raw strings intercept and corrupt the JSON-based message parsing pipeline that IDE extensions depend on.
**Action:** All outputs to stdout and stderr must be strictly formatted as JSON payloads (e.g., using `console.log(JSON.stringify(entry))`) to maintain integration. Structured JSON logging is a hard architectural requirement, not just a preference.
