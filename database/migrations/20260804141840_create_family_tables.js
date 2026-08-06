exports.up = async function (knex) {
  // =========================
  // 1. Families
  // =========================
  await knex.schema.createTable("families", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("user_id")
      .unsigned()
      .nullable()
      .unique()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.string("full_name", 150).notNullable();
    table.string("national_id", 9).notNullable().unique();
    table.date("date_of_birth").notNullable();
    table.string("phone", 15).notNullable();
    table.string("blood_type", 5).nullable();

    table
      .enum("marital_status", ["single", "married", "divorced", "widowed"])
      .notNullable();

    table
      .enum("income_category", ["0-1000", "1000-3000", "3000+"])
      .notNullable();

    table
      .enum("work_status", ["employee", "worker", "not_working"])
      .notNullable();

    table.enum("job_type", ["government", "private", "other"]).nullable();

    table.string("other_job_type", 150).nullable();
    table.string("personal_photo_path", 255).nullable();

    table
      .enum("form_status", ["draft", "submitted"])
      .notNullable()
      .defaultTo("draft");

    table.boolean("editing_enabled").notNullable().defaultTo(true);
    table.timestamp("submitted_at").nullable();

    table
      .bigInteger("created_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .bigInteger("updated_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.timestamp("deleted_at").nullable();

    table
      .bigInteger("deleted_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.timestamps(true, true);

    table.index("phone");
    table.index("full_name");
    table.index("form_status");
    table.index("deleted_at");
  });

  // =========================
  // 2. Family Housing
  // =========================
  await knex.schema.createTable("family_housing", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("family_id")
      .unsigned()
      .notNullable()
      .unique()
      .references("id")
      .inTable("families")
      .onDelete("CASCADE");

    table
      .enum("previous_area", [
        "north_gaza",
        "gaza",
        "middle_area",
        "south_gaza",
      ])
      .notNullable();

    table
      .enum("current_housing_type", ["owned", "rented", "displaced"])
      .notNullable();

    table
      .enum("displacement_type", ["tent", "shelter_center", "relatives_house"])
      .nullable();

    table.string("current_address", 255).notNullable();

    table.timestamps(true, true);
  });

  // =========================
  // 3. Wives
  // =========================
  await knex.schema.createTable("wives", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("family_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("families")
      .onDelete("CASCADE");

    table.string("full_name", 150).notNullable();
    table.string("national_id", 9).notNullable();
    table.date("date_of_birth").notNullable();
    table.string("phone", 15).notNullable();
    table.string("previous_family_name", 150).notNullable();
    table.string("employment_status", 150).notNullable();

    table.timestamps(true, true);

    table.unique(["family_id", "national_id"]);
    table.index("family_id");
    table.index("national_id");
  });

  // =========================
  // 4. Children
  // =========================
  await knex.schema.createTable("children", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("family_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("families")
      .onDelete("CASCADE");

    table.string("full_name", 150).notNullable();
    table.string("national_id", 9).notNullable();
    table.date("date_of_birth").notNullable();

    table
      .enum("education_status", [
        "under_6",
        "school",
        "university",
        "not_studying",
      ])
      .notNullable();

    table.string("institution_name", 200).nullable();

    table.timestamps(true, true);

    table.unique(["family_id", "national_id"]);
    table.index("family_id");
    table.index("national_id");
  });

  // =========================
  // 5. Special Cases
  // =========================
  await knex.schema.createTable("special_cases", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("family_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("families")
      .onDelete("CASCADE");

    table.string("full_name", 150).notNullable();
    table.string("national_id", 9).notNullable();
    table.date("date_of_birth").notNullable();
    table.string("relationship", 100).notNullable();

    table
      .enum("case_type", [
        "martyr",
        "injured",
        "disability",
        "patient",
        "pregnant",
      ])
      .notNullable();

    table.text("case_details").notNullable();

    table.timestamps(true, true);

    table.unique(["family_id", "national_id", "case_type"]);
    table.index("family_id");
    table.index("national_id");
    table.index("case_type");
  });

  // =========================
  // 6. Married Daughters
  // =========================
  await knex.schema.createTable("married_daughters", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("family_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("families")
      .onDelete("CASCADE");

    table.string("full_name", 150).notNullable();
    table.string("national_id", 9).notNullable();
    table.string("phone", 15).notNullable();
    table.string("husband_full_name", 150).notNullable();
    table.string("husband_phone", 15).notNullable();

    table.timestamps(true, true);

    table.unique(["family_id", "national_id"]);
    table.index("family_id");
    table.index("national_id");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("married_daughters");
  await knex.schema.dropTableIfExists("special_cases");
  await knex.schema.dropTableIfExists("children");
  await knex.schema.dropTableIfExists("wives");
  await knex.schema.dropTableIfExists("family_housing");
  await knex.schema.dropTableIfExists("families");
};
