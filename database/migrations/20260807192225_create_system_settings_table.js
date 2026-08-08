exports.up = async function (knex) {
  await knex.schema.createTable("system_settings", (table) => {
    table.bigIncrements("id").primary();

    table.boolean("registration_enabled").notNullable().defaultTo(true);

    table.boolean("global_editing_enabled").notNullable().defaultTo(true);

    table
      .string("system_name", 150)
      .notNullable()
      .defaultTo("Salman Family Registry");

    table.timestamp("registration_closes_at").nullable();

    table.bigInteger("updated_by").unsigned().nullable();

    table
      .foreign("updated_by")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.timestamps(true, true);
  });

  await knex("system_settings").insert({
    registration_enabled: true,
    global_editing_enabled: true,
    system_name: "Salman Family Registry",
    registration_closes_at: null,
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("system_settings");
};
