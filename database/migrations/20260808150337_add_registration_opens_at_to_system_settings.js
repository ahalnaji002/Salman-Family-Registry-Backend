exports.up = async function (knex) {
  await knex.schema.alterTable("system_settings", (table) => {
    table.timestamp("registration_opens_at").nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("system_settings", (table) => {
    table.dropColumn("registration_opens_at");
  });
};