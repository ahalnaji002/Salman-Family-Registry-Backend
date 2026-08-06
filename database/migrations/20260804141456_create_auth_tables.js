exports.up = async function (knex) {
  await knex.schema.createTable("users", (table) => {
    table.bigIncrements("id").primary();
    table.string("full_name", 150).notNullable();
    table.string("national_id", 9).notNullable().unique();
    table.string("phone", 15).notNullable();
    table.string("password_hash", 255).notNullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("phone_verified_at").nullable();
    table.timestamp("last_login_at").nullable();
    table.timestamps(true, true);

    table.index("phone");
  });

  await knex.schema.createTable("roles", (table) => {
    table.bigIncrements("id").primary();
    table.string("name", 50).notNullable().unique();
    table.string("display_name", 100).notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("permissions", (table) => {
    table.bigIncrements("id").primary();
    table.string("name", 80).notNullable().unique();
    table.string("display_name", 120).notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("user_roles", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table
      .bigInteger("role_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("roles")
      .onDelete("CASCADE");

    table
      .bigInteger("assigned_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.boolean("is_active").notNullable().defaultTo(true);
    table.timestamp("assigned_at").defaultTo(knex.fn.now());
    table.timestamp("revoked_at").nullable();

    table
      .bigInteger("revoked_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.timestamps(true, true);

    table.unique(["user_id", "role_id"]);
  });

  await knex.schema.createTable("user_permissions", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("user_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table
      .bigInteger("permission_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("permissions")
      .onDelete("CASCADE");

    table
      .bigInteger("granted_by")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");

    table.timestamps(true, true);

    table.unique(["user_id", "permission_id"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("user_permissions");
  await knex.schema.dropTableIfExists("user_roles");
  await knex.schema.dropTableIfExists("permissions");
  await knex.schema.dropTableIfExists("roles");
  await knex.schema.dropTableIfExists("users");
};
