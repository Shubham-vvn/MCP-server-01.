import { google } from 'googleapis';
import http from 'http';
import url from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/documents'
];

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables.');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
}

async function runAuthFlow() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';

  if (!clientId || !clientSecret) {
    console.error('Error: Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file first.');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent' // Ensure we get a refresh token every time
  });

  const parsedUrl = new URL(redirectUri);
  const port = parsedUrl.port ? parseInt(parsedUrl.port) : 3000;

  console.log('\n================================================================');
  console.log('Google Workspace MCP Server - Authentication Flow');
  console.log('================================================================\n');
  console.log('1. Open the following URL in your web browser:');
  console.log(`\n   ${authUrl}\n`);
  console.log('2. Log in and authorize the application.');
  console.log('Waiting for authorization callback...');

  const server = http.createServer(async (req, res) => {
    try {
      if (req.url && req.url.startsWith(parsedUrl.pathname)) {
        const queryParams = url.parse(req.url, true).query;
        const code = queryParams.code as string;

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>Authentication Successful!</h1><p>You can close this browser tab and return to the terminal.</p>');

          console.log('\nCallback received. Exchanging authorization code for tokens...');
          const { tokens } = await oauth2Client.getToken(code);
          
          // Write all tokens to tokens.json
          try {
            const tokensPath = path.resolve(process.cwd(), 'tokens.json');
            fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2), 'utf8');
            console.log('Successfully generated tokens.json file in the root directory.');
          } catch (err) {
            console.warn('Could not automatically create tokens.json file:', err);
          }

          if (tokens.refresh_token) {
            console.log('\n================ SUCCESS ================');
            console.log('Add the following refresh token to your .env file:\n');
            console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
            console.log('==========================================');

            try {
              const envPath = path.resolve(process.cwd(), '.env');
              let envContent = '';
              if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
              } else {
                // copy from .env.example if exists
                const examplePath = path.resolve(process.cwd(), '.env.example');
                if (fs.existsSync(examplePath)) {
                  envContent = fs.readFileSync(examplePath, 'utf8');
                }
              }

              if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
                envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
              } else {
                envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
              }
              fs.writeFileSync(envPath, envContent, 'utf8');
              console.log('Automatically updated .env file with the refresh token.');
            } catch (err) {
              console.warn('Could not automatically update .env file. Please copy the token manually.');
            }
          } else {
            console.log('\n================ WARNING ================');
            console.warn('No refresh token returned. This might happen if you have already authorized this app.');
            console.warn('To fix this, go to Google Account Settings -> Security -> Manage third-party access,');
            console.warn('remove access for this app, and try running this auth command again.');
            console.log('==========================================');
          }

          server.close();
          process.exit(0);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Failed to retrieve code.</h1>');
          console.error('Authorization failed: code not found in request');
          server.close();
          process.exit(1);
        }
      }
    } catch (e) {
      console.error('Error during token exchange:', e);
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>Internal Server Error</h1>');
      server.close();
      process.exit(1);
    }
  });

  server.listen(port, () => {
    console.log(`Server listening for OAuth callback on port ${port}...`);
  });
}

if (process.argv.includes('--auth-flow')) {
  runAuthFlow();
}
