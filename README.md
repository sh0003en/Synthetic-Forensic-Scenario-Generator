# Synthetic Forensic Scenario Generator

## Overview

A local REST API that generates deterministic synthetic digital-forensics scenarios representing credential-theft incidents. Given a configuration and seed, the service produces users, devices, and a plausible sequence of forensic events following the attack chain: authentication → process execution → credential access → network connection → data exfiltration.

---

## Prerequisites

- Node.js v18 or higher

## Installation

```bash
npm install
```

## Running the Service

```bash
npm start
```

Service runs on http://localhost:3000

For development with auto-reload:

```bash
npm run dev
```

## Running Tests

```bash
npm test
```

Runs all 34 tests across 3 files:
- `unit-test/generator.test.js` — scenario generation logic
- `unit-test/validator.test.js` — configuration and scenario validation
- `e2e-test/scenarios.test.js` — full HTTP request/response behaviour

---

## API

### GET /health

Returns service availability.

**Response**
```json
HTTP/1.1 200 OK

{
    "status": "ok"
}
```

---

### POST /api/scenarios

Accepts a scenario configuration and starts generation asynchronously. Returns immediately with a scenario ID and `pending` status.

**Request Body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `scenario` | string | Yes | Scenario type. Must be `credential_theft` |
| `users` | integer | Yes | Number of users to generate. Must be ≥ 1 |
| `devices` | integer | Yes | Number of devices to generate. Must be ≥ 1 |
| `events` | integer | Yes | Total number of events to generate. Must be ≥ 5 |
| `seed` | integer | Yes | Seed value for deterministic generation |

**Example Request**
```json
POST /api/scenarios
Content-Type: application/json

{
    "scenario": "credential_theft",
    "users": 2,
    "devices": 2,
    "events": 25,
    "seed": 42
}
```

**Example Response**
```json
HTTP/1.1 202 Accepted
Location: /api/scenarios/scenario-<uuid>

{
    "id": "scenario-<uuid>",
    "status": "pending"
}
```

**Error Responses**

```json
HTTP/1.1 400 Bad Request

{
    "error": "invalid_json",
    "message": "Request body must contain valid JSON"
}
```

```json
HTTP/1.1 400 Bad Request

{
    "error": "invalid_configuration",
    "message": "events must be at least 5"
}
```

---

### GET /api/scenarios/:id

Returns the current status and data for a scenario.

**Status Values**

| Status | Meaning |
|--------|---------|
| `pending` | Job accepted, not yet started |
| `running` | Generation in progress |
| `completed` | Generation successful |
| `failed` | Generation failed |

**Example Response (in progress)**
```json
HTTP/1.1 200 OK

{
    "id": "scenario-<uuid>",
    "status": "running"
}
```

**Example Response (completed)**
```json
HTTP/1.1 200 OK

{
    "id": "scenario-<uuid>",
    "status": "completed",
    "scenario": {
        "users": [
            {
                "id": "user-001",
                "username": "user001",
                "role": "employee"
            }
        ],
        "devices": [
            {
                "id": "device-001",
                "hostname": "WORKSTATION-01",
                "os": "Windows"
            }
        ],
        "events": [
            {
                "id": "event-001",
                "type": "authentication",
                "timestamp": "2026-01-01T10:00:00.000Z",
                "actor_user_id": "user-001",
                "device_id": "device-001",
                "chain_step": 1,
                "details": {
                    "method": "password",
                    "result": "success"
                }
            }
        ]
    }
}
```

**Error Response**
```json
HTTP/1.1 404 Not Found

{
    "error": "scenario_not_found",
    "message": "Scenario scenario-<uuid> was not found"
}
```

---

## Data Model

### User

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier e.g. `user-001` |
| `username` | string | Username e.g. `user001` |
| `role` | string | One of `employee`, `administrator`, `contractor` |

### Device

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier e.g. `device-001` |
| `hostname` | string | Hostname e.g. `WORKSTATION-01` |
| `os` | string | One of `Windows`, `macOS`, `Linux` |

### Event

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier e.g. `event-001` |
| `type` | string | Event type (see below) |
| `timestamp` | string | ISO 8601 timestamp |
| `actor_user_id` | string | References a generated user ID |
| `device_id` | string | References a generated device ID |
| `chain_step` | integer or null | 1–5 for attack chain events, null for background events |
| `details` | object | Event-specific context |

**Event Types**

| Type | Chain Step | Details |
|------|-----------|---------|
| `authentication` | 1 | `method`, `result` |
| `process_execution` | 2 | `process` |
| `credential_access` | 3 | `method` |
| `network_connection` | 4 | `destination`, `protocol` |
| `data_exfiltration` | 5 | `destination`, `bytes` |
| `authentication` | null | Background event, empty details |
| `process_execution` | null | Background event, empty details |
| `network_connection` | null | Background event, empty details |

---

## Deterministic Generation

JavaScript's `Math.random()` cannot be seeded, so a custom seeded PRNG (Mulberry32 algorithm) is implemented in `randomSeed.js`. Given the same seed, it produces the same sequence of values on every run.

The generator calls the PRNG in a fixed order — users first, then devices, then events — so the sequence is always consumed the same way. Timestamps use a fixed base (`2026-01-01T10:00:00Z`) rather than the system clock, with each event offset by 1 minute. Together these ensure that the same configuration and seed always produce identical output.

Non-deterministic fields: scenario `id` (UUID) and job creation time are generated independently and will differ between runs.

---

## Asynchronous Processing

`POST /api/scenarios` returns a `202 Accepted` response immediately after storing the job. Generation runs in the background using an async function called without `await`, allowing Node.js to process the HTTP response while generation proceeds on the event loop.

The scenario transitions through these statuses:

```
pending → running → completed
                 → failed
```

**Trade-off:** This approach requires no additional infrastructure but shares the Node.js event loop. A long-running or CPU-heavy generation job could delay other requests. It also does not survive server restarts — in-progress jobs would be lost.

---

## Storage

Scenarios are stored in a `Map` in memory for the lifetime of the application. This is simple and requires no external dependencies.

**Limitations:**
- All data is lost on server restart
- Not suitable for multiple server instances
- No persistence between runs

A production system would use a database such as PostgreSQL or SQLite, and a task queue such as BullMQ for job management.

---

## Design Decisions and Trade-offs

**Hono framework** — lightweight with minimal boilerplate, well-suited to a focused local API.

**Mulberry32 PRNG** — simple, dependency-free, and produces good statistical distribution for synthetic data generation.

**Validate after generation** — `validateScenario()` runs after generation as a safety check. If the generator produces invalid output, the scenario is marked `failed` rather than silently returning bad data.

**`chain_step` field** — attack chain events carry a `chain_step` value (1–5) so the intended attack sequence can be identified and filtered independently of event order.

**Separate validator module** — `scenarioValidator.js` can be tested independently of the generator, making invariant checks explicit and verifiable.

**In-memory storage** — sufficient for a local assessment with no persistence requirement.

---

## Known Limitations

- Data is lost on server restart
- No pagination for large event counts
- Background events have empty `details` objects
- Single scenario type supported (`credential_theft`)
- No concurrent job limiting

## Production Improvements

- Persistent storage with a database
- A task queue (e.g. BullMQ) for reliable async job handling
- Pagination or separate endpoint for event retrieval on large scenarios
- Additional scenario types
- `POST /api/scenarios/:id/validate` endpoint for explicit invariant reporting
- Docker support for consistent deployment
- Rate limiting and authentication