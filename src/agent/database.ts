import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

export const db = mysql.createPool({
  host:               process.env.DB_HOST     || "localhost",
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "trading_bot",
  port:               parseInt(process.env.DB_PORT || "3306"),
  waitForConnections: true,
  connectionLimit:    10,
});

db.getConnection()
  .then(() => console.log("[DB] MySQL connected ✅"))
  .catch((err) => console.error("[DB] Connection failed ❌", err));