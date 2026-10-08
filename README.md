# CUST Sports Week Management System

A role-based platform for managing faculty access, coordinator assignments, sports, player rosters, Excel imports, sheet submissions, term archives, victory badges, reminders, announcements, and notifications.

## Project structure

- `frontend/` — React 19 and Vite application
- `backend/` — Express 5 API, MongoDB connection, authentication, and data operations

## Configuration

For local development, the backend reads MongoDB settings from `MONGODB_URI` or from `info.env` at the project root. Configure:

- `MONGODB_URI` — MongoDB Atlas or self-managed MongoDB connection string
- `MONGODB_DATABASE` — database name (defaults to `cust_sports_week`)
- `SUPER_ADMIN_EMAIL` — defaults to `admin@cust.edu.pk`
- `SUPER_ADMIN_PASSWORD` — required the first time the fresh database is initialized
- `JWT_SECRET` — long random signing secret
- `PORT` — API port (defaults to `4000`)
- `FRONTEND_URL` — allowed frontend origin for production API requests

Keep `info.env` private. It is excluded from Git. Do not put credentials in frontend files or commit them.

On first start, the backend creates only the Super Admin account and the 19 standard sports. Additional HOD and teacher accounts are created in the website by the Super Admin. Existing local SQLite records are not imported.

## Run locally

```bash
npm install
npm run dev
```

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`

For a production-style local run:

```bash
npm run build
npm start
```

Then open `http://localhost:4000`.

## Deploy to Vercel and Render

Deploy the `frontend/` directory as the Vercel project root. Use `npm run build` as the build command and `dist` as the output directory. Set the Vercel environment variable `VITE_API_URL` to the public Render API URL followed by `/api` (for example, `https://your-service.onrender.com/api`). `frontend/vercel.json` provides client-side route rewrites.

Deploy the repository root as a Render Blueprint using `render.yaml`. Set the secret environment variables `MONGODB_URI`, `JWT_SECRET`, `SUPER_ADMIN_PASSWORD`, and `FRONTEND_URL` in Render. Set `FRONTEND_URL` to the Vercel site’s exact origin, without a trailing slash. The MongoDB Atlas network access rules must allow the Render service to connect.

Render’s local filesystem is ephemeral on the free plan. Uploaded announcement and reminder attachments stored under `uploads/` will not survive service restarts or redeploys unless persistent storage or external object storage is configured.

## Google Drive Excel synchronization

MongoDB remains the source of truth. Each MongoDB `sheets` document gets one `.xlsx` file in the configured Google Drive folder. The file is rebuilt from its related MongoDB `student_records` after adds, edits, deletes, imports, and retries. Failed Google Drive API calls leave MongoDB data intact; retry synchronization from the player-sheet detail page.

To enable synchronization:

1. In Google Cloud, enable the Google Drive API, configure the OAuth consent screen, and create an OAuth client ID. Use a **Web application** client and add this exact authorized redirect URI: `http://localhost:4317/oauth2/callback`.
2. Add the OAuth client ID, client secret, and redirect URI to your local PowerShell environment. Do not put secrets in source files:

   ```powershell
   $env:GOOGLE_OAUTH_CLIENT_ID = "your-client-id"
   $env:GOOGLE_OAUTH_CLIENT_SECRET = "your-client-secret"
   $env:GOOGLE_OAUTH_REDIRECT_URI = "http://localhost:4317/oauth2/callback"
   npm run google:oauth --workspace backend
   ```

3. Open the authorization URL printed by the setup command and sign in as the Google account that owns the Drive folder. The script receives the callback locally and writes the refresh token to `.google-oauth-refresh-token` in the repository root. It does not print the token; that file is ignored by Git. Copy its contents securely into Railway as `GOOGLE_OAUTH_REFRESH_TOKEN`.
4. Configure the Railway backend variables `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_OAUTH_REFRESH_TOKEN`, and `GOOGLE_DRIVE_FOLDER_ID`. Keep the folder ID set to `145XJbOAl-zTeOzA3xsJ3qUGKWnPO49Yo`.
5. Redeploy/restart the backend after setting the variables. The backend uses the refresh token to obtain access tokens automatically; it does not require an interactive sign-in on server startup.

The backend and setup URL use the Google Drive `https://www.googleapis.com/auth/drive` OAuth scope so the application can create and update Excel files in the existing folder. After changing the scope, complete a new OAuth authorization with `npm run google:oauth --workspace backend` and install the newly generated refresh token in Railway; a token issued before the scope change does not grant the new permission. For an external OAuth consent screen, publish the app as required: refresh tokens for an app left in Testing mode can expire after seven days. Never commit the client secret, refresh token, `.google-oauth-refresh-token`, or OAuth credential files.

Generated Excel files are shared as **Anyone with the link — Viewer**, preserving the existing link-access behavior. Anyone who obtains a file URL can see its student rows, including contact numbers. Do not store passwords or other credentials in player records. Keep all Google OAuth secrets on the backend and out of frontend configuration, `info.env`, and Git.

## Excel columns

Player imports recognize: `Student Name`, `Registration Number`, `Department`, `Semester`, `Section`, `Contact Number`, and `Position`.
