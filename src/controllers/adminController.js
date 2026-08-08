const db = require("../config/database");
const bcrypt = require("bcryptjs");
const ExcelJS = require("exceljs");

// Admin Dashboard
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalFamiliesResult,
      draftFamiliesResult,
      submittedFamiliesResult,
      editingEnabledResult,
    ] = await Promise.all([
      db("families").whereNull("deleted_at").count({ count: "id" }).first(),

      db("families")
        .whereNull("deleted_at")
        .where({ form_status: "draft" })
        .count({ count: "id" })
        .first(),

      db("families")
        .whereNull("deleted_at")
        .where({ form_status: "submitted" })
        .count({ count: "id" })
        .first(),

      db("families")
        .whereNull("deleted_at")
        .where({ editing_enabled: true })
        .count({ count: "id" })
        .first(),
    ]);

    return res.status(200).json({
      message: "تم جلب إحصائيات لوحة التحكم بنجاح.",
      data: {
        total_families: Number(totalFamiliesResult.count),
        draft_families: Number(draftFamiliesResult.count),
        submitted_families: Number(submittedFamiliesResult.count),
        editing_enabled_families: Number(editingEnabledResult.count),
      },
    });
  } catch (error) {
    console.error("Dashboard statistics error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب إحصائيات لوحة التحكم.",
    });
  }
};

