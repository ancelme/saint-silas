
# St. Silas School Management System

This repository contains the St. Silas Private Primary School management system.

## Project structure

- `frontend/` contains the React application, static assets, and Vite configuration.
- `backend/` contains the Express API, database files, and the SQLite database.
- The root `package.json` provides the scripts for both applications.

## Run locally

**Prerequisites:** Node.js

1. Install dependencies from the repository root:
   ```powershell
   npm install
   ```
2. Start the application (default port `3000`):
   ```powershell
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser. The backend serves the frontend during development.

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

## Build for production

```powershell
npm run build
$env:NODE_ENV = "production"
npm start
```

## Deploy to Render

This project includes a Render Blueprint in `render.yaml`. It creates a Node web
service with a 1 GB persistent disk for the SQLite database. The Blueprint uses
Render's paid Starter web-service plan because SQLite data on an ephemeral
filesystem can be lost when a service restarts or redeploys.

1. Push this project to a GitHub or GitLab repository. Keep `.env` files and
   database files out of the repository.
2. In Render, choose **New +** → **Blueprint**, connect the repository, and
   select the branch containing `render.yaml`.
3. Review the Blueprint and create the service. Render generates a
   `JWT_SECRET`; keep it private and do not rotate it after users have logged
   in, because existing sessions use it.
4. After deployment, open the service URL and complete the initial owner
   account setup. The SQLite database is stored at `/var/data/st_silas.sqlite`.
5. Optionally add `GEMINI_API_KEY` in the Render service's environment settings
   to enable Gemini-powered features. Set `APP_URL` to the deployed service URL
   if using integrations that need the public application address.

The app uses a single Render web-service instance because its SQLite database
and persistent disk are local to that instance. Do not scale it to multiple
instances. Back up the database regularly from the owner-only system backup
page. Voice recording in browsers requires HTTPS; Render provides HTTPS on the
service URL.

The Render service must have the persistent disk configured at `/var/data` and
`SQLITE_FILE_PATH` set to `/var/data/st_silas.sqlite` for school records and
owner accounts to survive restarts and deployments. A Free Render instance
does not provide this persistent-disk setup; its local SQLite data can be lost,
which can cause the initial owner setup to appear again. Do not treat Free
hosting as permanent storage.

### Running without internet

The app and its SQLite database run locally. Install dependencies with `npm install` while online before disconnecting; startup does not need internet once the dependencies are present. Gemini AI, Google Maps, Google Fonts, and remotely hosted Unsplash photos do require internet and will be unavailable or use font/image fallbacks while offline.
"# st-slas" 
"# st-slas" 
"# saint" 
"# saint" 
"# st-slas" 
"# saint-silas" 
