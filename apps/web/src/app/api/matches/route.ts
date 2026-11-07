import type { NextRequest } from "next/server";
import { apiResponse, dateParameter, integerParameter } from "@/server/http";
import { listMatches } from "@/server/gameplay/queries";

export async function GET(request: NextRequest) {
  return apiResponse(() => {
    const parameters = request.nextUrl.searchParams;
    return listMatches(parameters.get("mapId"), dateParameter(parameters),
      integerParameter(parameters, "limit", 100, 1, 500), integerParameter(parameters, "offset", 0, 0, 1000000));
  });
}
