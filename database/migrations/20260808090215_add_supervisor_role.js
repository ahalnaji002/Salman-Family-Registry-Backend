exports.up = async function (knex) {
  const existingSupervisor = await knex("roles")
    .where({ name: "supervisor" })
    .first();

  if (!existingSupervisor) {
    await knex("roles").insert({
      name: "supervisor",
      display_name: "مشرف",
    });
  }
};

exports.down = async function (knex) {
  await knex("roles").where({ name: "supervisor" }).delete();
};
