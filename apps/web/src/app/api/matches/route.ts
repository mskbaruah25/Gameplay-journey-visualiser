import type { NextRequest } from "next/server";
import { ApiError, apiResponse, dateParameter, integerParameter } from "@/server/http";
import { listMatches } from "@/server/gameplay/queries";

export async function GET(request: NextRequest) {
  return apiResponse(() => {
    const parameters = request.nextUrl.searchParams;
    const search = parameters.get("search") ?? "";
    const multipleOnly = parameters.get("multipleOnly");
    if (search.length > 200) throw new ApiError(400, "search must be at most 200 characters.");
    if (multipleOnly !== null && multipleOnly !== "true" && multipleOnly !== "false") {
      throw new ApiError(400, "multipleOnly must be true or false.");
    }
    return listMatches(parameters.get("mapId"), dateParameter(parameters),
      integerParameter(parameters, "limit", 100, 1, 500), integerParameter(parameters, "offset", 0, 0, 1000000),
      search, multipleOnly === "true");
  });
}
