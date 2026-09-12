import { Pool } from "pg";

const globalForPg = global as unknown as { __fortixamPgPool?: Pool };

export const pool =
  globalForPg.__fortixamPgPool ||
  new Pool({
    host: process.env.DATABASE_HOST || "localhost",
    port: Number(process.env.DATABASE_PORT) || 54322,
    database: process.env.DATABASE_NAME || "titanium",
    user: process.env.DATABASE_USER || "titanium",
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.__fortixamPgPool = pool;
}
