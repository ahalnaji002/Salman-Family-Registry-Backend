# Salman Family Registry — Backend

[العربية](#العربية) · [English](#english)

## العربية

## نظرة عامة

خادم REST API لنظام سجل عائلة سلمان. يدير المصادقة والصلاحيات وسجلات الأسر وإعدادات النظام والتصدير والنسخ الاحتياطي، ويخزن البيانات في MySQL.

## الميزات

- تسجيل المستخدمين وتسجيل الدخول باستخدام JWT.
- تغيير كلمة المرور ومسار استعادتها والتحقق من الرمز.
- صلاحيات منفصلة للأدمن ورب الأسرة.
- إدارة بيانات الأسرة والسكن والزوجات والأبناء والبنات المتزوجات والحالات الخاصة.
- رفع الصورة الشخصية لرب الأسرة.
- إدارة الأسر والمشرفين وإعدادات التسجيل والتعديل.
- تصدير السجلات إلى ملفات Excel.
- إنشاء نسخ احتياطية لقاعدة البيانات.
- حذف الأسر منطقيًا مع إمكانية الاستعادة من لوحة الإدارة.

## التقنيات والاعتماديات

- Node.js وExpress 5
- MySQL 2
- Knex.js للمخطط والاستعلامات والترحيلات
- JSON Web Token للمصادقة
- bcryptjs لتشفير كلمات المرور
- Multer لرفع الصور
- ExcelJS لتصدير البيانات
- dotenv لإدارة متغيرات البيئة

## متطلبات التشغيل

- Node.js وnpm.
- خادم MySQL.
- أداة `mysqldump` عند استخدام ميزة النسخ الاحتياطي.

## الإعداد

ثبّت الاعتماديات:

```bash
npm install
```

انسخ `.env.example` إلى `.env` وعدّل القيم حسب بيئتك:

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

لا ترفع ملف `.env` أو أي قيمة سرية إلى المستودع.

## قاعدة البيانات

نفّذ الترحيلات ثم البيانات الأولية:

```bash
npm run migrate
npm run seed
```

يمكن إنشاء حساب أدمن عبر السكربت الموجود في `scripts/createAdmin.js` بعد ضبط المتغيرات المطلوبة في البيئة.

## التشغيل

بيئة التطوير:

```bash
npm run dev
```

بيئة الإنتاج:

```bash
npm start
```

بعد التشغيل يمكن فحص حالة الخادم عبر:

```text
GET /api/health
```

## مجموعات مسارات الـAPI

- `/api/auth` التسجيل والدخول وإدارة كلمة المرور.
- `/api/family` بيانات رب الأسرة وأفراد الأسرة والسكن.
- `/api/admin` الإحصاءات وإدارة الأسر والمشرفين والإعدادات والتصدير والنسخ الاحتياطي.
- `/uploads` الوصول إلى الصور المرفوعة.

المسارات المحمية تتطلب الترويسة التالية:

```text
Authorization: Bearer <token>
```

## أوامر قاعدة البيانات

```bash
npm run migrate           # تطبيق آخر الترحيلات
npm run migrate:status    # عرض حالة الترحيلات
npm run migrate:rollback  # التراجع عن آخر مجموعة ترحيلات
npm run seed              # إدخال البيانات الأولية
```

## ملاحظات النشر

- استخدم قيمة قوية وفريدة لـ`JWT_SECRET`.
- اضبط بيانات اتصال MySQL كمتغيرات بيئة في منصة الاستضافة.
- تأكد من وجود تخزين دائم لمجلد الصور المرفوعة.
- اضبط `MYSQLDUMP_PATH` إذا لم تكن أداة `mysqldump` متاحة ضمن مسار النظام.

---

## English

### Project Overview

The REST API for the Salman Family Registry. It manages authentication, authorization, family records, system settings, exports, and database backups using MySQL for persistence.

### Features

- JWT-based account registration and authentication.
- Password change and password-recovery workflow with code verification.
- Separate administrator and family-head roles.
- Family, housing, wife, child, married-daughter, and special-case records.
- Family-head profile photo uploads.
- Family, supervisor, registration, and editing administration.
- Excel data exports.
- Database backup generation.
- Soft deletion and restoration of family records.

### Dependencies

- Node.js and Express 5
- MySQL 2
- Knex.js for queries, migrations, and seeds
- JSON Web Token for authentication
- bcryptjs for password hashing
- Multer for image uploads
- ExcelJS for spreadsheet exports
- dotenv for environment configuration

### Requirements

- Node.js and npm.
- A MySQL server.
- The `mysqldump` utility when using database backups.

### Setup

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

### Database

Run migrations and seed the initial data:

```bash
npm run migrate
npm run seed
```

An administrator account can be created with `scripts/createAdmin.js` after setting its required environment variables.

### Running the Server

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

### API Route Groups

- `/api/auth` registration, authentication, and password management.
- `/api/family` family-head, household member, and housing records.
- `/api/admin` statistics, families, supervisors, settings, exports, and backups.
- `/uploads` uploaded image access.

Protected routes require the following header:

```text
Authorization: Bearer <token>
```

### Database Scripts

```bash
npm run migrate           # Apply pending migrations
npm run migrate:status    # Show migration status
npm run migrate:rollback  # Roll back the latest migration batch
npm run seed              # Insert initial data
```

### Deployment Notes

- Use a strong, unique `JWT_SECRET`.
- Configure MySQL credentials through the hosting platform's environment variables.
- Use persistent storage for uploaded images.
- Set `MYSQLDUMP_PATH` if `mysqldump` is not available on the system path.
