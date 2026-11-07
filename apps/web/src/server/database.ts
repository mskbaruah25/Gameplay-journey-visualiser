import "server-only";
import { Pool, type PoolClient } from "pg";

const server = globalThis as typeof globalThis & { lilaDatabase?: Pool };

export function database() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }
  // Reuse a small pool across requests and development hot reloads.
  if (!server.lilaDatabase) {
    server.lilaDatabase = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    server.lilaDatabase.on("error", (error) => console.error("Idle database connection failed:", error.message));
  }
  return server.lilaDatabase;
}

export async function readSnapshot<T>(read: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try {
    // Metadata and events in one response must come from the same published import.
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    // Transaction-local settings also work through Neon's transaction pooler.
    await client.query("SET LOCAL statement_timeout = '15s'");
    const result = await read(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
