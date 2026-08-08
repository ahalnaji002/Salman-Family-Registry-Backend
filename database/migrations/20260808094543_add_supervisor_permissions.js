exports.up = async function (knex) {
  const permissions = [
    {
      name: "view_families",
      display_name: "عرض الأسر",
    },
    {
      name: "update_families",
      display_name: "تعديل بيانات الأسر",
    },
    {
      name: "export_families",
      display_name: "تصدير بيانات الأسر",
    },
    {
      name: "view_settings",
      display_name: "عرض إعدادات النظام",
    },
  ];

  for (const permission of permissions) {
    const existing = await knex("permissions")
      .where({ name: permission.name })
      .first();

    if (!existing) {
      await knex("permissions").insert(permission);
    }
  }
};

exports.down = async function (knex) {
  await knex("permissions")
    .whereIn("name", [
      "view_families",
      "update_families",
      "export_families",
      "view_settings",
    ])
    .delete();
};
