exports.up = async function (knex) {
  await knex.schema.alterTable("children", (table) => {
    table
      .enum("gender", ["male", "female"])
      .nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("children", (table) => {
    table.dropColumn("gender");
  });
};