exports.up = async function (knex) {
  await knex.schema.createTable("verification_codes", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.string("code_hash", 255).notNullable();

    table
      .enum("purpose", ["password_reset"])
      .notNullable()
      .defaultTo("password_reset");

    table.timestamp("expires_at").notNullable();
    table.timestamp("verified_at").nullable();
    table.timestamp("used_at").nullable();

    table.integer("attempts").unsigned().notNullable().defaultTo(0);
    table.boolean("is_active").notNullable().defaultTo(true);

    table.timestamps(true, true);

    table.index("user_id");
    table.index("expires_at");
    table.index(["user_id", "purpose", "is_active"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("verification_codes");
};
