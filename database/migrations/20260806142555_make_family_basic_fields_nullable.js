exports.up = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table.date("date_of_birth").nullable().alter();

    table
      .enum("marital_status", ["single", "married", "divorced", "widowed"])
      .nullable()
      .alter();

    table
      .enum("income_category", ["0-1000", "1000-3000", "3000+"])
      .nullable()
      .alter();

    table
      .enum("work_status", ["employee", "worker", "not_working"])
      .nullable()
      .alter();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("families", (table) => {
    table.date("date_of_birth").notNullable().alter();

    table
      .enum("marital_status", ["single", "married", "divorced", "widowed"])
      .notNullable()
      .alter();

    table
      .enum("income_category", ["0-1000", "1000-3000", "3000+"])
      .notNullable()
      .alter();

    table
      .enum("work_status", ["employee", "worker", "not_working"])
      .notNullable()
      .alter();
  });
};
