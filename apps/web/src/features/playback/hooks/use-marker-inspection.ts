import { useEffect, useRef, useState } from "react";
import type { GameEvent } from "@/lib/gameplay-types";

interface Selection {
  event: GameEvent;
  frameIndex: number;
  recordingKey: string;
}

export function useMarkerInspection(recordingKey: string, frameIndex: number, hidden: string[], onPause: () => void) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const trigger = useRef<HTMLElement | SVGElement | null>(null);

  // A detail card must never describe a different recording or playback frame.
  useEffect(() => { setSelection(null); }, [recordingKey, frameIndex]);
  const event = selection?.recordingKey === recordingKey && selection.frameIndex === frameIndex
    && !hidden.includes(selection.event.participantId) ? selection.event : null;

  function inspect(event: GameEvent) {
    if (document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement) {
      // Keep the original map marker when changing records inside the inspector.
      if (!document.activeElement.closest(".marker-inspector")) trigger.current = document.activeElement;
    }
    onPause();
    setSelection({ event, frameIndex, recordingKey });
  }

  function close() {
    setSelection(null);
    if (trigger.current?.isConnected) trigger.current.focus();
  }

  return { event, inspect, close };
}
