## 02-10-2026 - [Unused Parameters Resolution]
**Discovery:** TypeScript `--noUnusedParameters` throws warnings for required positional parameters.
**Analysis:** In some callback or overriding functions, positional parameters must remain in the signature even if unused.
**Action:** Prefix the unused parameter name with an underscore (e.g., `_sessionId`) to bypass the TypeScript compiler warning safely.
