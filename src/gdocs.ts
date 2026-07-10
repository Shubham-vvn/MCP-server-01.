import { google } from 'googleapis';
import { getOAuth2Client } from './auth.js';

export async function appendText(documentId: string, text: string) {
  const auth = getOAuth2Client();
  const docs = google.docs({ version: 'v1', auth });

  // 1. Get document details to find the end index
  const doc = await docs.documents.get({ documentId });
  const content = doc.data.body?.content;
  if (!content || content.length === 0) {
    throw new Error('Document body is empty or structure is invalid.');
  }

  const lastElement = content[content.length - 1];
  const endIndex = lastElement.endIndex;
  if (endIndex === undefined || endIndex === null) {
    throw new Error('Could not determine document end index.');
  }

  // Insert before the final document character (which is always a trailing newline)
  const insertIndex = Math.max(1, endIndex - 1);

  // 2. Perform batchUpdate to insert text
  const response = await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: {
              index: insertIndex,
            },
            text: text,
          },
        },
      ],
    },
  });

  return {
    documentId,
    title: doc.data.title,
    appendedText: text,
    insertIndex,
    reply: response.data,
  };
}
