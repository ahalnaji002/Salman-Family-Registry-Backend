exports.up = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table.boolean("deceased_spouse_from_salman").nullable();

    table.enum("deceased_spouse_case_type", ["martyr", "deceased"]).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table.dropColumn("deceased_spouse_case_type");
    table.dropColumn("deceased_spouse_from_salman");
  });
};
