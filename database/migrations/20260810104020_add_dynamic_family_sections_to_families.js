exports.up = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table.boolean("has_children").nullable();
    table.boolean("has_special_cases").nullable();
    table.boolean("has_married_daughters").nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table.dropColumn("has_married_daughters");
    table.dropColumn("has_special_cases");
    table.dropColumn("has_children");
  });
};
