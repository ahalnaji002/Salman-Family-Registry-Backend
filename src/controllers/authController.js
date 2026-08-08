const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/database");

const register = async (req, res) => {
  const { full_name, national_id, phone, password } = req.body;

  if (!full_name || !national_id || !phone || !password) {
    return res.status(400).json({
      message: "يرجى تعبئة جميع الحقول المطلوبة.",
    });
  }

  const normalizedFullName = String(full_name).trim();
  const normalizedNationalId = String(national_id).trim();
  const normalizedPhone = String(phone).trim();

  if (!normalizedFullName) {
    return res.status(400).json({
      message: "الاسم الرباعي مطلوب.",
    });
  }

  if (!/^\d{9}$/.test(normalizedNationalId)) {
    return res.status(400).json({
      message: "رقم الهوية يجب أن يتكون من 9 أرقام.",
    });
  }

  if (!normalizedPhone) {
    return res.status(400).json({
      message: "رقم الجوال مطلوب.",
    });
  }

  if (String(password).length < 8) {
    return res.status(400).json({
      message: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
    });
  }

  try {
    const existingUserByNationalId = await db("users")
      .where({
        national_id: normalizedNationalId,
      })
      .first();

    if (existingUserByNationalId) {
      return res.status(409).json({
        message: "رقم الهوية مسجل مسبقًا.",
      });
    }

    const familyHeadRole = await db("roles")
      .where({
        name: "family_head",
      })
      .first();

    if (!familyHeadRole) {
      return res.status(500).json({
        message: "دور رب الأسرة غير موجود في النظام.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.transaction(async (trx) => {
      const [userId] = await trx("users").insert({
        full_name: normalizedFullName,
        national_id: normalizedNationalId,
        phone: normalizedPhone,
        password_hash: passwordHash,
        is_active: true,
      });

      await trx("user_roles").insert({
        user_id: userId,
        role_id: familyHeadRole.id,
        assigned_by: null,
        is_active: true,
      });

      const [familyId] = await trx("families").insert({
        user_id: userId,
        full_name: normalizedFullName,
        national_id: normalizedNationalId,
        date_of_birth: null,
        phone: normalizedPhone,
        blood_type: null,
        marital_status: null,
        income_category: null,
        work_status: null,
        job_type: null,
        other_job_type: null,
        personal_photo_path: null,
        form_status: "draft",
        editing_enabled: true,
        submitted_at: null,
        created_by: userId,
        updated_by: userId,
      });

      return {
        userId,
        familyId,
      };
    });

    const token = jwt.sign(
      {
        userId: result.userId,
        role: "family_head",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    return res.status(201).json({
      message: "تم إنشاء الحساب بنجاح.",
      data: {
        user: {
          id: result.userId,
          full_name: normalizedFullName,
          national_id: normalizedNationalId,
          phone: normalizedPhone,
          role: "family_head",
        },
        family: {
          id: result.familyId,
          form_status: "draft",
          editing_enabled: true,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "رقم الهوية أو رقم الجوال مسجل مسبقًا.",
      });
    }

    return res.status(500).json({
      message: "حدث خطأ أثناء إنشاء الحساب.",
    });
  }
};

const login = async (req, res) => {
  const { national_id, password } = req.body;

  if (!national_id || !password) {
    return res.status(400).json({
      message: "رقم الهوية وكلمة المرور مطلوبان.",
    });
  }

  try {
    const user = await db("users").where({ national_id }).first();

    if (!user) {
      return res.status(401).json({
        message: "رقم الهوية أو كلمة المرور غير صحيحة.",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        message: "هذا الحساب غير فعال.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "رقم الهوية أو كلمة المرور غير صحيحة.",
      });
    }

    const role = await db("user_roles")
      .join("roles", "user_roles.role_id", "roles.id")
      .where("user_roles.user_id", user.id)
      .where("user_roles.is_active", true)
      .select("roles.name")
      .first();

    if (!role) {
      return res.status(403).json({
        message: "لا يوجد دور فعال لهذا المستخدم.",
      });
    }

    const family = await db("families")
      .where({ user_id: user.id })
      .whereNull("deleted_at")
      .select("id", "form_status", "editing_enabled")
      .first();

    await db("users").where({ id: user.id }).update({
      last_login_at: db.fn.now(),
    });

    const token = jwt.sign(
      {
        userId: user.id,
        role: role.name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    return res.status(200).json({
      message: "تم تسجيل الدخول بنجاح.",
      data: {
        user: {
          id: user.id,
          full_name: user.full_name,
          national_id: user.national_id,
          phone: user.phone,
          role: role.name,
        },
        family: family
          ? {
              id: family.id,
              form_status: family.form_status,
              editing_enabled: Boolean(family.editing_enabled),
            }
          : null,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تسجيل الدخول.",
    });
  }
};

const me = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "form_status", "editing_enabled", "submitted_at")
      .first();

    return res.status(200).json({
      message: "تم جلب بيانات المستخدم بنجاح.",
      data: {
        user: {
          id: req.user.id,
          full_name: req.user.full_name,
          national_id: req.user.national_id,
          phone: req.user.phone,
          role: req.user.role,
        },
        family: family
          ? {
              id: family.id,
              form_status: family.form_status,
              editing_enabled: Boolean(family.editing_enabled),
              submitted_at: family.submitted_at,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب بيانات المستخدم.",
    });
  }
};

const changePassword = async (req, res) => {
  const { current_password, new_password, new_password_confirmation } =
    req.body;

  if (!current_password || !new_password || !new_password_confirmation) {
    return res.status(400).json({
      message: "يرجى تعبئة جميع الحقول المطلوبة.",
    });
  }

  if (new_password.length < 8) {
    return res.status(400).json({
      message: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.",
    });
  }

  if (new_password !== new_password_confirmation) {
    return res.status(400).json({
      message: "تأكيد كلمة المرور غير مطابق.",
    });
  }

  if (current_password === new_password) {
    return res.status(400).json({
      message: "كلمة المرور الجديدة يجب أن تختلف عن الحالية.",
    });
  }

  try {
    const user = await db("users")
      .where({ id: req.user.id })
      .select("id", "password_hash")
      .first();

    if (!user) {
      return res.status(404).json({
        message: "المستخدم غير موجود.",
      });
    }

    const currentPasswordMatches = await bcrypt.compare(
      current_password,
      user.password_hash,
    );

    if (!currentPasswordMatches) {
      return res.status(401).json({
        message: "كلمة المرور الحالية غير صحيحة.",
      });
    }

    const newPasswordHash = await bcrypt.hash(new_password, 12);

    await db("users").where({ id: user.id }).update({
      password_hash: newPasswordHash,
      updated_at: db.fn.now(),
    });

    return res.status(200).json({
      message: "تم تغيير كلمة المرور بنجاح.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تغيير كلمة المرور.",
    });
  }
};

const forgotPassword = async (req, res) => {
  const { national_id } = req.body;

  if (!national_id) {
    return res.status(400).json({
      message: "رقم الهوية مطلوب.",
    });
  }

  if (!/^\d{9}$/.test(String(national_id))) {
    return res.status(400).json({
      message: "رقم الهوية يجب أن يتكون من 9 أرقام.",
    });
  }

  try {
    const user = await db("users")
      .where({ national_id })
      .select("id", "full_name", "phone", "is_active")
      .first();

    if (!user || !user.is_active) {
      return res.status(404).json({
        message: "لا يوجد حساب فعال مرتبط برقم الهوية.",
      });
    }

    const verificationCode = String(crypto.randomInt(100000, 1000000));

    const codeHash = await bcrypt.hash(verificationCode, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const verificationId = await db.transaction(async (trx) => {
      await trx("verification_codes")
        .where({
          user_id: user.id,
          purpose: "password_reset",
          is_active: true,
        })
        .update({
          is_active: false,
          updated_at: trx.fn.now(),
        });

      const [id] = await trx("verification_codes").insert({
        user_id: user.id,
        code_hash: codeHash,
        purpose: "password_reset",
        expires_at: expiresAt,
        attempts: 0,
        is_active: true,
      });

      return id;
    });

    return res.status(200).json({
      message: "تم إنشاء رمز استعادة كلمة المرور.",
      data: {
        request_id: verificationId,
        phone: user.phone,
        expires_in_minutes: 10,

        // للتطوير فقط — يجب حذفه عند ربط SMS
        development_code: verificationCode,
      },
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء طلب استعادة كلمة المرور.",
    });
  }
};

const verifyResetCode = async (req, res) => {
  const { request_id, code } = req.body;

  if (!request_id || !code) {
    return res.status(400).json({
      message: "رقم الطلب ورمز التحقق مطلوبان.",
    });
  }

  if (!/^\d{6}$/.test(String(code))) {
    return res.status(400).json({
      message: "رمز التحقق يجب أن يتكون من 6 أرقام.",
    });
  }

  try {
    const verificationRequest = await db("verification_codes")
      .where({
        id: request_id,
        purpose: "password_reset",
        is_active: true,
      })
      .first();

    if (!verificationRequest) {
      return res.status(404).json({
        message: "طلب التحقق غير موجود أو غير فعال.",
      });
    }

    if (verificationRequest.used_at) {
      return res.status(400).json({
        message: "تم استخدام رمز التحقق مسبقًا.",
      });
    }

    if (new Date(verificationRequest.expires_at) < new Date()) {
      await db("verification_codes").where({ id: request_id }).update({
        is_active: false,
        updated_at: db.fn.now(),
      });

      return res.status(400).json({
        message: "انتهت صلاحية رمز التحقق.",
      });
    }

    if (verificationRequest.attempts >= 5) {
      await db("verification_codes").where({ id: request_id }).update({
        is_active: false,
        updated_at: db.fn.now(),
      });

      return res.status(429).json({
        message: "تم تجاوز عدد المحاولات المسموح بها.",
      });
    }

    const codeMatches = await bcrypt.compare(
      String(code),
      verificationRequest.code_hash,
    );

    if (!codeMatches) {
      await db("verification_codes")
        .where({ id: request_id })
        .increment("attempts", 1)
        .update({
          updated_at: db.fn.now(),
        });

      return res.status(400).json({
        message: "رمز التحقق غير صحيح.",
      });
    }

    await db("verification_codes").where({ id: request_id }).update({
      verified_at: db.fn.now(),
      updated_at: db.fn.now(),
    });

    const resetToken = jwt.sign(
      {
        verificationId: verificationRequest.id,
        userId: verificationRequest.user_id,
        purpose: "password_reset",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "15m",
      },
    );

    return res.status(200).json({
      message: "تم التحقق من الرمز بنجاح.",
      data: {
        reset_token: resetToken,
        expires_in_minutes: 15,
      },
    });
  } catch (error) {
    console.error("Verify reset code error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء التحقق من الرمز.",
    });
  }
};

const resetPassword = async (req, res) => {
  const { reset_token, new_password, new_password_confirmation } = req.body;

  if (!reset_token || !new_password || !new_password_confirmation) {
    return res.status(400).json({
      message: "يرجى تعبئة جميع الحقول المطلوبة.",
    });
  }

  if (new_password.length < 8) {
    return res.status(400).json({
      message: "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.",
    });
  }

  if (new_password !== new_password_confirmation) {
    return res.status(400).json({
      message: "تأكيد كلمة المرور غير مطابق.",
    });
  }

  try {
    const decoded = jwt.verify(reset_token, process.env.JWT_SECRET);

    if (decoded.purpose !== "password_reset") {
      return res.status(401).json({
        message: "رمز إعادة التعيين غير صالح.",
      });
    }

    const verificationRequest = await db("verification_codes")
      .where({
        id: decoded.verificationId,
        user_id: decoded.userId,
        purpose: "password_reset",
        is_active: true,
      })
      .first();

    if (!verificationRequest) {
      return res.status(401).json({
        message: "طلب إعادة التعيين غير موجود أو غير فعال.",
      });
    }

    if (!verificationRequest.verified_at) {
      return res.status(400).json({
        message: "يجب التحقق من الرمز أولًا.",
      });
    }

    if (verificationRequest.used_at) {
      return res.status(400).json({
        message: "تم استخدام طلب إعادة التعيين مسبقًا.",
      });
    }

    if (new Date(verificationRequest.expires_at) < new Date()) {
      await db("verification_codes")
        .where({ id: verificationRequest.id })
        .update({
          is_active: false,
          updated_at: db.fn.now(),
        });

      return res.status(400).json({
        message: "انتهت صلاحية طلب إعادة التعيين.",
      });
    }

    const user = await db("users")
      .where({ id: decoded.userId })
      .select("id", "password_hash", "is_active")
      .first();

    if (!user || !user.is_active) {
      return res.status(404).json({
        message: "المستخدم غير موجود أو غير فعال.",
      });
    }

    const sameAsOldPassword = await bcrypt.compare(
      new_password,
      user.password_hash,
    );

    if (sameAsOldPassword) {
      return res.status(400).json({
        message: "كلمة المرور الجديدة يجب أن تختلف عن الحالية.",
      });
    }

    const newPasswordHash = await bcrypt.hash(new_password, 12);

    await db.transaction(async (trx) => {
      await trx("users").where({ id: user.id }).update({
        password_hash: newPasswordHash,
        updated_at: trx.fn.now(),
      });

      await trx("verification_codes")
        .where({ id: verificationRequest.id })
        .update({
          used_at: trx.fn.now(),
          is_active: false,
          updated_at: trx.fn.now(),
        });

      await trx("verification_codes")
        .where({
          user_id: user.id,
          purpose: "password_reset",
          is_active: true,
        })
        .whereNot({ id: verificationRequest.id })
        .update({
          is_active: false,
          updated_at: trx.fn.now(),
        });
    });

    return res.status(200).json({
      message: "تمت إعادة تعيين كلمة المرور بنجاح.",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "انتهت صلاحية رمز إعادة التعيين.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "رمز إعادة التعيين غير صالح.",
      });
    }

    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء إعادة تعيين كلمة المرور.",
    });
  }
};

module.exports = {
  register,
  login,
  me,
  changePassword,
  forgotPassword,
  verifyResetCode,
  resetPassword,
};
