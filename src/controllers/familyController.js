const db = require("../config/database");
const path = require("path");
const fs = require("fs/promises");

// FAMILY PROFILE
const getMyFamily = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select(
        "id",
        "user_id",
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
        "personal_photo_path",
        "form_status",
        "editing_enabled",
        "submitted_at",
        "created_at",
        "updated_at",
      )
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    const [housing, wives, children, marriedDaughters, specialCases] =
      await Promise.all([
        db("family_housing").where({ family_id: family.id }).first(),

        db("wives")
          .where({ family_id: family.id })
          .select(
            "id",
            "full_name",
            "national_id",
            db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
            "phone",
            "previous_family_name",
            "employment_status",
            "created_at",
            "updated_at",
          )
          .orderBy("created_at", "asc"),

        db("children")
          .where({ family_id: family.id })
          .select(
            "id",
            "full_name",
            "national_id",
            db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
            "education_status",
            "institution_name",
            "created_at",
            "updated_at",
          )
          .orderBy("date_of_birth", "asc"),

        db("married_daughters")
          .where({ family_id: family.id })
          .orderBy("created_at", "asc"),

        db("special_cases")
          .where({ family_id: family.id })
          .select(
            "id",
            "full_name",
            "national_id",
            db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
            "relationship",
            "case_type",
            "case_details",
            "created_at",
            "updated_at",
          )
          .orderBy("created_at", "asc"),
      ]);

    return res.status(200).json({
      message: "تم جلب بيانات الأسرة بنجاح.",
      data: {
        family: {
          ...family,
          editing_enabled: Boolean(family.editing_enabled),
        },
        housing: housing || null,
        wives,
        children,
        married_daughters: marriedDaughters,
        special_cases: specialCases,
      },
    });
  } catch (error) {
    console.error("Get my family error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب بيانات الأسرة.",
    });
  }
};
const updateMyFamily = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    if (!family.editing_enabled) {
      return res.status(403).json({
        message: "التعديل مغلق حاليًا لهذه الأسرة.",
      });
    }

    if (family.form_status !== "draft") {
      return res.status(403).json({
        message: "لا يمكن تعديل النموذج بعد اعتماده.",
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
      const duplicateFamily = await db("families")
        .where({ national_id })
        .whereNot({ id: family.id })
        .whereNull("deleted_at")
        .first();

      if (duplicateFamily) {
        return res.status(409).json({
          message: "رقم الهوية مسجل لأسرة أخرى.",
        });
      }

      const duplicateUser = await db("users")
        .where({ national_id })
        .whereNot({ id: req.user.id })
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
      await trx("families").where({ id: family.id }).update(familyUpdates);

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

      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updated_at = trx.fn.now();

        await trx("users").where({ id: req.user.id }).update(userUpdates);
      }
    });

    const updatedFamily = await db("families")
      .where({ id: family.id })
      .select(
        "id",
        "user_id",
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
    console.error("Update my family error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تعديل بيانات الأسرة.",
    });
  }
};
const uploadMyPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "يرجى اختيار صورة شخصية.",
      });
    }

    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "form_status", "editing_enabled", "personal_photo_path")
      .first();

    if (!family) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    if (!family.editing_enabled) {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(403).json({
        message: "التعديل مغلق حاليًا لهذه الأسرة.",
      });
    }

    if (family.form_status !== "draft") {
      await fs.unlink(req.file.path).catch(() => {});

      return res.status(403).json({
        message: "لا يمكن تغيير الصورة بعد اعتماد النموذج.",
      });
    }

    const photoPath = `/uploads/family-photos/${req.file.filename}`;

    await db("families").where({ id: family.id }).update({
      personal_photo_path: photoPath,
      updated_by: req.user.id,
      updated_at: db.fn.now(),
    });

    if (family.personal_photo_path) {
      const oldPhotoRelativePath = family.personal_photo_path.replace(
        /^\/uploads\//,
        "",
      );

      const oldPhotoAbsolutePath = path.join(
        __dirname,
        "..",
        "uploads",
        oldPhotoRelativePath,
      );

      await fs.unlink(oldPhotoAbsolutePath).catch(() => {});
    }

    return res.status(200).json({
      message: "تم رفع الصورة الشخصية بنجاح.",
      data: {
        personal_photo_path: photoPath,
      },
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    console.error("Upload family photo error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء رفع الصورة الشخصية.",
    });
  }
};
const deleteMyPhoto = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "form_status", "editing_enabled", "personal_photo_path")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    if (!family.editing_enabled) {
      return res.status(403).json({
        message: "التعديل مغلق حاليًا لهذه الأسرة.",
      });
    }

    if (family.form_status !== "draft") {
      return res.status(403).json({
        message: "لا يمكن حذف الصورة بعد اعتماد النموذج.",
      });
    }

    if (!family.personal_photo_path) {
      return res.status(404).json({
        message: "لا توجد صورة شخصية لحذفها.",
      });
    }

    const photoRelativePath = family.personal_photo_path.replace(
      /^\/uploads\//,
      "",
    );

    const photoAbsolutePath = path.join(
      __dirname,
      "..",
      "uploads",
      photoRelativePath,
    );

    await db("families").where({ id: family.id }).update({
      personal_photo_path: null,
      updated_by: req.user.id,
      updated_at: db.fn.now(),
    });

    await fs.unlink(photoAbsolutePath).catch((error) => {
      if (error.code !== "ENOENT") {
        console.error("Delete physical photo error:", error);
      }
    });

    return res.status(200).json({
      message: "تم حذف الصورة الشخصية بنجاح.",
    });
  } catch (error) {
    console.error("Delete family photo error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حذف الصورة الشخصية.",
    });
  }
};
const getMyEditingStatus = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "form_status", "editing_enabled", "submitted_at")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    const canEdit =
      Boolean(family.editing_enabled) && family.form_status === "draft";

    return res.status(200).json({
      message: "تم جلب حالة التعديل بنجاح.",
      data: {
        family_id: family.id,
        form_status: family.form_status,
        editing_enabled: Boolean(family.editing_enabled),
        can_edit: canEdit,
        submitted_at: family.submitted_at,
        reason: canEdit
          ? null
          : family.form_status === "submitted"
            ? "تم اعتماد النموذج ولا يمكن تعديله."
            : "التعديل مغلق حاليًا لهذه الأسرة.",
      },
    });
  } catch (error) {
    console.error("Get editing status error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب حالة التعديل.",
    });
  }
};
const getMyFormCompletion = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    const [housing, wivesCount, childrenCount] = await Promise.all([
      db("family_housing").where({ family_id: family.id }).first(),

      db("wives")
        .where({ family_id: family.id })
        .count({ count: "id" })
        .first(),

      db("children")
        .where({ family_id: family.id })
        .count({ count: "id" })
        .first(),
    ]);

    const sections = [
      {
        key: "family_head",
        name: "بيانات رب الأسرة",
        required: true,
        completed: Boolean(
          family.full_name &&
          family.national_id &&
          family.date_of_birth &&
          family.phone &&
          family.marital_status &&
          family.income_category &&
          family.work_status,
        ),
      },
      {
        key: "personal_photo",
        name: "الصورة الشخصية",
        required: true,
        completed: Boolean(family.personal_photo_path),
      },
      {
        key: "housing",
        name: "بيانات السكن",
        required: true,
        completed: Boolean(housing),
      },
      {
        key: "wives",
        name: "بيانات الزوجة",
        required: family.marital_status === "married",
        completed:
          family.marital_status !== "married" || Number(wivesCount.count) > 0,
      },
      {
        key: "children",
        name: "بيانات الأبناء",
        required: false,
        completed: Number(childrenCount.count) > 0,
      },
    ];

    const requiredSections = sections.filter((section) => section.required);

    const completedRequiredSections = requiredSections.filter(
      (section) => section.completed,
    );

    const percentage =
      requiredSections.length === 0
        ? 100
        : Math.round(
            (completedRequiredSections.length / requiredSections.length) * 100,
          );

    const missingSections = requiredSections
      .filter((section) => !section.completed)
      .map((section) => ({
        key: section.key,
        name: section.name,
      }));

    const isReadyToSubmit =
      missingSections.length === 0 &&
      family.form_status === "draft" &&
      Boolean(family.editing_enabled);

    return res.status(200).json({
      message: "تم جلب حالة اكتمال النموذج بنجاح.",
      data: {
        family_id: family.id,
        percentage,
        completed_required_sections: completedRequiredSections.length,
        total_required_sections: requiredSections.length,
        is_ready_to_submit: isReadyToSubmit,
        form_status: family.form_status,
        editing_enabled: Boolean(family.editing_enabled),
        sections,
        missing_sections: missingSections,
      },
    });
  } catch (error) {
    console.error("Get form completion error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حساب اكتمال النموذج.",
    });
  }
};
const submitMyFamilyForm = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    if (family.form_status === "submitted") {
      return res.status(400).json({
        message: "تم اعتماد النموذج مسبقًا.",
      });
    }

    if (!family.editing_enabled) {
      return res.status(403).json({
        message: "التعديل مغلق حاليًا لهذه الأسرة.",
      });
    }

    const [housing, wivesCount] = await Promise.all([
      db("family_housing").where({ family_id: family.id }).first(),

      db("wives")
        .where({ family_id: family.id })
        .count({ count: "id" })
        .first(),
    ]);

    const missingFields = [];

    if (!family.full_name) {
      missingFields.push("الاسم الكامل لرب الأسرة");
    }

    if (!family.national_id) {
      missingFields.push("رقم الهوية");
    }

    if (!family.date_of_birth) {
      missingFields.push("تاريخ الميلاد");
    }

    if (!family.phone) {
      missingFields.push("رقم الهاتف");
    }

    if (!family.marital_status) {
      missingFields.push("الحالة الاجتماعية");
    }

    if (!family.income_category) {
      missingFields.push("فئة الدخل");
    }

    if (!family.work_status) {
      missingFields.push("حالة العمل");
    }

    if (family.work_status === "employee" && !family.job_type) {
      missingFields.push("نوع الوظيفة");
    }

    if (family.job_type === "other" && !family.other_job_type) {
      missingFields.push("توضيح نوع الوظيفة الأخرى");
    }

    if (!family.personal_photo_path) {
      missingFields.push("الصورة الشخصية");
    }

    if (!housing) {
      missingFields.push("بيانات السكن");
    }

    if (family.marital_status === "married" && Number(wivesCount.count) === 0) {
      missingFields.push("بيانات الزوجة");
    }

    if (missingFields.length > 0) {
      return res.status(422).json({
        message: "لا يمكن اعتماد النموذج قبل استكمال البيانات المطلوبة.",
        data: {
          missing_fields: missingFields,
        },
      });
    }

    await db("families").where({ id: family.id }).update({
      form_status: "submitted",
      editing_enabled: false,
      submitted_at: db.fn.now(),
      updated_by: req.user.id,
      updated_at: db.fn.now(),
    });

    const submittedFamily = await db("families")
      .where({ id: family.id })
      .select("id", "form_status", "editing_enabled", "submitted_at")
      .first();

    return res.status(200).json({
      message: "تم اعتماد نموذج الأسرة بنجاح.",
      data: {
        family: {
          id: submittedFamily.id,
          form_status: submittedFamily.form_status,
          editing_enabled: Boolean(submittedFamily.editing_enabled),
          submitted_at: submittedFamily.submitted_at,
        },
      },
    });
  } catch (error) {
    console.error("Submit family form error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء اعتماد نموذج الأسرة.",
    });
  }
};
const deleteMyFamily = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "كلمة المرور مطلوبة لتأكيد حذف الأسرة.",
      });
    }

    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "user_id", "full_name", "form_status", "editing_enabled")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود أو محذوف مسبقًا.",
      });
    }

    if (!family.editing_enabled) {
      return res.status(403).json({
        message: "لا يمكن حذف الأسرة لأن التعديل مغلق حاليًا.",
      });
    }

    if (family.form_status !== "draft") {
      return res.status(403).json({
        message: "لا يمكن حذف الأسرة بعد اعتماد النموذج.",
      });
    }

    const user = await db("users")
      .where({ id: req.user.id })
      .select("id", "password_hash", "is_active")
      .first();

    if (!user) {
      return res.status(404).json({
        message: "المستخدم غير موجود.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "كلمة المرور غير صحيحة.",
      });
    }

    await db.transaction(async (trx) => {
      await trx("families").where({ id: family.id }).update({
        deleted_at: trx.fn.now(),
        deleted_by: req.user.id,
        editing_enabled: false,
        updated_by: req.user.id,
        updated_at: trx.fn.now(),
      });

      await trx("users").where({ id: req.user.id }).update({
        is_active: false,
        updated_at: trx.fn.now(),
      });
    });

    return res.status(200).json({
      message: "تم حذف سجل الأسرة بنجاح.",
      data: {
        family: {
          id: family.id,
          full_name: family.full_name,
        },
      },
    });
  } catch (error) {
    console.error("Delete my family error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حذف سجل الأسرة.",
    });
  }
};

