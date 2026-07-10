import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { createDraft, sendEmail } from './gmail.js';
import { appendText } from './gdocs.js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the MCP server
const server = new Server(
  {
    name: 'google-workspace-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define list of tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'gmail_create_draft',
        description: "Create a draft email in the user's Gmail account.",
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'The email address of the recipient (e.g., recipient@example.com).',
            },
            subject: {
              type: 'string',
              description: 'The subject line of the email.',
            },
            body: {
              type: 'string',
              description: 'The body/content of the email (supports plain text or simple HTML).',
            },
            cc: {
              type: 'string',
              description: 'Optional Carbon Copy (CC) email address(es).',
            },
            bcc: {
              type: 'string',
              description: 'Optional Blind Carbon Copy (BCC) email address(es).',
            },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      {
        name: 'gmail_send_email',
        description: "Send an email directly from the user's Gmail account.",
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'string',
              description: 'The email address of the recipient.',
            },
            subject: {
              type: 'string',
              description: 'The subject line of the email.',
            },
            body: {
              type: 'string',
              description: 'The body/content of the email.',
            },
            cc: {
              type: 'string',
              description: 'Optional CC email address(es).',
            },
            bcc: {
              type: 'string',
              description: 'Optional BCC email address(es).',
            },
          },
          required: ['to', 'subject', 'body'],
        },
      },
      {
        name: 'gdocs_append_text',
        description: 'Append text content to the end of a specified Google Doc.',
        inputSchema: {
          type: 'object',
          properties: {
            documentId: {
              type: 'string',
              description: 'The unique document ID of the Google Doc (can be parsed from the document URL).',
            },
            text: {
              type: 'string',
              description: 'The text content to append to the document.',
            },
          },
          required: ['documentId', 'text'],
        },
      },
    ],
  };
});

// Define tool execution handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'gmail_create_draft': {
        const { to, subject, body, cc, bcc } = args as {
          to: string;
          subject: string;
          body: string;
          cc?: string;
          bcc?: string;
        };
        if (!to || !subject || !body) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing required fields: to, subject, or body');
        }
        const result = await createDraft(to, subject, body, cc, bcc);
        return {
          content: [
            {
              type: 'text',
              text: `Draft created successfully. Draft ID: ${result.id}`,
            },
          ],
        };
      }

      case 'gmail_send_email': {
        const { to, subject, body, cc, bcc } = args as {
          to: string;
          subject: string;
          body: string;
          cc?: string;
          bcc?: string;
        };
        if (!to || !subject || !body) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing required fields: to, subject, or body');
        }
        const result = await sendEmail(to, subject, body, cc, bcc);
        return {
          content: [
            {
              type: 'text',
              text: `Email sent successfully. Message ID: ${result.id}`,
            },
          ],
        };
      }

      case 'gdocs_append_text': {
        const { documentId, text } = args as {
          documentId: string;
          text: string;
        };
        if (!documentId || !text) {
          throw new McpError(ErrorCode.InvalidParams, 'Missing required fields: documentId or text');
        }
        const result = await appendText(documentId, text);
        return {
          content: [
            {
              type: 'text',
              text: `Successfully appended content to Google Doc "${result.title || documentId}".`,
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message || String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Run the server using stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Google Workspace MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in server main:', error);
  process.exit(1);
});
