# Google Jules REST API Quickstart Reference

This document provides a reference for the Google Jules REST API endpoints, schemas, and common patterns.

## Base URL
```
https://jules.googleapis.com/v1alpha/
```

## Authentication

All requests must include your API Key in the `x-goog-api-key` header:
```
x-goog-api-key: $JULES_API_KEY
```

---

## Core Resources & Endpoints

### 1. Sources

A **Source** represents a repository connected to Google Jules.

- **List Sources**:
  `GET /sources`
  Returns all connected repositories available to Jules.
  - **Example Request**:
    ```bash
    curl -H "x-goog-api-key: $JULES_API_KEY" \
      "https://jules.googleapis.com/v1alpha/sources"
    ```

- **Get Source Details**:
  `GET /sources/{sourceName}` (e.g. `/sources/github-myorg-myrepo`)

---

### 2. Sessions

A **Session** is an active or completed task VM execution sandbox for a specific source.

- **Create a Session**:
  `POST /sessions`
  - **Parameters**:
    - `prompt` (string): The task description.
    - `title` (string): Human-readable session title.
    - `sourceContext`: The repository context (source path and starting branch).
    - `requirePlanApproval` (boolean): If `true`, requires explicit approval of the generated plan.
    - `automationMode` (string): Set to `"AUTO_CREATE_PR"` to auto-open a PR on GitHub when finished.
  - **Example Request**:
    ```bash
    curl -X POST \
      -H "x-goog-api-key: $JULES_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "prompt": "Fix database timeout issue in queries.py",
        "title": "Fix DB Timeout",
        "sourceContext": {
          "source": "sources/github-owner-repo",
          "githubRepoContext": {
            "startingBranch": "main"
          }
        },
        "requirePlanApproval": true
      }' \
      "https://jules.googleapis.com/v1alpha/sessions"
    ```

- **List Sessions**:
  `GET /sessions`
  Retrieves history and state of remote sessions.
  - **Pagination Example**:
    ```bash
    curl -H "x-goog-api-key: $JULES_API_KEY" \
      "https://jules.googleapis.com/v1alpha/sessions?pageSize=10"
    ```

- **Get Session Status**:
  `GET /sessions/{sessionId}`
  Returns status details, metadata, and output PR urls.

- **Delete Session**:
  `DELETE /sessions/{sessionId}`

---

### 3. Session Actions (Plan Approval & Messaging)

- **Approve a Plan**:
  `POST /sessions/{sessionId}:approvePlan`
  Approves a pending plan. Only required when `requirePlanApproval` was set to `true`.
  - **Example Request**:
    ```bash
    curl -X POST \
      -H "x-goog-api-key: $JULES_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{}' \
      "https://jules.googleapis.com/v1alpha/sessions/{sessionId}:approvePlan"
    ```

- **Send a Message (Feedback)**:
  `POST /sessions/{sessionId}:sendMessage`
  Send additional instructions, answers, or change feedback to an active session.
  - **Request Body**:
    ```json
    {
      "message": "User feedback: Please write tests in Python instead of Node.js"
    }
    ```
  - **Example Request**:
    ```bash
    curl -X POST \
      -H "x-goog-api-key: $JULES_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{"message": "User feedback: please change X to Y"}' \
      "https://jules.googleapis.com/v1alpha/sessions/{sessionId}:sendMessage"
    ```

---

## Session Lifecycle States

The REST API returns the session state, which progress through:

| State | Description |
| --- | --- |
| `AWAITING_PLAN_APPROVAL` | Plan has been generated and is waiting for user approval. |
| `AWAITING_USER_FEEDBACK` | Agent has hit a roadblock or question and is waiting for user feedback via message. |
| `IN_PROGRESS` | Agent is actively analyzing or modifying code in the sandbox. |
| `COMPLETED` | Task finished successfully. Code patch is ready. |
| `FAILED` | Sesi failed. Check logs/details. |
| `PAUSED` | Session paused. |
