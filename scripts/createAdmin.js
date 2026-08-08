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

    if (!/^\d{9}$/.test(nationalId)) {
      throw new Error(
        "رقم هوية الأدمن يجب أن يتكون من 9 أرقام.",
      );
    }

    if (!/^05\d{8}$/.test(phone)) {
      throw new Error(
        "رقم جوال الأدمن غير صحيح.",
      );
    }

    if (password.length < 8) {
      throw new Error(
        "كلمة مرور الأدمن يجب ألا تقل عن 8 خانات.",
      );
    }

    const adminRole = await db("roles")
      .where({ name: "admin" })
      .first();

    if (!adminRole) {
      throw new Error(
        'دور "admin" غير موجود في جدول roles.',
      );
    }

    const existingUser = await db("users")
      .where({ national_id: nationalId })
      .first();

    if (existingUser) {
      throw new Error(
        "يوجد مستخدم مسجل مسبقًا بنفس رقم الهوية.",
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      12,
    );

    const userId = await db.transaction(
      async (trx) => {
        const [newUserId] = await trx(
          "users",
        ).insert({
          full_name: fullName.trim(),
          national_id: nationalId,
          phone: phone,
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
      },
    );

    console.log("");
    console.log("✅ تم إنشاء حساب الأدمن بنجاح.");
    console.log(`Admin ID: ${userId}`);
    console.log(`الاسم: ${fullName}`);
    console.log(`رقم الهوية: ${nationalId}`);
    console.log("");
  } catch (error) {
    console.error("");
    console.error(
      "❌ تعذر إنشاء حساب الأدمن:",
      error.message,
    );
    console.error("");
  } finally {
    await db.destroy();
  }
};

createAdmin();