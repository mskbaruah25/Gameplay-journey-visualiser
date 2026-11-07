import assert from "node:assert/strict";
import test from "node:test";

// Run against a local server after importing the supplied dataset.
const base = process.env.LILA_API_URL ?? "http://127.0.0.1:3000";
const matchId = "b3550292-8f80-493a-a422-95c4e70f0a5e.nakama-0";

async function get(path) {
  const response = await fetch(base + path);
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result;
}

test("database health and all three actual map dimensions", async () => {
  assert.equal((await get("/api/health")).database, "connected");
  const { maps } = await get("/api/maps");
  assert.equal(maps.length, 3);
  assert.deepEqual(maps.find((map) => map.id === "GrandRift"), {
    id: "GrandRift", name: "Grand Rift", imagePath: "/maps/GrandRift.webp", width: 2160, height: 2158,
  });
});

test("match pagination includes all 796 supplied match IDs", async () => {
  const first = await get("/api/matches?limit=1");
  const second = await get("/api/matches?limit=1&offset=1");
  assert.equal(first.total, 796);
  assert.equal(first.hasMore, true);
  assert.notEqual(first.matches[0].id, second.matches[0].id);
});

test("match choices include distinct recorded participant counts with the same UTC scope as the overview", async () => {
  const first = await get("/api/matches?limit=500");
  const second = await get("/api/matches?limit=500&offset=500");
  const matches = [...first.matches, ...second.matches];
  assert.equal(matches.length, 796);
  assert.equal(matches.reduce((total, match) => total + match.eventCount, 0), 89016);
  assert.equal(matches.filter((match) => match.humans + match.bots > 1).length, 53);
  assert.ok(matches.every((match) => Number.isInteger(match.humans) && Number.isInteger(match.bots)
    && match.humans >= 0 && match.bots >= 0 && match.humans + match.bots >= 1));

  const listing = await get("/api/matches?mapId=AmbroseValley&date=2026-02-12&limit=500");
  const example = listing.matches.find((match) => match.id === "fbbc5d02-dd79-42fb-bba5-d768023891c8.nakama-0");
  assert.equal(example.humans, 1);
  assert.equal(example.bots, 15);

  // The cross-midnight recording is listed separately for each event date.
  const crossingId = "e325a53a-2e3c-46ba-9288-777fe508e8b7.nakama-0";
  for (const date of ["2026-02-09", "2026-02-10"]) {
    const page = await get(`/api/matches?date=${date}&limit=500`);
    const crossing = page.matches.find((match) => match.id === crossingId);
    assert.ok(crossing);
    const overview = await get(`/api/matches/${crossing.id}?date=${date}`);
    assert.equal(crossing.humans, overview.stats.humans);
    assert.equal(crossing.bots, overview.stats.bots);
    assert.equal(crossing.eventCount, overview.stats.eventCount);
  }
});

test("representative recordings preserve events and exclude the copied file", async () => {
  for (const [id, rows, humans, bots] of [
    [matchId, 217, 1, 0],
    ["fbbc5d02-dd79-42fb-bba5-d768023891c8.nakama-0", 1015, 1, 15],
    ["ac049b28-8116-4ff1-9e60-4be0537b8cc9.nakama-0", 271, 1, 6],
  ]) {
    const data = await get(`/api/matches/${id}`);
    assert.equal(data.stats.eventCount, rows);
    assert.equal(data.stats.humans, humans);
    assert.equal(data.stats.bots, bots);
  }
  const data = await get(`/api/matches/${matchId}`);
  assert.equal(data.stats.killEventCount, 38);
  assert.equal(data.stats.lootItems, 43);
});

test("playback groups simultaneous events without losing or repeating rows", async () => {
  const data = await get(`/api/matches/${matchId}/playback`);
  const events = data.frames.flatMap((frame) => frame.events);
  assert.equal(events.length, data.stats.eventCount);
  assert.equal(new Set(events.map((event) => event.id)).size, events.length);
  for (let index = 0; index < data.frames.length; index++) {
    const frame = data.frames[index];
    assert.ok(frame.events.every((event) => event.timestamp === frame.timestamp));
    if (index) assert.ok(frame.timestamp > data.frames[index - 1].timestamp);
  }
  const first = await get(`/api/matches/${matchId}/events?limit=10`);
  const second = await get(`/api/matches/${matchId}/events?limit=10&offset=10`);
  assert.equal(first.events.length, 10);
  assert.ok(second.events.every((event) => !first.events.some((previous) => previous.id === event.id)));
});

test("world X/Z coordinates map correctly on every minimap", async () => {
  // Origins and scales are the supplied README values. Y is elevation.
  const maps = [
    ["AmbroseValley", -370, -473, 900],
    ["GrandRift", -290, -290, 581],
    ["Lockdown", -500, -500, 1000],
  ];
  for (const [mapId, originX, originZ, scale] of maps) {
    const listing = await get(`/api/matches?mapId=${mapId}&limit=1`);
    const data = await get(`/api/matches/${listing.matches[0].id}/events?limit=100`);
    assert.ok(data.events.length > 0);
    for (const event of data.events) {
      assert.ok(Math.abs(event.minimapX - (event.x - originX) / scale) < 0.000001);
      assert.ok(Math.abs(event.minimapY - (1 - (event.z - originZ) / scale)) < 0.000001);
    }
  }
});

test("heatmap counts agree with recording metrics and remain inside the grid", async () => {
  const { stats } = await get(`/api/matches/${matchId}`);
  for (const [layer, expected] of Object.entries({
    traffic: stats.positionSamples, kills: stats.killEventCount,
    deaths: stats.deathEventCount, storm: stats.stormDeaths, loot: stats.lootItems,
  })) {
    const heatmap = await get(`/api/matches/${matchId}/heatmap?layer=${layer}`);
    assert.equal(heatmap.totalRecords, expected);
    assert.equal(heatmap.cells.reduce((sum, cell) => sum + cell.count, 0), expected);
    assert.ok(heatmap.cells.every((cell) => cell.x >= 0 && cell.x < 32 && cell.y >= 0 && cell.y < 32));
  }
});

test("UTC dates filter the returned records", async () => {
  const { dates } = await get("/api/dates?mapId=Lockdown");
  assert.ok(dates.length > 0);
  const date = dates[0];
  const listing = await get(`/api/matches?mapId=Lockdown&date=${date}&limit=1`);
  const data = await get(`/api/matches/${listing.matches[0].id}/playback?date=${date}`);
  assert.ok(data.frames.flatMap((frame) => frame.events).every((event) => event.eventDate === date));
});

test("invalid parameters and missing recordings return explicit errors", async () => {
  for (const [path, status] of [
    ["/api/matches?date=2026-02-30", 400],
    ["/api/matches?limit=-1", 400],
    ["/api/matches/not-a-recorded-match", 404],
    [`/api/matches/${matchId}/heatmap?layer=invalid`, 400],
    [`/api/matches/${matchId}/heatmap?gridSize=0`, 400],
    [`/api/matches/${matchId}/heatmap?actorType=invalid`, 400],
  ]) assert.equal((await fetch(base + path)).status, status, path);
  assert.equal((await fetch(base + "/api/matches", { method: "POST" })).status, 405);
});
