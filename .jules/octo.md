## 29-09-2026 - [CodeQL Permissions Requirement]
**Discovery:** When implementing CodeQL in a repository applying strict `permissions: contents: read` by default, the Analyze job explicitly requires elevated `security-events: write` permission to upload its sarif results.
**Analysis:** Standard least-privilege approaches for CI jobs would block the sarif upload if `security-events: write` is not specifically enabled at the job level.
**Action:** Always verify CodeQL `permissions` block includes `security-events: write` alongside `contents: read` and `actions: read`.
