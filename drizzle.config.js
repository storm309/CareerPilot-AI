/** @type { import("drizzle-kit").Config } */
export default {
    schema: "./utils/schema.js",
    dialect: 'postgresql',
    dbCredentials: {
      url: "postgresql://postgres.dyjafrghuauuerdwvzrv:Helloshivam@33@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
    }
  }