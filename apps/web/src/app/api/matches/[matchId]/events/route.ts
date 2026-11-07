import type { NextRequest } from "next/server";
import { apiResponse, dateParameter, integerParameter, matchParameter } from "@/server/http";
import { listEvents } from "@/server/gameplay/queries";

export async function GET(request: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  return apiResponse(async () => {
    const { matchId } = await context.params;
    const parameters = request.nextUrl.searchParams;
    return listEvents(matchParameter(matchId), dateParameter(parameters),
      integerParameter(parameters, "limit", 500, 1, 1000), integerParameter(parameters, "offset", 0, 0, 10000000));
  });
}
