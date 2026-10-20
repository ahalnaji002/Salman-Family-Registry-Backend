# 👨‍👩‍👧‍👦 Salman Family Registry — Backend

**English** | [العربية](README.ar.md)

## Overview
REST API for the Salman Family Registry, handling authentication, access control, household records, system settings, Excel exports, and database backups.

## Features
- JWT authentication, password changes, and code-based password recovery.
- Separate administrator and family-head permissions.
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
Verified paths and files:

```text
.
├── src/
│   ├── server.js
│   ├── app.js                  # imported by server.js
│   ├── config/
│   │   └── database           # imported by server.js
│   └── routes/
│       └── authRoutes.js
├── scripts/
│   └── createAdmin.js
├── .env.example
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
npm run seed
npm run dev
```

For production, run `npm start`. An administrator account can be created using `scripts/createAdmin.js` with the required environment settings.

## Testing
There is no dedicated `test` script in the current `package.json`. Available database and runtime checks include:

```bash
npm run migrate:status
npm run migrate
npm run migrate:rollback
```

**Caution:** Migration and rollback commands change the database; run them only against a suitable development database. After starting the server, check `GET /api/health`.

## Documentation
- [Arabic README](README.ar.md)
- [Frontend repository](https://github.com/ahalnaji002/Salman-Family-Registry-Frontend)
- [Environment template](.env.example)
- **Deployment:** Use a strong `JWT_SECRET`, secure MySQL credentials, persistent storage for uploads, and `MYSQLDUMP_PATH` when needed.
