# Domain Glossary

This document serves as the centralized domain glossary for the `jules-companion` project, ensuring ubiquitous language consistency across code identifiers, documentation, and communication.

## Core Concepts

### Session
A discrete, self-contained interaction between the developer (via IDE/CLI) and the Google Jules autonomous coding service. Identified by a unique `sessionId` (e.g., `1234567890abcdef`). Sessions can have statuses such as `PENDING`, `ACTIVE`, `SUCCEEDED`, `FAILED`.

### Launch Mode
The method by which a Google Jules session is initialized and determines its autonomous behavior regarding execution plans.
- `start`: Autonomous code implementation without pausing for plan approval.
- `review`: Jules formulates an execution plan and pauses in `AWAITING_PLAN_APPROVAL`.
- `interactive`: Jules engages in dialogue to clarify goals before formulating a plan.
- `scheduled`: Queued task for background execution at a later time.
**Note on Collision:** The `review` Launch Mode shares a name with the `review` Operational Mode but serves a completely different domain purpose.

### Operational Mode
The type of work the agent is instructed to perform within a session. Maps to the `--mode` flag.
- `code`: The agent modifies code, implements features, or fixes bugs.
- `review`: The agent performs a code review (e.g., of a specific branch or PR) without intending to modify the implementation.
**Note on Collision:** The `review` Operational Mode shares a name with the `review` Launch Mode.

### Agent
A specialized AI persona (e.g., `architect`, `tester`, `lexicon`) with specific boundaries, context files (`references/agents/`), and system prompts that dictate its behavior during a session.

### Team Preset
A predefined composition of multiple specialized agents designed to tackle a complex task together (e.g., `full-audit`, `feature-sprint`).

### Target Directory (`targetDir`)
The absolute path to the root directory of the user's project repository where Jules will operate and Git operations will be performed.

### Safety Gate
The validation step prior to merging a completed session's branch. It verifies the cloud session reached a `SUCCEEDED` state and that the local working tree is clean.

### Scheduled Task
A background task recorded in `.jules-companion/schedules.json` that the local task scheduler evaluates and deploys autonomously at a designated `scheduledAt` time.
