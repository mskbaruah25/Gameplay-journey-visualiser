import assert from "node:assert/strict";
import test from "node:test";
import { buildJourneyIndex, trailGeometry, visibleSampleCount, TRAIL_CHUNK_SIZE } from "../apps/web/src/features/playback/journey-index.ts";

function event(id, participantId, timestamp, eventType = "Position") {
  return { id, participantId, timestamp, eventType, minimapX: timestamp / 10000, minimapY: 0.5 };
}

test("journey lookup preserves simultaneous positions, backward seeks, gaps and post-death samples", () => {
  const frames = [
    { events: [event("a0", "a", 0), event("b0", "b", 0, "BotPosition")] },
    { events: [event("a1", "a", 5), event("a2", "a", 5), event("death", "a", 5, "BotKilled")] },
    { events: [event("a3", "a", 20), event("b1", "b", 20, "BotPosition")] },
    { events: [event("a4", "a", 36)] },
  ];
  const journeys = buildJourneyIndex(frames);
  for (const frameIndex of [3, 0, 2, -1, 1, 3]) {
    for (const [id, journey] of journeys) {
      const expected = frames.slice(0, frameIndex + 1).flatMap((frame) => frame.events)
        .filter((event) => event.participantId === id && ["Position", "BotPosition"].includes(event.eventType));
      const count = visibleSampleCount(journey.samples, frameIndex);
      assert.deepEqual(journey.samples.slice(0, count).map((sample) => sample.event), expected);
    }
  }
  const journey = journeys.get("a");
  assert.equal(journey.samples.length, 5);
  assert.equal(journey.chunks[0].trail, "M0,500 L0.5,500 L0.5,500 L2,500 M3.6,500");
});

test("cached chunk boundaries retain precisely the original trail segments and every sampled point", () => {
  const frames = Array.from({ length: 400 }, (_, index) => ({ events: [
    event(String(index), "a", index + (index >= 128 ? 20 : 0)),
  ] }));
  const journey = buildJourneyIndex(frames).get("a");
  function segments(paths) {
    const result = [];
    for (const path of paths) {
      let previous;
      for (const [, command, x, y] of path.matchAll(/([ML])([\d.e+-]+),([\d.e+-]+)/g)) {
        const point = `${x},${y}`;
        if (command === "L") result.push([previous, point]);
        previous = point;
      }
    }
    return result;
  }
  for (const count of [1, 127, 128, 129, 255, 256, 257, 400, 0, 129]) {
    const complete = Math.floor(count / TRAIL_CHUNK_SIZE);
    const geometry = journey.chunks.slice(0, complete);
    if (count % TRAIL_CHUNK_SIZE) geometry.push(trailGeometry(journey.samples, complete * TRAIL_CHUNK_SIZE, count));
    const original = trailGeometry(journey.samples, 0, count);
    assert.deepEqual(segments(geometry.map((part) => part.trail)), segments([original.trail]));
    assert.equal(geometry.reduce((sum, part) => sum + (part.dots.match(/l0,0/g)?.length ?? 0), 0), count);
  }
});

test("50,000 positions across 100 participants remain addressable without rescanning frames", () => {
  const frames = Array.from({ length: 500 }, (_, frame) => ({
    events: Array.from({ length: 100 }, (_, player) => event(`${frame}:${player}`, String(player), frame * 2)),
  }));
  const journeys = buildJourneyIndex(frames);
  assert.equal(journeys.size, 100);
  assert.equal([...journeys.values()].reduce((sum, journey) => sum + journey.samples.length, 0), 50000);
  for (const journey of journeys.values()) {
    assert.equal(visibleSampleCount(journey.samples, 250), 251);
    assert.equal(visibleSampleCount(journey.samples, 0), 1);
    assert.equal(visibleSampleCount(journey.samples, 499), 500);
    assert.equal(journey.chunks.length, 4);
  }
});
