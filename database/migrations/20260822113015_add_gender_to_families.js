exports.up = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table.enum("gender", ["male", "female"]).nullable();
  });

  await knex("families").whereNull("gender").update({
    gender: "male",
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table.dropColumn("gender");
  });
};