// Admin Families
const getFamilies = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const offset = (page - 1) * limit;

    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim() || "";
    const editingEnabled = req.query.editing_enabled;

    const allowedStatuses = ["draft", "submitted"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "حالة النموذج غير صحيحة.",
      });
    }

    if (
      editingEnabled !== undefined &&
      !["true", "false"].includes(editingEnabled)
    ) {
      return res.status(400).json({
        message: "قيمة editing_enabled يجب أن تكون true أو false.",
      });
    }

    const baseQuery = db("families")
      .leftJoin("users", "families.user_id", "users.id")
      .whereNull("families.deleted_at");

    if (search) {
      baseQuery.andWhere((queryBuilder) => {
        queryBuilder
          .where("families.full_name", "like", `%${search}%`)
          .orWhere("families.national_id", "like", `%${search}%`)
          .orWhere("families.phone", "like", `%${search}%`);
      });
    }

    if (status) {
      baseQuery.andWhere("families.form_status", status);
    }

    if (editingEnabled !== undefined) {
      baseQuery.andWhere("families.editing_enabled", editingEnabled === "true");
    }

    const countQuery = baseQuery
      .clone()
      .clearSelect()
      .clearOrder()
      .countDistinct({
        count: "families.id",
      })
      .first();

    const familiesQuery = baseQuery
      .clone()
      .select(
        "families.id",
        "families.full_name",
        "families.national_id",
        "families.phone",
        "families.date_of_birth",
        "families.marital_status",
        "families.income_category",
        "families.work_status",
        "families.form_status",
        "families.editing_enabled",
        "families.submitted_at",
        "families.created_at",
        "users.is_active as user_is_active",
      )
      .orderBy("families.created_at", "desc")
      .limit(limit)
      .offset(offset);

    const [countResult, families] = await Promise.all([
      countQuery,
      familiesQuery,
    ]);

    const total = Number(countResult.count);
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      message: "تم جلب قائمة الأسر بنجاح.",
      data: {
        families: families.map((family) => ({
          ...family,
          editing_enabled: Boolean(family.editing_enabled),
          user_is_active: Boolean(family.user_is_active),
        })),
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
          has_next_page: page < totalPages,
          has_previous_page: page > 1,
        },
        filters: {
          search: search || null,
          status: status || null,
          editing_enabled:
            editingEnabled === undefined ? null : editingEnabled === "true",
        },
      },
    });
  } catch (error) {
    console.error("Get families error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب قائمة الأسر.",
    });
  }
};
const getFamilyDetails = async (req, res) => {
  try {
    const familyId = Number(req.params.familyId);

    if (!Number.isInteger(familyId) || familyId <= 0) {
      return res.status(400).json({
        message: "رقم الأسرة غير صحيح.",
      });
    }

    const family = await db("families")
      .leftJoin("users", "families.user_id", "users.id")
      .where("families.id", familyId)
      .whereNull("families.deleted_at")
      .select(
        "families.id",
        "families.user_id",
        "families.full_name",
        "families.national_id",
        "families.date_of_birth",
        "families.phone",
        "families.blood_type",
        "families.marital_status",
        "families.income_category",
        "families.work_status",
        "families.job_type",
        "families.other_job_type",
        "families.personal_photo_path",
        "families.form_status",
        "families.editing_enabled",
        "families.submitted_at",
        "families.created_at",
        "families.updated_at",
        "users.is_active as user_is_active",
        "users.last_login_at",
      )
      .first();

    if (!family) {
      return res.status(404).json({
        message: "الأسرة غير موجودة.",
      });
    }

    const [housing, wives, children, marriedDaughters, specialCases] =
      await Promise.all([
        db("family_housing").where({ family_id: familyId }).first(),

        db("wives").where({ family_id: familyId }).orderBy("created_at", "asc"),

        db("children")
          .where({ family_id: familyId })
          .orderBy("date_of_birth", "asc"),

        db("married_daughters")
          .where({ family_id: familyId })
          .orderBy("created_at", "asc"),

        db("special_cases")
          .where({ family_id: familyId })
          .orderBy("created_at", "asc"),
      ]);

    return res.status(200).json({
      message: "تم جلب تفاصيل الأسرة بنجاح.",
      data: {
        family: {
          ...family,
          editing_enabled: Boolean(family.editing_enabled),
          user_is_active: Boolean(family.user_is_active),
        },
        housing: housing || null,
        wives,
        children,
        married_daughters: marriedDaughters,
        special_cases: specialCases,
        summary: {
          wives_count: wives.length,
          children_count: children.length,
          married_daughters_count: marriedDaughters.length,
          special_cases_count: specialCases.length,
        },
      },
    });
  } catch (error) {
    console.error("Get family details error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب تفاصيل الأسرة.",
    });
  }
};
const createFamily = async (req, res) => {
  const {
    full_name,
    national_id,
    phone,
    password,
    date_of_birth,
    blood_type,
    marital_status,
    income_category,
    work_status,
    job_type,
    other_job_type,
  } = req.body;

  if (
    !full_name ||
    !national_id ||
    !phone ||
    !password ||
    !date_of_birth ||
    !marital_status ||
    !income_category ||
    !work_status
  ) {
    return res.status(400).json({
      message: "يرجى تعبئة جميع الحقول المطلوبة.",
    });
  }

  if (!/^\d{9}$/.test(national_id)) {
    return res.status(400).json({
      message: "رقم الهوية يجب أن يتكون من 9 أرقام.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
    });
  }

  const allowedMaritalStatuses = ["single", "married", "divorced", "widowed"];

  const allowedIncomeCategories = ["0-1000", "1000-3000", "3000+"];

  const allowedWorkStatuses = ["employee", "worker", "not_working"];

  const allowedJobTypes = ["government", "private", "other"];

  if (!allowedMaritalStatuses.includes(marital_status)) {
    return res.status(400).json({
      message: "الحالة الاجتماعية غير صحيحة.",
    });
  }

  if (!allowedIncomeCategories.includes(income_category)) {
    return res.status(400).json({
      message: "فئة الدخل غير صحيحة.",
    });
  }

  if (!allowedWorkStatuses.includes(work_status)) {
    return res.status(400).json({
      message: "حالة العمل غير صحيحة.",
    });
  }

  if (job_type && !allowedJobTypes.includes(job_type)) {
    return res.status(400).json({
      message: "نوع الوظيفة غير صحيح.",
    });
  }

  if (job_type === "other" && !other_job_type) {
    return res.status(400).json({
      message: "يرجى توضيح نوع الوظيفة الأخرى.",
    });
  }

  try {
    const existingUser = await db("users").where({ national_id }).first();

    if (existingUser) {
      return res.status(409).json({
        message: "رقم الهوية مسجل مسبقًا.",
      });
    }

    const familyHeadRole = await db("roles")
      .where({ name: "family_head" })
      .first();

    if (!familyHeadRole) {
      return res.status(500).json({
        message: "دور رب الأسرة غير موجود في النظام.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.transaction(async (trx) => {
      const [userId] = await trx("users").insert({
        full_name,
        national_id,
        phone,
        password_hash: passwordHash,
        is_active: true,
      });

      await trx("user_roles").insert({
        user_id: userId,
        role_id: familyHeadRole.id,
        assigned_by: req.user.id,
        is_active: true,
      });

      const [familyId] = await trx("families").insert({
        user_id: userId,
        full_name,
        national_id,
        date_of_birth,
        phone,
        blood_type: blood_type || null,
        marital_status,
        income_category,
        work_status,
        job_type: job_type || null,
        other_job_type: job_type === "other" ? other_job_type : null,
        form_status: "draft",
        editing_enabled: true,
        created_by: req.user.id,
        updated_by: req.user.id,
      });

      return {
        userId,
        familyId,
      };
    });

    return res.status(201).json({
      message: "تمت إضافة الأسرة بنجاح.",
      data: {
        user: {
          id: result.userId,
          full_name,
          national_id,
          phone,
          role: "family_head",
        },
        family: {
          id: result.familyId,
          form_status: "draft",
          editing_enabled: true,
        },
      },
    });
  } catch (error) {
    console.error("Create family error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء إضافة الأسرة.",
    });
  }
};
const updateFamily = async (req, res) => {
  try {
    const familyId = Number(req.params.familyId);

    if (!Number.isInteger(familyId) || familyId <= 0) {
      return res.status(400).json({
        message: "رقم الأسرة غير صحيح.",
      });
    }

    const family = await db("families")
      .where({ id: familyId })
      .whereNull("deleted_at")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "الأسرة غير موجودة.",
      });
    }

    const {
      full_name,
      national_id,
      phone,
      date_of_birth,
      blood_type,
      marital_status,
      income_category,
      work_status,
      job_type,
      other_job_type,
    } = req.body;

    if (national_id !== undefined && !/^\d{9}$/.test(String(national_id))) {
      return res.status(400).json({
        message: "رقم الهوية يجب أن يتكون من 9 أرقام.",
      });
    }

    const allowedMaritalStatuses = ["single", "married", "divorced", "widowed"];

    const allowedIncomeCategories = ["0-1000", "1000-3000", "3000+"];

    const allowedWorkStatuses = ["employee", "worker", "not_working"];

    const allowedJobTypes = ["government", "private", "other"];

    if (
      marital_status !== undefined &&
      !allowedMaritalStatuses.includes(marital_status)
    ) {
      return res.status(400).json({
        message: "الحالة الاجتماعية غير صحيحة.",
      });
    }

    if (
      income_category !== undefined &&
      !allowedIncomeCategories.includes(income_category)
    ) {
      return res.status(400).json({
        message: "فئة الدخل غير صحيحة.",
      });
    }

    if (
      work_status !== undefined &&
      !allowedWorkStatuses.includes(work_status)
    ) {
      return res.status(400).json({
        message: "حالة العمل غير صحيحة.",
      });
    }

    if (
      job_type !== undefined &&
      job_type !== null &&
      !allowedJobTypes.includes(job_type)
    ) {
      return res.status(400).json({
        message: "نوع الوظيفة غير صحيح.",
      });
    }

    const finalWorkStatus =
      work_status !== undefined ? work_status : family.work_status;

    const finalJobType = job_type !== undefined ? job_type : family.job_type;

    const finalOtherJobType =
      other_job_type !== undefined ? other_job_type : family.other_job_type;

    if (finalWorkStatus === "employee" && !finalJobType) {
      return res.status(400).json({
        message: "نوع الوظيفة مطلوب عند اختيار موظف.",
      });
    }

    if (finalJobType === "other" && !finalOtherJobType) {
      return res.status(400).json({
        message: "يرجى توضيح نوع الوظيفة الأخرى.",
      });
    }

    if (national_id !== undefined && national_id !== family.national_id) {
      const duplicateNationalId = await db("families")
        .where({ national_id })
        .whereNot({ id: familyId })
        .whereNull("deleted_at")
        .first();

      if (duplicateNationalId) {
        return res.status(409).json({
          message: "رقم الهوية مسجل لأسرة أخرى.",
        });
      }

      const duplicateUser = await db("users")
        .where({ national_id })
        .whereNot({ id: family.user_id })
        .first();

      if (duplicateUser) {
        return res.status(409).json({
          message: "رقم الهوية مسجل لمستخدم آخر.",
        });
      }
    }

    const familyUpdates = {
      updated_by: req.user.id,
      updated_at: db.fn.now(),
    };

    const allowedFields = {
      full_name,
      national_id,
      phone,
      date_of_birth,
      blood_type,
      marital_status,
      income_category,
      work_status,
      job_type,
      other_job_type,
    };

    Object.entries(allowedFields).forEach(([key, value]) => {
      if (value !== undefined) {
        familyUpdates[key] = value;
      }
    });

    if (work_status !== undefined && work_status !== "employee") {
      familyUpdates.job_type = null;
      familyUpdates.other_job_type = null;
    } else if (job_type !== undefined && job_type !== "other") {
      familyUpdates.other_job_type = null;
    }

    await db.transaction(async (trx) => {
      await trx("families").where({ id: familyId }).update(familyUpdates);

      const userUpdates = {};

      if (full_name !== undefined) {
        userUpdates.full_name = full_name;
      }

      if (national_id !== undefined) {
        userUpdates.national_id = national_id;
      }

      if (phone !== undefined) {
        userUpdates.phone = phone;
      }

      if (family.user_id && Object.keys(userUpdates).length > 0) {
        userUpdates.updated_at = trx.fn.now();

        await trx("users").where({ id: family.user_id }).update(userUpdates);
      }
    });

    const updatedFamily = await db("families")
      .where({ id: familyId })
      .select(
        "id",
        "user_id",
        "full_name",
        "national_id",
        "phone",
        db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
        "blood_type",
        "marital_status",
        "income_category",
        "work_status",
        "job_type",
        "other_job_type",
        "form_status",
        "editing_enabled",
        "updated_by",
        "updated_at",
      )
      .first();

    return res.status(200).json({
      message: "تم تعديل بيانات الأسرة بنجاح.",
      data: {
        family: {
          ...updatedFamily,
          editing_enabled: Boolean(updatedFamily.editing_enabled),
        },
      },
    });
  } catch (error) {
    console.error("Update family error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تعديل بيانات الأسرة.",
    });
  }
};
const deleteFamily = async (req, res) => {
  try {
    const familyId = Number(req.params.familyId);

    if (!Number.isInteger(familyId) || familyId <= 0) {
      return res.status(400).json({
        message: "رقم الأسرة غير صحيح.",
      });
    }

    const family = await db("families")
      .where({ id: familyId })
      .whereNull("deleted_at")
      .select("id", "user_id", "full_name")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "الأسرة غير موجودة أو محذوفة مسبقًا.",
      });
    }

    await db.transaction(async (trx) => {
      await trx("families").where({ id: familyId }).update({
        deleted_at: trx.fn.now(),
        deleted_by: req.user.id,
        editing_enabled: false,
        updated_by: req.user.id,
        updated_at: trx.fn.now(),
      });

      if (family.user_id) {
        await trx("users").where({ id: family.user_id }).update({
          is_active: false,
          updated_at: trx.fn.now(),
        });
      }
    });

    return res.status(200).json({
      message: "تم حذف الأسرة بنجاح.",
      data: {
        family: {
          id: family.id,
          full_name: family.full_name,
          deleted_by: req.user.id,
        },
      },
    });
  } catch (error) {
    console.error("Delete family error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حذف الأسرة.",
    });
  }
};
const restoreFamily = async (req, res) => {
  try {
    const familyId = Number(req.params.familyId);

    if (!Number.isInteger(familyId) || familyId <= 0) {
      return res.status(400).json({
        message: "رقم الأسرة غير صحيح.",
      });
    }

    const family = await db("families")
      .where({ id: familyId })
      .whereNotNull("deleted_at")
      .select("id", "user_id", "full_name", "deleted_at", "deleted_by")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "الأسرة غير موجودة أو غير محذوفة.",
      });
    }

    await db.transaction(async (trx) => {
      await trx("families").where({ id: familyId }).update({
        deleted_at: null,
        deleted_by: null,
        editing_enabled: true,
        updated_by: req.user.id,
        updated_at: trx.fn.now(),
      });

      if (family.user_id) {
        await trx("users").where({ id: family.user_id }).update({
          is_active: true,
          updated_at: trx.fn.now(),
        });
      }
    });

    return res.status(200).json({
      message: "تمت استعادة الأسرة بنجاح.",
      data: {
        family: {
          id: family.id,
          full_name: family.full_name,
          editing_enabled: true,
          restored_by: req.user.id,
        },
      },
    });
  } catch (error) {
    console.error("Restore family error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء استعادة الأسرة.",
    });
  }
};
const updateFamilyEditingStatus = async (req, res) => {
  try {
    const familyId = Number(req.params.familyId);
    const { editing_override } = req.body;

    if (!Number.isInteger(familyId) || familyId <= 0) {
      return res.status(400).json({
        message: "رقم الأسرة غير صحيح.",
      });
    }

    if (editing_override !== null && typeof editing_override !== "boolean") {
      return res.status(400).json({
        message: "قيمة editing_override يجب أن تكون true أو false أو null.",
      });
    }

    const family = await db("families")
      .where({ id: familyId })
      .whereNull("deleted_at")
      .select("id", "full_name", "form_status", "editing_override")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "الأسرة غير موجودة.",
      });
    }

    if (family.form_status === "submitted") {
      return res.status(403).json({
        message:
          "لا يمكن فتح التعديل لأسرة تم تسليم نموذجها. أعد النموذج إلى draft أولًا.",
      });
    }

    await db("families").where({ id: familyId }).update({
      editing_override,
      updated_by: req.user.id,
      updated_at: db.fn.now(),
    });

    let message;

    if (editing_override === true) {
      message = "تم فتح التعديل لهذه الأسرة كاستثناء.";
    } else if (editing_override === false) {
      message = "تم إغلاق التعديل لهذه الأسرة كاستثناء.";
    } else {
      message = "تم إلغاء الاستثناء وستتبع الأسرة إعداد التعديل العام.";
    }

    return res.status(200).json({
      message,
      data: {
        family: {
          id: family.id,
          full_name: family.full_name,
          form_status: family.form_status,
          editing_override,
          updated_by: req.user.id,
        },
      },
    });
  } catch (error) {
    console.error("Update family editing status error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تحديث حالة تعديل الأسرة.",
    });
  }
};
const updateFamilyFormStatus = async (req, res) => {
  try {
    const familyId = Number(req.params.familyId);
    const { form_status } = req.body;

    if (!Number.isInteger(familyId) || familyId <= 0) {
      return res.status(400).json({
        message: "رقم الأسرة غير صحيح.",
      });
    }

    const allowedStatuses = ["draft", "submitted"];

    if (!allowedStatuses.includes(form_status)) {
      return res.status(400).json({
        message: "حالة النموذج يجب أن تكون draft أو submitted.",
      });
    }

    const family = await db("families")
      .where({ id: familyId })
      .whereNull("deleted_at")
      .select("id", "full_name", "form_status")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "الأسرة غير موجودة.",
      });
    }

    const updates = {
      form_status,
      updated_by: req.user.id,
      updated_at: db.fn.now(),
    };

    if (form_status === "submitted") {
      updates.submitted_at = db.fn.now();
      updates.editing_enabled = false;
    } else {
      updates.submitted_at = null;
    }

    await db("families").where({ id: familyId }).update(updates);

    return res.status(200).json({
      message:
        form_status === "submitted"
          ? "تم اعتماد نموذج الأسرة بنجاح."
          : "تمت إعادة نموذج الأسرة إلى المسودة بنجاح.",
      data: {
        family: {
          id: family.id,
          full_name: family.full_name,
          form_status,
          editing_enabled: form_status === "submitted" ? false : undefined,
          updated_by: req.user.id,
        },
      },
    });
  } catch (error) {
    console.error("Update family form status error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تحديث حالة النموذج.",
    });
  }
};

