import { Pool } from "pg";

if (!process.env.DATABASE_PASSWORD) {
  throw new Error("DATABASE_PASSWORD environment variable is required");
}

const pool = new Pool({
  host: process.env.DATABASE_HOST || "localhost",
  port: Number(process.env.DATABASE_PORT) || 54322,
  database: process.env.DATABASE_NAME || "titanium",
  user: process.env.DATABASE_USER || "titanium",
  password: process.env.DATABASE_PASSWORD,
});

export default pool;
