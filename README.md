# Nexeo Local Observability

A completely standalone, zero-config local observability dashboard for Nexeo development. 
This tool wraps the existing Nexeo `pnpm dev` environment to capture and parse logs in real-time, serving them to a beautiful local web dashboard.

**Crucially, this repository is completely independent. It makes zero modifications to the existing Nexeo monorepo.**

## Features
- **Zero changes to Nexeo**: Runs outside the Nexeo repository.
- **No Persistence**: Everything is kept in an in-memory ring buffer. Restarting the tool clears all data.
- **Max Events**: Automatically evicts the oldest logs, maintaining a strict maximum of 10,000 events (`MAX_EVENTS`).
- **Real-Time Live Stream**: Connects via WebSockets to instantly push logs without polling.
- **Slow Query & Request Detection**: Automatically flags requests taking longer than 500ms and DB queries taking longer than 200ms.
- **Redaction**: Automatically scrubs sensitive fields (`accessToken`, `password`, `secret`, etc.).

## Architecture
1. **Collector CLI (`nexeo-observe`)**: Spawns a child process of Nexeo's `pnpm dev`, captures stdout/stderr, and forwards the output exactly as it was to your terminal.
2. **Log Parser**: Intercepts the streams, extracts service names (e.g., `@nexeo/ops-service`), parses JSON when available, redacts sensitive information, and normalizes the events.
3. **Ring Buffer**: Holds the last 10,000 normalized `LogEvent` objects in memory.
4. **Local Server**: A Node.js Express server that serves the compiled dashboard static files and hosts the WebSocket connection.
5. **Dashboard**: A React SPA that connects to the local server, displaying logs, metrics, and deep-dives into request timelines and slow database queries.

## Installation

```bash
git clone <this-repo>
cd nexeo-local-observability
pnpm install
pnpm run build
```

## Usage

Point the tool to your Nexeo monorepo directory:

```bash
pnpm start --repo /path/to/Nexeo_Repository
```

The CLI will start the Nexeo `pnpm dev` process, stream logs to your terminal as usual, and launch the dashboard locally.

Then open your browser to the dashboard:
**http://localhost:3854**

## Configuration
You can pass CLI arguments to customize behavior:
- `--repo <path>`: Path to the Nexeo repo (default: current directory)
- `--port <number>`: Dashboard port (default: 3854)
- `--max-events <number>`: Buffer limit (default: 10000)
- `--slow-query <number>`: Slow DB query threshold in ms (default: 200)
- `--slow-request <number>`: Slow request threshold in ms (default: 500)

## Troubleshooting
- **Orphaned Processes**: The tool actively listens for `SIGINT` (Ctrl+C) and terminates the child `pnpm dev` process cleanly. If Nexeo gets stuck, manually kill node processes.
- **Terminal Output**: All terminal output is preserved. This tool acts as an invisible wrapper that passively duplicates the log stream.
