# Implementation Plan: Google Workspace MCP Server

This document defines the phases, technical architecture, and step-by-step plan for building and deploying the Google Workspace Model Context Protocol (MCP) server.

---

## Technical Stack & Architecture

- **Runtime**: Node.js (version 18+ recommended)
- **Language**: TypeScript (compiled to modern ES modules)
- **Libraries**:
  - `@modelcontextprotocol/sdk` (Standard MCP SDK for tool registry and stdio transport)
  - `googleapis` (Official Google APIs client library)
  - `dotenv` (For local environment variable management)
- **Transport**: Standard Input/Output (`stdio`)
- **Authentication**: Google OAuth 2.0 (using a standalone CLI consent flow to retrieve a persistent refresh token)

---

## Phase 1: Project Setup & Infrastructure

1.  **Initialize Node.js Project**:
    - Configure `package.json` with standard ES modules (`"type": "module"`) and define scripts for build, dev, start, and auth.
2.  **Configure TypeScript**:
    - Setup `tsconfig.json` targeting ES2022 and setting `moduleResolution` to `NodeNext` for modern ESM resolving.
3.  **Establish Environment Template**:
    - Create a `.env.example` defining configuration keys: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, and `GOOGLE_REFRESH_TOKEN`.
4.  **Install Dependencies**:
    - Run `npm install` for core libraries and developer typings.

---

## Phase 2: OAuth 2.0 Authentication Helper

Since MCP servers run non-interactively in the background, interactive browser consent cannot occur during model tool invocations.

1.  **OAuth 2.0 Client Setup (`src/auth.ts`)**:
    - Instantiate the Google OAuth2 client utilizing the client credentials.
2.  **Authentication CLI Hook (`npm run auth`)**:
    - Spin up a temporary local HTTP server listening on port 3000.
    - Generate a consent URL requesting offline access scopes for:
      - `https://www.googleapis.com/auth/gmail.compose` (Compose and send drafts/emails)
      - `https://www.googleapis.com/auth/documents` (Read and write Google Docs)
    - Automatically redirect or instruct the developer to complete browser login.
    - Capture the authorization callback code, exchange it for a `refresh_token`, and append/save it to the local `.env` file.

---

## Phase 3: Google Service Integration

1.  **Gmail Service Wrapper (`src/gmail.ts`)**:
    - **Draft Compiler**: Build raw RFC-822 formatted emails containing To, Subject, MIME headers, and body content, then encode it via base64url.
    - **Tool `gmail_create_draft`**: Calls `gmail.users.drafts.create` to create a message draft.
    - **Tool `gmail_send_email`**: Calls `gmail.users.messages.send` to send an email immediately.
2.  **Google Docs Service Wrapper (`src/gdocs.ts`)**:
    - **Text Appender**: Fetch document structures via `docs.documents.get` to calculate the final document body length (`endIndex`).
    - **Tool `gdocs_append_text`**: Execute `docs.documents.batchUpdate` using the `insertText` payload pointing at `endIndex - 1` (inserting before the final document newline).

---

## Phase 4: Model Context Protocol Core Server

1.  **Initialize MCP Server (`src/index.ts`)**:
    - Import and configure the standard `Server` class from `@modelcontextprotocol/sdk`.
2.  **Expose Tools Scheme**:
    - Declare tools through `ListToolsRequestSchema` with precise JSON schema parameters:
      - `gmail_create_draft`: `to` (required), `subject` (required), `body` (required), `cc` (optional), `bcc` (optional).
      - `gmail_send_email`: Same fields as create draft.
      - `gdocs_append_text`: `documentId` (required), `text` (required).
3.  **Register Request Router**:
    - Setup `CallToolRequestSchema` handler mapping tools to their respective wrapper actions in Gmail and Google Docs.
4.  **Connect Stdio Transport**:
    - Hook the server to `StdioServerTransport` so standard input/output acts as the JSON-RPC interface.

---

## Phase 5: Client Integration & Verification

1.  **Local Compilation**:
    - Compile TypeScript code into native JavaScript using `npm run build`.
2.  **JSON-RPC Stdio Dry-run**:
    - Run an automated query using the command line to verify response and correct schema:
      ```bash
      echo '{"jsonrpc":"2.0","method":"tools/list","id":1,"params":{}}' | node build/index.js
      ```
3.  **Claude Desktop Integration**:
    - Insert the workspace folder path and required environment credentials into `claude_desktop_config.json`.
4.  **Manual Acceptance Testing**:
    - Open the client, verify tools presence, and ask the LLM to write a draft/send email and append lines to a specific Google Doc.
