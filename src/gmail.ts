import { google } from 'googleapis';
import { getOAuth2Client } from './auth.js';

function buildRawEmail(
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
): string {
  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  const contentType = isHtml ? 'text/html; charset="utf-8"' : 'text/plain; charset="utf-8"';

  const parts = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: ${contentType}`,
  ];

  if (cc) {
    parts.push(`Cc: ${cc}`);
  }
  if (bcc) {
    parts.push(`Bcc: ${bcc}`);
  }

  parts.push('', body);

  const raw = parts.join('\r\n');
  return Buffer.from(raw)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function createDraft(
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = buildRawEmail(to, subject, body, cc, bcc);

  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw,
      },
    },
  });

  return response.data;
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
) {
  const auth = getOAuth2Client();
  const gmail = google.gmail({ version: 'v1', auth });

  const raw = buildRawEmail(to, subject, body, cc, bcc);

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
    },
  });

  return response.data;
}
