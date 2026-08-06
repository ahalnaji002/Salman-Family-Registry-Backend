const bcrypt = require("bcryptjs");

exports.seed = async function (knex) {
  const adminNationalId = "400000001";
  const adminPassword = "Admin@12345";

  const adminRole = await knex("roles").where({ name: "admin" }).first();

  if (!adminRole) {
    throw new Error("Admin role does not exist. Run the roles seeder first.");
  }

  const existingAdmin = await knex("users")
    .where({ national_id: adminNationalId })
    .first();

  if (existingAdmin) {
    const existingRole = await knex("user_roles")
      .where({
        user_id: existingAdmin.id,
        role_id: adminRole.id,
      })
      .first();

    if (!existingRole) {
      await knex("user_roles").insert({
        user_id: existingAdmin.id,
        role_id: adminRole.id,
        assigned_by: null,
        is_active: true,
      });
    }

    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await knex.transaction(async (trx) => {
    const [adminId] = await trx("users").insert({
      full_name: "مدير النظام",
      national_id: adminNationalId,
      phone: "0590000001",
      password_hash: passwordHash,
      is_active: true,
    });

    await trx("user_roles").insert({
      user_id: adminId,
      role_id: adminRole.id,
      assigned_by: null,
      is_active: true,
    });
  });
};
