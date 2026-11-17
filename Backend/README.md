# NGO Connect backend

The API uses Express and PostgreSQL. It owns account passwords, sessions, event data, registrations, and attendance. Passwords are hashed with bcrypt; the browser receives an HTTP-only session cookie. Public signup can create volunteer accounts only. Create NGO Admin accounts through the setup command below.

## 1. Install and prepare PostgreSQL

Install PostgreSQL for Windows, then open PowerShell in this folder. Create the database:

```powershell
psql -U postgres -c "CREATE DATABASE ngo_connect;"
```

If `psql` is not on PATH, run it using the full path from your PostgreSQL `bin` folder.

## 2. Configure the API

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` to your PostgreSQL connection details. Using separate fields avoids URL-encoding issues with passwords. Generate a private signing secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in `JWT_SECRET`. Keep `.env` private; it is ignored by Git. On the first server start, `server.js` runs `db/schema.sql` to create any missing tables and indexes.

## 3. Create the first NGO Admin

From `Backend`, run:

```powershell
npm run create-admin
```

Enter the admin name and email. The command privately prompts for the current PostgreSQL password, checks the connection, applies the schema, and creates the account. It generates a strong admin login password and displays it once at the end. Save that password privately. The command also writes the PostgreSQL connection settings and a JWT secret to `.env`.

## 4. Run the application

In `Backend`:

```powershell
npm run dev
```

In another terminal, in `frontend`:

```powershell
npm run dev
```

The frontend defaults to `http://localhost:5000/api`; set `VITE_API_URL` in `frontend/.env` only if the API uses a different address. The backend expects the frontend at `http://localhost:5173` by default.

## API areas

- `/api/auth`: volunteer signup, login, current session, logout.
- `/api/events`: list events, create/update events, create attendance QR codes, register volunteers, and list event registrations.
- `/api/registrations`: registrations visible to the signed-in volunteer or NGO Admin.
- `/api/events/:eventId/attendance`: validate the current event QR and record a volunteer check-in.
- `/api/health` and `/api/health/database`: API and database health checks.

The test suite runs with `npm test`. It uses `pg-mem` so API behavior can be tested without a running PostgreSQL server; it does not replace a live PostgreSQL connection check.
