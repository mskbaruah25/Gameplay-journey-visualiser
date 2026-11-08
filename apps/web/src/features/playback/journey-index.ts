import type { GameEvent, PlaybackFrame } from "../../lib/gameplay-types";

export const TRAIL_CHUNK_SIZE = 128;
export interface JourneySample { frameIndex: number; event: GameEvent }
export interface TrailGeometry { trail: string; dots: string }
export interface IndexedJourney { samples: JourneySample[]; chunks: TrailGeometry[] }

export function trailGeometry(samples: JourneySample[], start: number, end: number): TrailGeometry {
  const trail: string[] = [];
  const dots: string[] = [];
  for (let index = start; index < end; index++) {
    const event = samples[index].event;
    const previous = samples[index - 1]?.event;
    const point = `${event.minimapX * 1000},${event.minimapY * 1000}`;
    const connected = previous && event.timestamp - previous.timestamp <= 15;
    // Repeat the preceding endpoint at a chunk boundary to keep its connecting
    // segment, while preserving the original 15-second break rule.
    if (index === start && connected) trail.push(`M${previous.minimapX * 1000},${previous.minimapY * 1000}`);
    trail.push(`${connected ? "L" : "M"}${point}`);
    // Round-capped zero-length strokes retain every recorded point in one path.
    dots.push(`M${point}l0,0`);
  }
  return { trail: trail.join(" "), dots: dots.join(" ") };
}

export function buildJourneyIndex(frames: PlaybackFrame[]): Map<string, IndexedJourney> {
  const journeys = new Map<string, IndexedJourney>();
  frames.forEach((frame, frameIndex) => {
    for (const event of frame.events) {
      if (event.eventType !== "Position" && event.eventType !== "BotPosition") continue;
      let journey = journeys.get(event.participantId);
      if (!journey) {
        journey = { samples: [], chunks: [] };
        journeys.set(event.participantId, journey);
      }
      journey.samples.push({ frameIndex, event });
    }
  });
  for (const journey of journeys.values()) {
    for (let start = 0; start < journey.samples.length; start += TRAIL_CHUNK_SIZE) {
      journey.chunks.push(trailGeometry(journey.samples, start, Math.min(start + TRAIL_CHUNK_SIZE, journey.samples.length)));
    }
  }
  return journeys;
}

// Upper bound includes every sample in a simultaneous timestamp group and
// supports backward seeks without retaining positions from the future.
export function visibleSampleCount(samples: JourneySample[], frameIndex: number): number {
  let low = 0;
  let high = samples.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].frameIndex <= frameIndex) low = middle + 1;
    else high = middle;
  }
  return low;
}
