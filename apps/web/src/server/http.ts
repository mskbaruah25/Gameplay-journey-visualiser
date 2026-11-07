export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function apiResponse(read: () => Promise<unknown>) {
  try {
    return Response.json(await read(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Gameplay API failed:", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ error: "Gameplay data is unavailable. Check the database connection and ingestion status." }, { status: 503 });
  }
}

export function dateParameter(parameters: URLSearchParams) {
  const date = parameters.get("date");
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith("0000-") || Number.isNaN(Date.parse(`${date}T00:00:00Z`))
      || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) {
    throw new ApiError(400, "date must be a valid UTC date in YYYY-MM-DD format.");
  }
  return date;
}

export function integerParameter(parameters: URLSearchParams, name: string, fallback: number, minimum: number, maximum: number) {
  const raw = parameters.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new ApiError(400, `${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

export function matchParameter(value: string) {
  if (!value || value.length > 200) throw new ApiError(400, "Invalid match identifier.");
  return value;
}
