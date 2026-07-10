# Google Workspace MCP Server

This is a generic Model Context Protocol (MCP) server that enables AI agents (such as Claude Desktop, Cursor, etc.) to compose and send emails via **Gmail** and append content to **Google Docs**.

---

## Features
- **Gmail Automation**:
  - `gmail_create_draft`: Compose new draft emails with subject, body, CC, and BCC.
  - `gmail_send_email`: Send emails directly.
- **Document Management**:
  - `gdocs_append_text`: Append text/paragraphs to the end of a Google Doc.
- **Generic Protocol**: Works with any MCP client over standard input/output (stdio).

---

## Prerequisites
- Node.js (version 18+ recommended)
- A Google Cloud Console project with the following APIs enabled:
  - **Gmail API**
  - **Google Docs API**
- OAuth 2.0 Credentials (Desktop application type) from Google Cloud.

---

## Setup & Installation

### Step 1: Configure Credentials
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project.
3. Enable the **Gmail API** and **Google Docs API** under **APIs & Services > Library**.
4. Configure the **OAuth Consent Screen** (external/internal developer mode, add your email as a test user if in Testing status).
5. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**.
6. Set the application type to **Desktop app** (or Web app with `http://localhost:3000/oauth2callback` as a redirect URI).
7. Copy the client ID and client secret.
8. Create a `.env` file in the root of this project:
   ```bash
   cp .env.example .env
   ```
9. Fill in your Google credentials:
   ```ini
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback
   ```

### Step 2: Authorize & Generate Refresh Token
Run the OAuth login flow:
```bash
npm run auth
```
1. This will print a Google authentication URL. Copy and open it in your browser.
2. Grant permissions for Gmail (Compose/Send) and Google Docs.
3. Once completed, the browser will redirect to `localhost:3000` showing "Authentication Successful!".
4. The script will automatically update your `.env` file with the `GOOGLE_REFRESH_TOKEN`.

---

## Build the Server
Build the TypeScript files:
```bash
npm run build
```

---

## Integration with Claude Desktop

To connect this server to your Claude Desktop application:
1. Open your Claude Desktop configuration file:
   - **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
2. Add the server config:
   ```json
   {
     "mcpServers": {
       "google-workspace": {
         "command": "node",
         "args": ["/Users/shubhamthakur/Downloads/nextleap antigravity projects/MCP Server 01./build/index.js"],
         "env": {
           "GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID",
           "GOOGLE_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
           "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth2callback",
           "GOOGLE_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN"
         }
       }
     }
   }
   ```
   *(Note: Replace the file paths and environment variables with your actual values.)*
3. Restart Claude Desktop.

---

## Available Tools

### 1. `gmail_create_draft`
Creates a draft email in the user's Gmail.
- **Parameters**:
  - `to` (string, required): Recipient's email address.
  - `subject` (string, required): Subject of the email.
  - `body` (string, required): Email body content (HTML or plain text).
  - `cc` (string, optional): CC recipient email.
  - `bcc` (string, optional): BCC recipient email.

### 2. `gmail_send_email`
Sends an email immediately.
- **Parameters**: Same as `gmail_create_draft`.

### 3. `gdocs_append_text`
Appends text to the end of a specified Google Doc.
- **Parameters**:
  - `documentId` (string, required): The ID of the document (can be parsed from the document URL, e.g. `https://docs.google.com/document/d/<documentId>/edit`).
  - `text` (string, required): The text content to append.
