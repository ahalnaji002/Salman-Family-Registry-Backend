# 👨‍👩‍👧‍👦  سجل عائلة سلمان — الواجهة الخلفية

[English](README.md) | **العربية**

## نبذة عن المشروع
خادم REST API لنظام سجل عائلة سلمان، مسؤول عن المصادقة والصلاحيات وسجلات الأسر وإعدادات النظام والتصدير إلى Excel والنسخ الاحتياطي لقاعدة البيانات.

## المميزات
- المصادقة باستخدام JWT وتغيير كلمة المرور واستعادتها باستخدام رمز تحقق.
- فصل صلاحيات الأدمن ورب الأسرة.
- إدارة بيانات الأسرة والسكن والزوجات والأبناء والبنات المتزوجات والحالات الخاصة.
- رفع الصور الشخصية وإدارة المشرفين والتصدير والنسخ الاحتياطي.
- الحذف المنطقي لسجلات الأسر وإمكانية استعادتها.

## التقنيات المستخدمة
- **الواجهة الخلفية:** Node.js، Express 5.
- **قاعدة البيانات:** MySQL، mysql2، Knex.js للاستعلامات والترحيلات والبيانات الأولية.
- **الأمان:** JSON Web Token وbcryptjs.
- **أدوات إضافية:** Multer، ExcelJS، dotenv.
- **الواجهة الأمامية:** تطبيق React مستقل ([مستودع Frontend](https://github.com/ahalnaji002/Salman-Family-Registry-Frontend)).

## هيكلية المشروع
نظرة عامة على المجلدات الأساسية وملفات التشغيل والإعدادات دون سرد الملفات الداخلية:

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

مجموعات مسارات API: `/api/auth` و`/api/family` و`/api/admin` و`/uploads`. تتطلب المسارات المحمية `Authorization: Bearer <token>`.

## التشغيل المحلي
يتطلب Node.js وnpm وMySQL، كما تتطلب ميزة النسخ الاحتياطي أداة `mysqldump`.

```bash
npm install
cp .env.example .env
```

اضبط ملف `.env` باستخدام `PORT` و`DB_HOST` و`DB_PORT` و`DB_USER` و`DB_PASSWORD` و`DB_NAME` و`JWT_SECRET` و`JWT_EXPIRES_IN`. لا ترفع أسرار التشغيل إلى GitHub.

```bash
npm run migrate
npm run seed
npm run dev
```

للإنتاج استخدم `npm start`. يمكن إنشاء حساب أدمن من خلال `scripts/createAdmin.js` بعد ضبط متغيرات البيئة المطلوبة.

## الاختبارات والتحقق
لا يتضمن `package.json` الحالي أمر `test` مستقلًا. تشمل أوامر قاعدة البيانات والتحقق المتاحة:

```bash
npm run migrate:status
npm run migrate
npm run migrate:rollback
```

**تنبيه:** أوامر الترحيل والتراجع تغيّر قاعدة البيانات؛ استخدمها على قاعدة تطوير مناسبة فقط. بعد تشغيل الخادم يمكن فحص `GET /api/health`.

## التوثيق
- [النسخة الإنجليزية](README.md)
- [مستودع الواجهة الأمامية](https://github.com/ahalnaji002/Salman-Family-Registry-Frontend)
- [نموذج متغيرات البيئة](.env.example)
- **النشر:** استخدم قيمة قوية لـ`JWT_SECRET`، واحمِ بيانات اتصال MySQL، ووفر تخزينًا دائمًا للصور، واضبط `MYSQLDUMP_PATH` عند الحاجة.
