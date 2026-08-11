/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials: {
      host: "aws-1-ap-southeast-2.pooler.supabase.com",
      port: 5432,
      database: "postgres",
      user: "postgres.dyjafrghuauuerdwvzrv",
      password: "Helloshivam@33",
      ssl: "require",
    }
  }