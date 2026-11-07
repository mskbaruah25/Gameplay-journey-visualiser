import type { NextRequest } from "next/server";
import { apiResponse, dateParameter, integerParameter, matchParameter } from "@/server/http";
import { matchHeatmap } from "@/server/gameplay/queries";

export async function GET(request: NextRequest, context: { params: Promise<{ matchId: string }> }) {
  return apiResponse(async () => {
    const { matchId } = await context.params;
    const parameters = request.nextUrl.searchParams;
    return matchHeatmap(matchParameter(matchId), dateParameter(parameters), parameters.get("layer") ?? "traffic",
      integerParameter(parameters, "gridSize", 32, 8, 128), parameters.get("actorType"));
  });
}
