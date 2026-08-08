const bcrypt = require("bcryptjs");
const db = require("../src/config/database");

const createAdmin = async () => {
  try {
    const fullName = process.env.ADMIN_FULL_NAME;
    const nationalId = process.env.ADMIN_NATIONAL_ID;
    const phone = process.env.ADMIN_PHONE;
    const password = process.env.ADMIN_PASSWORD;

    if (!fullName || !nationalId || !phone || !password) {
      throw new Error(
        "ADMIN_FULL_NAME و ADMIN_NATIONAL_ID و ADMIN_PHONE و ADMIN_PASSWORD مطلوبة.",
      );
    }

    const normalizedNationalId = String(nationalId).trim();
    const normalizedPhone = String(phone).trim();

    if (!/^\d{9}$/.test(normalizedNationalId)) {
      throw new Error("رقم هوية الأدمن يجب أن يتكون من 9 أرقام.");
    }

    if (!/^05\d{8}$/.test(normalizedPhone)) {
      throw new Error("رقم جوال الأدمن غير صحيح.");
    }

    if (password.length < 8) {
      throw new Error("كلمة مرور الأدمن يجب ألا تقل عن 8 خانات.");
    }

    const adminRole = await db("roles").where({ name: "admin" }).first();

    if (!adminRole) {
      throw new Error('دور "admin" غير موجود في جدول roles.');
    }

    // يمنع وجود أكثر من Admin فعال في نفس الوقت
    const existingAdmin = await db("user_roles")
      .join("users", "user_roles.user_id", "users.id")
      .where({
        "user_roles.role_id": adminRole.id,
        "user_roles.is_active": true,
        "users.is_active": true,
      })
      .select("users.id", "users.full_name", "users.national_id")
      .first();

    if (existingAdmin) {
      throw new Error(
        `يوجد حساب أدمن فعال بالفعل باسم "${existingAdmin.full_name}"، ولا يمكن إنشاء أكثر من أدمن في نفس الوقت.`,
      );
    }

    // فحص جدول users
    const existingUser = await db("users")
      .where({
        national_id: normalizedNationalId,
      })
      .first();

    if (existingUser) {
      throw new Error("يوجد مستخدم مسجل مسبقًا بنفس رقم الهوية.");
    }

    // فحص الهوية على مستوى النظام كامل
    const nationalIdChecks = [
      {
        table: "families",
        label: "رب أسرة",
      },
      {
        table: "wives",
        label: "زوجة",
      },
      {
        table: "children",
        label: "ابن/ابنة",
      },
      {
        table: "married_daughters",
        label: "بنت متزوجة",
      },
    ];

    for (const check of nationalIdChecks) {
      const existing = await db(check.table)
        .where({
          national_id: normalizedNationalId,
        })
        .select("id")
        .first();

      if (existing) {
        throw new Error(`رقم الهوية مسجل مسبقًا في النظام كـ ${check.label}.`);
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userId = await db.transaction(async (trx) => {
      const [newUserId] = await trx("users").insert({
        full_name: fullName.trim(),
        national_id: normalizedNationalId,
        phone: normalizedPhone,
        password_hash: passwordHash,
        is_active: true,
      });

      await trx("user_roles").insert({
        user_id: newUserId,
        role_id: adminRole.id,
        assigned_by: null,
        is_active: true,
      });

      return newUserId;
    });

    console.log("");
    console.log("✅ تم إنشاء حساب الأدمن بنجاح.");
    console.log(`Admin ID: ${userId}`);
    console.log(`الاسم: ${fullName.trim()}`);
    console.log(`رقم الهوية: ${normalizedNationalId}`);
    console.log("");
  } catch (error) {
    console.error("");
    console.error("❌ تعذر إنشاء حساب الأدمن:", error.message);
    console.error("");
  } finally {
    await db.destroy();
  }
};

createAdmin();
