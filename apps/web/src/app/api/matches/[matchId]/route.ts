import type { NextRequest } from "next/server";
import { apiResponse, dateParameter, matchParameter } from "@/server/http";
import { matchOverview } from "@/server/gameplay/queries";

export async function GET(request: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  return apiResponse(async () => {
    const { matchId } = await context.params;
    return matchOverview(matchParameter(matchId), dateParameter(request.nextUrl.searchParams));
  });
}
