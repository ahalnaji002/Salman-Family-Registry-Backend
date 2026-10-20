# 👨‍👩‍👧‍👦 Salman Family Registry — Backend

**English** | [العربية](README.ar.md)

## Project Overview

The REST API for the Salman Family Registry. It manages authentication, authorization, family records, system settings, exports, and database backups using MySQL for persistence.

## Features

- JWT-based account registration and authentication.
- Password change and password-recovery workflow with code verification.
- Separate administrator and family-head roles.
- Family, housing, wife, child, married-daughter, and special-case records.
- Family-head profile photo uploads.
- Family, supervisor, registration, and editing administration.
- Excel data exports.
- Database backup generation.
- Soft deletion and restoration of family records.

## Dependencies

- Node.js and Express 5
- MySQL 2
- Knex.js for queries, migrations, and seeds
- JSON Web Token for authentication
- bcryptjs for password hashing
- Multer for image uploads
- ExcelJS for spreadsheet exports
- dotenv for environment configuration

## Requirements

- Node.js and npm.
- A MySQL server.
- The `mysqldump` utility when using database backups.

## Setup

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` and configure the environment:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=salman_family_registry

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
```

Never commit `.env` or secret values to the repository.

## Database

Run migrations and seed the initial data:

```bash
npm run migrate
npm run seed
```

An administrator account can be created with `scripts/createAdmin.js` after setting its required environment variables.

## Running the Server

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

Check server health at:

```text
GET /api/health
```

## API Route Groups

- `/api/auth` registration, authentication, and password management.
- `/api/family` family-head, household member, and housing records.
- `/api/admin` statistics, families, supervisors, settings, exports, and backups.
- `/uploads` uploaded image access.

Protected routes require the following header:

```text
Authorization: Bearer <token>
```

## Database Scripts

```bash
npm run migrate           # Apply pending migrations
npm run migrate:status    # Show migration status
npm run migrate:rollback  # Roll back the latest migration batch
npm run seed              # Insert initial data
```

## Deployment Notes

- Use a strong, unique `JWT_SECRET`.
- Configure MySQL credentials through the hosting platform's environment variables.
- Use persistent storage for uploaded images.
- Set `MYSQLDUMP_PATH` if `mysqldump` is not available on the system path.
