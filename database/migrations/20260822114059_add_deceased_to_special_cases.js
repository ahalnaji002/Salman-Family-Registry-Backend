exports.up = async function (knex) {
  await knex.raw(`
    ALTER TABLE special_cases
    MODIFY COLUMN case_type ENUM(
      'martyr',
      'deceased',
      'injured',
      'disability',
      'patient',
      'pregnant'
    ) NOT NULL
  `);
};

exports.down = async function (knex) {
  await knex.raw(`
    ALTER TABLE special_cases
    MODIFY COLUMN case_type ENUM(
      'martyr',
      'injured',
      'disability',
      'patient',
      'pregnant'
    ) NOT NULL
  `);
};
