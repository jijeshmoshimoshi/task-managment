import http from 'http';
import url from 'url';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env from root and current folder
const rootEnvPath = path.resolve(process.cwd(), '.env');
const rootMonorepoEnvPath = path.resolve(process.cwd(), '../../.env');

if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });
if (fs.existsSync(rootMonorepoEnvPath)) dotenv.config({ path: rootMonorepoEnvPath });

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment variables.');
  process.exit(1);
}
const port = 3000;
const redirectUri = `http://localhost:${port}/oauth2callback`;

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar.events'],
  prompt: 'consent',
});

console.log('\n======================================================');
console.log('🔑 TASKMASTER GOOGLE CALENDAR TOKEN GENERATOR');
console.log('======================================================\n');
console.log('👉 Step 1: In Google Cloud Console, ensure Authorized Redirect URIs contains:');
console.log(`   http://localhost:${port}/oauth2callback\n`);
console.log('👉 Step 2: Open the link below in your browser to authorize:\n');
console.log(`   \x1b[36m${authUrl}\x1b[0m\n`);
console.log('Waiting for authorization callback on http://localhost:3000/oauth2callback ...\n');

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = url.parse(req.url || '', true);
    if (reqUrl.pathname === '/oauth2callback') {
      const code = reqUrl.query.code as string;
      if (code) {
        const { tokens } = await oauth2Client.getToken(code);
        const refreshToken = tokens.refresh_token;

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1 style="color: #16a34a;">✅ Google Calendar Authorization Successful!</h1>
            <p style="font-size: 18px;">Your <strong>GOOGLE_REFRESH_TOKEN</strong> has been generated and saved to your .env file.</p>
            <p>You can close this tab now and return to your terminal.</p>
          </div>
        `);

        console.log('======================================================');
        console.log('✅ REFRESH TOKEN GENERATED SUCCESSFULLY!');
        console.log('======================================================');
        console.log(`\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`);

        // Save directly to .env files
        const pathsToUpdate = [rootEnvPath, rootMonorepoEnvPath].filter((p) => fs.existsSync(p));
        for (const envFile of pathsToUpdate) {
          let envContent = fs.readFileSync(envFile, 'utf8');
          if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
            envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=.*/, `GOOGLE_REFRESH_TOKEN=${refreshToken}`);
          } else {
            envContent += `\nGOOGLE_REFRESH_TOKEN=${refreshToken}`;
          }
          fs.writeFileSync(envFile, envContent, 'utf8');
          console.log(`🎉 Updated: ${envFile}`);
        }

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 1000);
      }
    }
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>Error: ${err.message}</h1>`);
    console.error('❌ Authorization Error:', err.message);
  }
});

server.listen(port);
