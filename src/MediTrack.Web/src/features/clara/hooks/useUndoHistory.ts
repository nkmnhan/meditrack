import { useState, useRef } from "react";

interface UndoHistoryResult<T> {
  readonly state: T;
  readonly setState: (newState: T) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
}

/**
 * Generic undo/redo hook with configurable snapshot depth.
 * Push snapshots explicitly (e.g. on blur) rather than per-keystroke
 * to keep the history stack meaningful.
 */
export function useUndoHistory<T>(
  initial: T,
  maxSnapshots = 20,
): UndoHistoryResult<T> {
  const [state, setStateInternal] = useState<T>(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const setState = (newState: T) => {
    pastRef.current = [...pastRef.current, state].slice(-maxSnapshots);
    futureRef.current = [];
    setStateInternal(newState);
  };

  const undo = () => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, state];
    setStateInternal(previous);
  };

  const redo = () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, state];
    setStateInternal(next);
  };

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
}
