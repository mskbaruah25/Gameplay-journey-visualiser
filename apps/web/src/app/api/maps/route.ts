import { apiResponse } from "@/server/http";
import { listMaps } from "@/server/gameplay/queries";

export async function GET() {
  return apiResponse(listMaps);
}
