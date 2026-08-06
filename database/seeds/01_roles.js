exports.seed = async function (knex) {
  await knex("roles")
    .insert([
      {
        name: "family_head",
        display_name: "رب الأسرة",
      },
      {
        name: "admin",
        display_name: "مدير النظام",
      },
    ])
    .onConflict("name")
    .merge(["display_name"]);
};
