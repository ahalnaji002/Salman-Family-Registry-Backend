require("dotenv").config();

const sharedConfig = {
  client: "mysql2",
  connection: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
  },
  migrations: {
    directory: "./database/migrations",
    tableName: "knex_migrations",
  },
  seeds: {
    directory: "./database/seeds",
  },
  pool: {
    min: 2,
    max: 10,
  },
};

module.exports = {
  development: sharedConfig,
  test: sharedConfig,
  production: sharedConfig,
};
