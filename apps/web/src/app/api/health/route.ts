import { apiResponse } from "@/server/http";
import { readSnapshot } from "@/server/database";

export async function GET() {
  return apiResponse(() => readSnapshot(async (client) => {
    const result = await client.query("SELECT max(finished_at) AS \"lastImportAt\" FROM etl_runs WHERE status='succeeded'");
    return { status: "ok", database: "connected", ...result.rows[0] };
  }));
}
