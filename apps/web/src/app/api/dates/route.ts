import type { NextRequest } from "next/server";
import { apiResponse } from "@/server/http";
import { listDates } from "@/server/gameplay/queries";

export async function GET(request: NextRequest) {
  return apiResponse(() => listDates(request.nextUrl.searchParams.get("mapId")));
}