// HOUSING
const getMyHousing = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    const housing = await db("family_housing")
      .where({ family_id: family.id })
      .first();

    return res.status(200).json({
      message: "تم جلب بيانات السكن بنجاح.",
      data: {
        housing: housing || null,
      },
    });
  } catch (error) {
    console.error("Get housing error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب بيانات السكن.",
    });
  }
};
const upsertMyHousing = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "form_status", "editing_enabled")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    if (!family.editing_enabled) {
      return res.status(403).json({
        message: "التعديل مغلق حاليًا لهذه الأسرة.",
      });
    }

    if (family.form_status !== "draft") {
      return res.status(403).json({
        message: "لا يمكن تعديل بيانات السكن بعد اعتماد النموذج.",
      });
    }

    const {
      previous_area,
      current_housing_type,
      displacement_type,
      current_address,
    } = req.body;

    if (!previous_area || !current_housing_type || !current_address) {
      return res.status(400).json({
        message: "يرجى تعبئة جميع حقول السكن المطلوبة.",
      });
    }

    const allowedPreviousAreas = [
      "north_gaza",
      "gaza",
      "middle_area",
      "south_gaza",
    ];

    const allowedHousingTypes = ["owned", "rented", "displaced"];

    const allowedDisplacementTypes = [
      "tent",
      "shelter_center",
      "relatives_house",
    ];

    if (!allowedPreviousAreas.includes(previous_area)) {
      return res.status(400).json({
        message: "منطقة السكن السابقة غير صحيحة.",
      });
    }

    if (!allowedHousingTypes.includes(current_housing_type)) {
      return res.status(400).json({
        message: "نوع السكن الحالي غير صحيح.",
      });
    }

    if (
      current_housing_type === "displaced" &&
      !allowedDisplacementTypes.includes(displacement_type)
    ) {
      return res.status(400).json({
        message: "نوع النزوح مطلوب وغير صحيح.",
      });
    }

    if (current_housing_type !== "displaced" && displacement_type) {
      return res.status(400).json({
        message: "نوع النزوح يُستخدم فقط عندما يكون السكن الحالي نازحًا.",
      });
    }

    const housingData = {
      previous_area,
      current_housing_type,
      displacement_type:
        current_housing_type === "displaced" ? displacement_type : null,
      current_address: current_address.trim(),
      updated_at: db.fn.now(),
    };

    const existingHousing = await db("family_housing")
      .where({ family_id: family.id })
      .first();

    let housingId;

    if (existingHousing) {
      await db("family_housing")
        .where({ family_id: family.id })
        .update(housingData);

      housingId = existingHousing.id;
    } else {
      const [newHousingId] = await db("family_housing").insert({
        family_id: family.id,
        ...housingData,
      });

      housingId = newHousingId;
    }

    const housing = await db("family_housing").where({ id: housingId }).first();

    return res.status(existingHousing ? 200 : 201).json({
      message: existingHousing
        ? "تم تعديل بيانات السكن بنجاح."
        : "تمت إضافة بيانات السكن بنجاح.",
      data: {
        housing,
      },
    });
  } catch (error) {
    console.error("Upsert housing error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حفظ بيانات السكن.",
    });
  }
};
const deleteMyHousing = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "form_status", "editing_enabled")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    if (!family.editing_enabled) {
      return res.status(403).json({
        message: "التعديل مغلق حاليًا لهذه الأسرة.",
      });
    }

    if (family.form_status !== "draft") {
      return res.status(403).json({
        message: "لا يمكن حذف بيانات السكن بعد اعتماد النموذج.",
      });
    }

    const housing = await db("family_housing")
      .where({ family_id: family.id })
      .select("id")
      .first();

    if (!housing) {
      return res.status(404).json({
        message: "بيانات السكن غير موجودة.",
      });
    }

    await db("family_housing").where({ id: housing.id }).delete();

    return res.status(200).json({
      message: "تم حذف بيانات السكن بنجاح.",
    });
  } catch (error) {
    console.error("Delete housing error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حذف بيانات السكن.",
    });
  }
};