// Export
const exportFamiliesExcel = async (req, res) => {
  try {
    const status = req.query.status?.trim() || "";
    const editingEnabled = req.query.editing_enabled;
    const search = req.query.search?.trim() || "";

    const allowedStatuses = ["draft", "submitted"];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "حالة النموذج غير صحيحة.",
      });
    }

    if (
      editingEnabled !== undefined &&
      !["true", "false"].includes(editingEnabled)
    ) {
      return res.status(400).json({
        message: "قيمة editing_enabled يجب أن تكون true أو false.",
      });
    }

    const familiesQuery = db("families")
      .whereNull("deleted_at")
      .select(
        "id",
        "full_name",
        "national_id",
        db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
        "phone",
        "blood_type",
        "marital_status",
        "income_category",
        "work_status",
        "job_type",
        "other_job_type",
        "form_status",
        "editing_enabled",
        db.raw(
          "DATE_FORMAT(submitted_at, '%Y-%m-%d %H:%i:%s') as submitted_at",
        ),
        db.raw("DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at"),
      );

    if (status) {
      familiesQuery.where("form_status", status);
    }

    if (editingEnabled !== undefined) {
      familiesQuery.where("editing_enabled", editingEnabled === "true");
    }

    if (search) {
      familiesQuery.andWhere((queryBuilder) => {
        queryBuilder
          .where("full_name", "like", `%${search}%`)
          .orWhere("national_id", "like", `%${search}%`)
          .orWhere("phone", "like", `%${search}%`);
      });
    }

    const families = await familiesQuery.orderBy("created_at", "desc");

    const familyIds = families.map((family) => family.id);

    let housing = [];
    let wives = [];
    let children = [];
    let marriedDaughters = [];
    let specialCases = [];

    if (familyIds.length > 0) {
      [housing, wives, children, marriedDaughters, specialCases] =
        await Promise.all([
          db("family_housing")
            .whereIn("family_id", familyIds)
            .select(
              "id",
              "family_id",
              "previous_area",
              "current_housing_type",
              "displacement_type",
              "current_address",
            ),

          db("wives")
            .whereIn("family_id", familyIds)
            .select(
              "id",
              "family_id",
              "full_name",
              "national_id",
              db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
              "phone",
              "previous_family_name",
              "employment_status",
            ),

          db("children")
            .whereIn("family_id", familyIds)
            .select(
              "id",
              "family_id",
              "full_name",
              "national_id",
              db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
              "education_status",
              "institution_name",
            ),

          db("married_daughters")
            .whereIn("family_id", familyIds)
            .select(
              "id",
              "family_id",
              "full_name",
              "national_id",
              "phone",
              "husband_full_name",
              "husband_phone",
            ),

          db("special_cases")
            .whereIn("family_id", familyIds)
            .select(
              "id",
              "family_id",
              "full_name",
              "national_id",
              db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
              "relationship",
              "case_type",
              "case_details",
            ),
        ]);
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Salman Family Registry";
    workbook.created = new Date();

    const addWorksheet = (name, columns, rows) => {
      const worksheet = workbook.addWorksheet(name, {
        views: [{ rightToLeft: true }],
      });

      worksheet.columns = columns;

      worksheet.getRow(1).font = {
        bold: true,
      };

      worksheet.getRow(1).alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      worksheet.autoFilter = {
        from: {
          row: 1,
          column: 1,
        },
        to: {
          row: 1,
          column: columns.length,
        },
      };

      rows.forEach((row) => {
        worksheet.addRow(row);
      });

      worksheet.eachRow((row) => {
        row.alignment = {
          vertical: "middle",
          horizontal: "right",
        };
      });

      return worksheet;
    };

    addWorksheet(
      "الأسر",
      [
        { header: "رقم الأسرة", key: "id", width: 12 },
        { header: "اسم رب الأسرة", key: "full_name", width: 28 },
        { header: "رقم الهوية", key: "national_id", width: 16 },
        { header: "تاريخ الميلاد", key: "date_of_birth", width: 16 },
        { header: "رقم الهاتف", key: "phone", width: 18 },
        { header: "فصيلة الدم", key: "blood_type", width: 14 },
        { header: "الحالة الاجتماعية", key: "marital_status", width: 18 },
        { header: "فئة الدخل", key: "income_category", width: 16 },
        { header: "حالة العمل", key: "work_status", width: 16 },
        { header: "نوع الوظيفة", key: "job_type", width: 18 },
        { header: "وظيفة أخرى", key: "other_job_type", width: 22 },
        { header: "حالة النموذج", key: "form_status", width: 16 },
        { header: "التعديل مفتوح", key: "editing_enabled", width: 16 },
        { header: "تاريخ التسليم", key: "submitted_at", width: 22 },
        { header: "تاريخ التسجيل", key: "created_at", width: 22 },
      ],
      families.map((family) => ({
        ...family,
        editing_enabled: family.editing_enabled ? "نعم" : "لا",
      })),
    );

    addWorksheet(
      "السكن",
      [
        { header: "رقم السجل", key: "id", width: 12 },
        { header: "رقم الأسرة", key: "family_id", width: 12 },
        { header: "المنطقة السابقة", key: "previous_area", width: 20 },
        {
          header: "نوع السكن الحالي",
          key: "current_housing_type",
          width: 20,
        },
        { header: "نوع النزوح", key: "displacement_type", width: 20 },
        { header: "العنوان الحالي", key: "current_address", width: 35 },
      ],
      housing,
    );

    addWorksheet(
      "الزوجات",
      [
        { header: "رقم الزوجة", key: "id", width: 12 },
        { header: "رقم الأسرة", key: "family_id", width: 12 },
        { header: "الاسم الكامل", key: "full_name", width: 28 },
        { header: "رقم الهوية", key: "national_id", width: 16 },
        { header: "تاريخ الميلاد", key: "date_of_birth", width: 16 },
        { header: "رقم الهاتف", key: "phone", width: 18 },
        {
          header: "اسم العائلة السابقة",
          key: "previous_family_name",
          width: 25,
        },
        {
          header: "حالة العمل",
          key: "employment_status",
          width: 22,
        },
      ],
      wives,
    );

    addWorksheet(
      "الأبناء",
      [
        { header: "رقم الابن", key: "id", width: 12 },
        { header: "رقم الأسرة", key: "family_id", width: 12 },
        { header: "الاسم الكامل", key: "full_name", width: 28 },
        { header: "رقم الهوية", key: "national_id", width: 16 },
        { header: "تاريخ الميلاد", key: "date_of_birth", width: 16 },
        {
          header: "الحالة التعليمية",
          key: "education_status",
          width: 20,
        },
        {
          header: "المؤسسة التعليمية",
          key: "institution_name",
          width: 30,
        },
      ],
      children,
    );

    addWorksheet(
      "البنات المتزوجات",
      [
        { header: "رقم السجل", key: "id", width: 12 },
        { header: "رقم الأسرة", key: "family_id", width: 12 },
        { header: "اسم البنت", key: "full_name", width: 28 },
        { header: "رقم الهوية", key: "national_id", width: 16 },
        { header: "رقم الهاتف", key: "phone", width: 18 },
        { header: "اسم الزوج", key: "husband_full_name", width: 28 },
        { header: "هاتف الزوج", key: "husband_phone", width: 18 },
      ],
      marriedDaughters,
    );

    addWorksheet(
      "الحالات الخاصة",
      [
        { header: "رقم الحالة", key: "id", width: 12 },
        { header: "رقم الأسرة", key: "family_id", width: 12 },
        { header: "الاسم الكامل", key: "full_name", width: 28 },
        { header: "رقم الهوية", key: "national_id", width: 16 },
        { header: "تاريخ الميلاد", key: "date_of_birth", width: 16 },
        { header: "صلة القرابة", key: "relationship", width: 18 },
        { header: "نوع الحالة", key: "case_type", width: 18 },
        { header: "تفاصيل الحالة", key: "case_details", width: 45 },
      ],
      specialCases,
    );

    const fileName = `salman-families-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);

    return res.end();
  } catch (error) {
    console.error("Export families Excel error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تصدير بيانات الأسر.",
    });
  }
};

// system_settings
const getSystemSettings = async (req, res) => {
  try {
    const settings = await db("system_settings")
      .select(
        "id",
        "registration_enabled",
        "global_editing_enabled",
        "system_name",
        "registration_closes_at",
        "updated_by",
        "created_at",
        "updated_at",
      )
      .first();

    if (!settings) {
      return res.status(404).json({
        message: "إعدادات النظام غير موجودة.",
      });
    }

    return res.status(200).json({
      message: "تم جلب إعدادات النظام بنجاح.",
      data: {
        settings: {
          ...settings,
          registration_enabled: Boolean(settings.registration_enabled),
          global_editing_enabled: Boolean(settings.global_editing_enabled),
        },
      },
    });
  } catch (error) {
    console.error("Get system settings error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب إعدادات النظام.",
    });
  }
};
const updateSystemSettings = async (req, res) => {
  try {
    const {
      registration_enabled,
      global_editing_enabled,
      system_name,
      registration_closes_at,
    } = req.body;

    const settings = await db("system_settings").first();

    if (!settings) {
      return res.status(404).json({
        message: "إعدادات النظام غير موجودة.",
      });
    }

    if (
      registration_enabled !== undefined &&
      typeof registration_enabled !== "boolean"
    ) {
      return res.status(400).json({
        message: "قيمة registration_enabled يجب أن تكون true أو false.",
      });
    }

    if (
      global_editing_enabled !== undefined &&
      typeof global_editing_enabled !== "boolean"
    ) {
      return res.status(400).json({
        message: "قيمة global_editing_enabled يجب أن تكون true أو false.",
      });
    }

    if (system_name !== undefined && !String(system_name).trim()) {
      return res.status(400).json({
        message: "اسم النظام لا يمكن أن يكون فارغًا.",
      });
    }

    const updates = {
      updated_by: req.user.id,
      updated_at: db.fn.now(),
    };

    if (registration_enabled !== undefined) {
      updates.registration_enabled = registration_enabled;
    }

    if (global_editing_enabled !== undefined) {
      updates.global_editing_enabled = global_editing_enabled;
    }

    if (system_name !== undefined) {
      updates.system_name = String(system_name).trim();
    }

    if (registration_closes_at !== undefined) {
      updates.registration_closes_at = registration_closes_at || null;
    }

    if (Object.keys(updates).length === 2) {
      return res.status(400).json({
        message: "لم يتم إرسال أي إعدادات للتعديل.",
      });
    }

    await db("system_settings").where({ id: settings.id }).update(updates);

    const updatedSettings = await db("system_settings")
      .where({ id: settings.id })
      .select(
        "id",
        "registration_enabled",
        "global_editing_enabled",
        "system_name",
        "registration_closes_at",
        "updated_by",
        "created_at",
        "updated_at",
      )
      .first();

    return res.status(200).json({
      message: "تم تعديل إعدادات النظام بنجاح.",
      data: {
        settings: {
          ...updatedSettings,
          registration_enabled: Boolean(updatedSettings.registration_enabled),
          global_editing_enabled: Boolean(
            updatedSettings.global_editing_enabled,
          ),
        },
      },
    });
  } catch (error) {
    console.error("Update system settings error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تعديل إعدادات النظام.",
    });
  }
};
module.exports = {
  // Admin Dashboard
  getDashboardStats,

  // Admin Families
  getFamilies,
  getFamilyDetails,
  createFamily,
  updateFamily,
  deleteFamily,
  restoreFamily,
  updateFamilyEditingStatus,
  updateFamilyFormStatus,

  // Export
  exportFamiliesExcel,

  //Settings
  getSystemSettings,
  updateSystemSettings,
};
