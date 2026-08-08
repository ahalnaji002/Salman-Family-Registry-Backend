exports.up = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table
      .boolean("editing_override")
      .nullable()
      .defaultTo(null)
      .after("editing_enabled");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table.dropColumn("editing_override");
  });
};
