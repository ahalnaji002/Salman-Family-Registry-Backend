# 👨‍👩‍👧‍👦 Salman Family Registry — Backend

**English** | [العربية](README.ar.md)

## Overview
REST API for the Salman Family Registry, handling authentication, access control, household records, system settings, Excel exports, and database backups.

## Features
- JWT authentication and password changes. The API implements verification-code generation, validation, and password reset; automated SMS delivery is planned but not connected yet. The current frontend directs users to WhatsApp support for password recovery.
- Role-based access for administrators and family heads, plus supervisor role and permission management. Current `/api/admin` routes require the `admin` role.
- Family, housing, wives, children, married daughters, and special-case records.
- Profile image uploads, administrator management, Excel exports, and database backups.
- Soft deletion and restoration of family records.

## Tech Stack
- **Backend:** Node.js, Express 5.
- **Database:** MySQL with mysql2 and Knex.js for migrations, seeds, and queries.
- **Security:** JSON Web Token and bcryptjs.
- **Utilities:** Multer, ExcelJS, dotenv.
- **Frontend:** Separate React application ([Frontend repository](https://github.com/ahalnaji002/Salman-Family-Registry-Frontend)).

## Project Structure
High-level overview of the main directories and configuration files:

```text
backend/
├── backups/
├── database/
│   ├── migrations/
│   └── seeds/
├── scripts/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── uploads/
│   │   └── family-photos/
│   ├── utils/
│   ├── validators/
│   ├── app.js
│   └── server.js
├── .env.example
├── knexfile.js
├── package.json
├── README.md
└── README.ar.md
```

API route groups: `/api/auth`, `/api/family`, `/api/admin`, and `/uploads`. Protected routes use `Authorization: Bearer <token>`.

## Getting Started
Requires Node.js, npm, and MySQL. Backups also require `mysqldump`.

```bash
npm install
cp .env.example .env
```

Configure `.env` with `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, and `JWT_EXPIRES_IN`. Never commit secrets.

```bash
npm run migrate
npm run seed  # Development only: includes a seeded admin account with fixed credentials
npm run dev
```

For production, run `npm start`. Do not use the development seed administrator in production. An administrator account can be created with `node scripts/createAdmin.js` after setting `ADMIN_FULL_NAME`, `ADMIN_NATIONAL_ID`, `ADMIN_PHONE`, and `ADMIN_PASSWORD` in the environment. The script does not load `.env` itself; ensure those variables and database settings are available to the process.

## Verification and Database Maintenance
There is no dedicated automated `test` script in the current `package.json`. To inspect migration status, run:

```bash
npm run migrate:status
```

`npm run migrate` applies migrations and `npm run migrate:rollback` reverses a migration batch; both modify the database and are not test commands. Use them only when appropriate, with backups and a suitable environment. After starting the server, check `GET /api/health`.

## Documentation
- [Arabic README](README.ar.md)
- [Frontend repository](https://github.com/ahalnaji002/Salman-Family-Registry-Frontend)
- [Environment template](.env.example)
- **Deployment:** Use a strong `JWT_SECRET`, secure MySQL credentials, persistent storage for uploads and backups, and `MYSQLDUMP_PATH` when needed. The password-recovery API currently returns `development_code` in its response; remove or restrict this development-only behavior before exposing the recovery endpoints in production. Automated SMS sending is not yet integrated.
