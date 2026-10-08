import { randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGoogleOAuthClient, GOOGLE_DRIVE_SCOPE } from '../googleDriveOAuth.js';

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
const redirectUriValue = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
if (!clientId || !clientSecret || !redirectUriValue) {
  throw new Error('Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI before running this setup.');
}

const redirectUri = new URL(redirectUriValue);
if (
  redirectUri.protocol !== 'http:'
  || !['localhost', '127.0.0.1'].includes(redirectUri.hostname)
  || !redirectUri.port
  || redirectUri.search
  || redirectUri.hash
) {
  throw new Error('The setup redirect URI must be a loopback URL with an explicit port, such as http://localhost:4317/oauth2/callback.');
}

const oauth = createGoogleOAuthClient(clientId, clientSecret, redirectUriValue);
const state = randomBytes(32).toString('hex');
const tokenPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.google-oauth-refresh-token');
const callbackPath = redirectUri.pathname;
const server = createServer();

const callbackResult = new Promise((resolve, reject) => {
  let handled = false;
  server.on('request', async (request, response) => {
    const callback = new URL(request.url || '/', redirectUri.origin);
    if (callback.pathname !== callbackPath) {
      response.writeHead(404).end('Not found');
      return;
    }
    if (handled) {
      response.writeHead(409).end('Authorization callback already received.');
      return;
    }
    handled = true;

    const returnedState = Buffer.from(callback.searchParams.get('state') || '');
    const expectedState = Buffer.from(state);
    if (returnedState.length !== expectedState.length || !timingSafeEqual(returnedState, expectedState)) {
      response.writeHead(400).end('Authorization state did not match. You can close this page and retry.');
      reject(new Error('OAuth state validation failed.'));
      return;
    }

    if (callback.searchParams.has('error')) {
      response.writeHead(400).end('Google authorization was not completed. You can close this page.');
      reject(new Error('Google authorization was not completed.'));
      return;
    }

    const code = callback.searchParams.get('code');
    if (!code) {
      response.writeHead(400).end('Authorization code was missing. You can close this page and retry.');
      reject(new Error('OAuth authorization code was missing.'));
      return;
    }

    try {
      const { tokens } = await oauth.getToken(code);
      if (!tokens.refresh_token) {
        throw new Error('Google did not issue a refresh token. Revoke this app in your Google Account permissions and rerun the setup.');
      }

      writeFileSync(tokenPath, `${tokens.refresh_token}\n`, { mode: 0o600 });
      chmodSync(tokenPath, 0o600);
      response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Google Drive authorization is complete. You can close this page.');
      resolve();
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Could not complete Google Drive authorization. Check the setup terminal for a safe error message.');
      reject(error.message.startsWith('Google did not issue a refresh token.')
        ? error
        : new Error('Could not exchange the OAuth authorization code.'));
    }
  });
});

const timeout = setTimeout(() => {
  server.close();
  console.error('OAuth setup timed out. Run the command again to retry.');
  process.exitCode = 1;
}, 5 * 60 * 1000);

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(Number(redirectUri.port), redirectUri.hostname, resolve);
  });

  const authorizationUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GOOGLE_DRIVE_SCOPE],
    state
  });
  console.log('Open this URL in a browser and authorize the Google account that owns the Drive folder:');
  console.log(authorizationUrl);
  console.log('Waiting for the local OAuth callback. The refresh token will be written to an ignored local file, not printed.');
  await callbackResult;
  console.log(`Authorization complete. Refresh token saved locally to ${tokenPath}. Copy it securely into Railway as GOOGLE_OAUTH_REFRESH_TOKEN.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  server.close();
}