// WIVES
const createMyWife = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "marital_status", "form_status", "editing_enabled")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    if (!family.editing_enabled) {
      return res.status(403).json({
        message: "التعديل مغلق حاليًا لهذه الأسرة.",
      });
    }

    if (family.form_status !== "draft") {
      return res.status(403).json({
        message: "لا يمكن إضافة زوجة بعد اعتماد النموذج.",
      });
    }

    if (family.marital_status !== "married") {
      return res.status(400).json({
        message: "لا يمكن إضافة زوجة إلا إذا كانت الحالة الاجتماعية متزوج.",
      });
    }

    const {
      full_name,
      national_id,
      date_of_birth,
      phone,
      previous_family_name,
      employment_status,
    } = req.body;

    if (
      !full_name ||
      !national_id ||
      !date_of_birth ||
      !phone ||
      !previous_family_name ||
      !employment_status
    ) {
      return res.status(400).json({
        message: "يرجى تعبئة جميع بيانات الزوجة المطلوبة.",
      });
    }

    if (!/^\d{9}$/.test(String(national_id))) {
      return res.status(400).json({
        message: "رقم هوية الزوجة يجب أن يتكون من 9 أرقام.",
      });
    }

    const existingWife = await db("wives")
      .where({
        family_id: family.id,
        national_id,
      })
      .first();

    if (existingWife) {
      return res.status(409).json({
        message: "الزوجة مسجلة مسبقًا داخل هذه الأسرة.",
      });
    }

    const [wifeId] = await db("wives").insert({
      family_id: family.id,
      full_name: full_name.trim(),
      national_id,
      date_of_birth,
      phone: phone.trim(),
      previous_family_name: previous_family_name.trim(),
      employment_status: employment_status.trim(),
    });

    const wife = await db("wives")
      .where({ id: wifeId })
      .select(
        "id",
        "family_id",
        "full_name",
        "national_id",
        db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
        "phone",
        "previous_family_name",
        "employment_status",
        "created_at",
        "updated_at",
      )
      .first();

    return res.status(201).json({
      message: "تمت إضافة الزوجة بنجاح.",
      data: {
        wife,
      },
    });
  } catch (error) {
    console.error("Create wife error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء إضافة الزوجة.",
    });
  }
};
const getMyWives = async (req, res) => {
  try {
    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    const wives = await db("wives")
      .where({ family_id: family.id })
      .select(
        "id",
        "family_id",
        "full_name",
        "national_id",
        db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
        "phone",
        "previous_family_name",
        "employment_status",
        "created_at",
        "updated_at",
      )
      .orderBy("created_at", "asc");

    return res.status(200).json({
      message: "تم جلب بيانات الزوجات بنجاح.",
      data: {
        wives,
        count: wives.length,
      },
    });
  } catch (error) {
    console.error("Get wives error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب بيانات الزوجات.",
    });
  }
};
const getMyWife = async (req, res) => {
  try {
    const wifeId = Number(req.params.wifeId);

    if (!Number.isInteger(wifeId) || wifeId <= 0) {
      return res.status(400).json({
        message: "رقم الزوجة غير صحيح.",
      });
    }

    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    const wife = await db("wives")
      .where({
        id: wifeId,
        family_id: family.id,
      })
      .select(
        "id",
        "family_id",
        "full_name",
        "national_id",
        db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
        "phone",
        "previous_family_name",
        "employment_status",
        "created_at",
        "updated_at",
      )
      .first();

    if (!wife) {
      return res.status(404).json({
        message: "بيانات الزوجة غير موجودة.",
      });
    }

    return res.status(200).json({
      message: "تم جلب بيانات الزوجة بنجاح.",
      data: {
        wife,
      },
    });
  } catch (error) {
    console.error("Get wife error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء جلب بيانات الزوجة.",
    });
  }
};
const updateMyWife = async (req, res) => {
  try {
    const wifeId = Number(req.params.wifeId);

    if (!Number.isInteger(wifeId) || wifeId <= 0) {
      return res.status(400).json({
        message: "رقم الزوجة غير صحيح.",
      });
    }

    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "form_status", "editing_enabled")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    if (!family.editing_enabled) {
      return res.status(403).json({
        message: "التعديل مغلق حاليًا لهذه الأسرة.",
      });
    }

    if (family.form_status !== "draft") {
      return res.status(403).json({
        message: "لا يمكن تعديل بيانات الزوجة بعد اعتماد النموذج.",
      });
    }

    const wife = await db("wives")
      .where({
        id: wifeId,
        family_id: family.id,
      })
      .first();

    if (!wife) {
      return res.status(404).json({
        message: "بيانات الزوجة غير موجودة.",
      });
    }

    const {
      full_name,
      national_id,
      date_of_birth,
      phone,
      previous_family_name,
      employment_status,
    } = req.body;

    if (national_id !== undefined && !/^\d{9}$/.test(String(national_id))) {
      return res.status(400).json({
        message: "رقم هوية الزوجة يجب أن يتكون من 9 أرقام.",
      });
    }

    if (national_id !== undefined && national_id !== wife.national_id) {
      const duplicateWife = await db("wives")
        .where({
          family_id: family.id,
          national_id,
        })
        .whereNot({ id: wifeId })
        .first();

      if (duplicateWife) {
        return res.status(409).json({
          message: "رقم الهوية مسجل لزوجة أخرى داخل هذه الأسرة.",
        });
      }
    }

    const updates = {
      updated_at: db.fn.now(),
    };

    const allowedFields = {
      full_name,
      national_id,
      date_of_birth,
      phone,
      previous_family_name,
      employment_status,
    };

    Object.entries(allowedFields).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[key] = typeof value === "string" ? value.trim() : value;
      }
    });

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({
        message: "لم يتم إرسال أي بيانات للتعديل.",
      });
    }

    await db("wives")
      .where({
        id: wifeId,
        family_id: family.id,
      })
      .update(updates);

    const updatedWife = await db("wives")
      .where({ id: wifeId })
      .select(
        "id",
        "family_id",
        "full_name",
        "national_id",
        db.raw("DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth"),
        "phone",
        "previous_family_name",
        "employment_status",
        "created_at",
        "updated_at",
      )
      .first();

    return res.status(200).json({
      message: "تم تعديل بيانات الزوجة بنجاح.",
      data: {
        wife: updatedWife,
      },
    });
  } catch (error) {
    console.error("Update wife error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء تعديل بيانات الزوجة.",
    });
  }
};
const deleteMyWife = async (req, res) => {
  try {
    const wifeId = Number(req.params.wifeId);

    if (!Number.isInteger(wifeId) || wifeId <= 0) {
      return res.status(400).json({
        message: "رقم الزوجة غير صحيح.",
      });
    }

    const family = await db("families")
      .where({ user_id: req.user.id })
      .whereNull("deleted_at")
      .select("id", "form_status", "editing_enabled")
      .first();

    if (!family) {
      return res.status(404).json({
        message: "سجل الأسرة غير موجود.",
      });
    }

    if (!family.editing_enabled) {
      return res.status(403).json({
        message: "التعديل مغلق حاليًا لهذه الأسرة.",
      });
    }

    if (family.form_status !== "draft") {
      return res.status(403).json({
        message: "لا يمكن حذف بيانات الزوجة بعد اعتماد النموذج.",
      });
    }

    const wife = await db("wives")
      .where({
        id: wifeId,
        family_id: family.id,
      })
      .select("id", "full_name")
      .first();

    if (!wife) {
      return res.status(404).json({
        message: "بيانات الزوجة غير موجودة.",
      });
    }

    await db("wives")
      .where({
        id: wifeId,
        family_id: family.id,
      })
      .delete();

    return res.status(200).json({
      message: "تم حذف بيانات الزوجة بنجاح.",
      data: {
        wife: {
          id: wife.id,
          full_name: wife.full_name,
        },
      },
    });
  } catch (error) {
    console.error("Delete wife error:", error);

    return res.status(500).json({
      message: "حدث خطأ أثناء حذف بيانات الزوجة.",
    });
  }
};

module.exports = {
  // FAMILY PROFILE
  getMyFamily,
  updateMyFamily,
  uploadMyPhoto,
  deleteMyPhoto,
  getMyEditingStatus,
  getMyFormCompletion,
  submitMyFamilyForm,
  deleteMyFamily,

  // HOUSING
  getMyHousing,
  upsertMyHousing,
  deleteMyHousing,

  // WIVES
  createMyWife,
  getMyWives,
  getMyWife,
  updateMyWife,
  deleteMyWife,
};
