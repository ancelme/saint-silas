
# St. Silas School Management System

This repository contains the St. Silas Private Primary School management system.

## Project structure

- `frontend/` contains the React application, static assets, and Vite configuration.
- `backend/` contains the Express API and PostgreSQL database setup.
- The root `package.json` provides the scripts for both applications.

## Run locally

**Prerequisites:** Node.js

1. Create a PostgreSQL database and set `DATABASE_URL` in `.env` to its connection URL.
2. Install dependencies from the repository root:
   ```powershell
   npm install
   ```
3. Start the application (default port `3000`):
   ```powershell
   npm run dev
   ```
4. Open `http://localhost:3000` in your browser. The backend serves the frontend during development.

If port `3000` is already in use, choose another port:
```powershell
$env:PORT = "3001"
npm run dev
```
Then open `http://localhost:3001`. Press `Ctrl+C` to stop the server.

## Parent accounts and dashboard access

An administrator or owner can create a parent account from **User & Role Mgmt**.
Choose the **Parent / Guardian** role, then select the student or students to
link before saving. New owner, staff, parent, teacher, and pupil profiles
require a JPEG, PNG, or WebP profile photo (maximum 5 MB for accounts and
teachers, or 4 MB for pupil enrollment and admission applications). Parent
payment submissions are linked to a selected pupil and invoice, then remain
pending until school staff verify them. The parent dashboard and student-related
API results are limited to those linked students. Parents can view their linked students'
profiles, attendance, grades, fees, and grade-specific timetable, and can
contact school staff through chat. The pupil directory is read-only for parents;
they cannot enroll pupils or modify school records. Dashboard navigation only
shows modules available to the signed-in role; server routes enforce the same
access rules.

## Teacher assignments, attendance, and reports

When an administrator creates a teacher account in **User & Role Mgmt**, choose
either **Class teacher** and assign one or more classes, or **Subject teacher**
and assign a subject for each class. Assignments can also be updated later from
the Teachers directory. Class teachers manage class-wide attendance and publish
midterm reports. Subject teachers can view pupils only in their assigned classes
and create, edit, or delete marks and attendance records for their assigned
class-subject pairs. Published reports are stored in PostgreSQL and appear in
linked parents' Reports section; parents also receive an in-app message.

## Build for production

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

## Deploy to Render

This project includes a Render Blueprint in `render.yaml`. It connects the Node
web service to a Render PostgreSQL database using `DATABASE_URL`. The database
is configured on Render's free plan, which is temporary and must not be used for
permanent school records. Select a paid PostgreSQL plan in Render for durable
production storage.

1. Push this project to a GitHub or GitLab repository. Keep `.env` files and
   database files out of the repository.
2. In Render, choose **New +** → **Blueprint**, connect the repository, and
   select the branch containing `render.yaml`.
3. Review the Blueprint and create the service and PostgreSQL database. Render generates a
   `JWT_SECRET`; keep it private and do not rotate it after users have logged
   in, because existing sessions use it.
4. Existing records in the former SQLite database are not copied automatically.
   Keep the existing disk and make a backup. After the PostgreSQL-backed service
   is healthy, run `npm run migrate:sqlite` in the Render shell to import the
   SQLite file at `/var/data/st_silas.sqlite`. The migration stops if it finds
   application records already in PostgreSQL, imports in a transaction, skips
   duplicate keys, and does not modify the SQLite source. Review the per-table
   import counts before using the new database. For a local SQLite file, set
   `DATABASE_URL` and run
   `npm run migrate:sqlite -- backend/data/st_silas.sqlite`.
5. Complete owner setup only if the migrated PostgreSQL database has no owner
   account. An empty database makes the site show first-time owner registration
   again; this is separate from a browser sign-in session expiring.
6. Optionally add `GEMINI_API_KEY` in the Render service's environment settings
   to enable Gemini-powered features. Set `APP_URL` to the deployed service URL
   if using integrations that need the public application address.

Back up the PostgreSQL database regularly. Voice recording in browsers
requires HTTPS; Render provides HTTPS on the service URL. The current Render
PostgreSQL `free` plan is temporary and cannot guarantee permanent retention.
Keep verified backups and move to a paid PostgreSQL plan before relying on it
for permanent school records. Authentication uses a server-issued HttpOnly
cookie that expires after 30 days; this controls sign-in persistence, not data
retention.

## Deploy to Vercel

Vercel serves the Vite frontend from `frontend/dist` and routes `/api/*` to the
Express handler in `api/[...path].ts`. Add `DATABASE_URL` (the Neon PostgreSQL
connection string) and a strong `JWT_SECRET` to the Vercel project's Production
environment variables, then deploy the `main` branch. The `/api` routes require
those variables at runtime. Vercel Functions do not host the Socket.IO server,
so realtime chat sockets require a separate WebSocket-capable service.

### Running without internet

The app requires a reachable PostgreSQL database. Install dependencies with
`npm install` while online before disconnecting; startup does not need internet
once the dependencies are present. Gemini AI, Google Maps, Google Fonts, and
remotely hosted Unsplash photos do require internet and will be unavailable or
use font/image fallbacks while offline.
"# st-slas" 
"# st-slas" 
"# saint" 
"# saint" 
"# st-slas" 
"# saint-silas" 
