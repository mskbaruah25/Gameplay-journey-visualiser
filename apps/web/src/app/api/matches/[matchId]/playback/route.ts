import type { NextRequest } from "next/server";
import { apiResponse, dateParameter, matchParameter } from "@/server/http";
import { matchPlayback } from "@/server/gameplay/queries";

export async function GET(request: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  return apiResponse(async () => {
    const { matchId } = await context.params;
    return matchPlayback(matchParameter(matchId), dateParameter(request.nextUrl.searchParams));
  });
}
