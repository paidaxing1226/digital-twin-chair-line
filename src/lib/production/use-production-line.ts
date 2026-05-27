"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LineControls, ProductionState, StationId } from "./types";
import {
  createInitialProductionState,
  injectStationFault,
  pauseProductionLine,
  recoverProductionLine,
  resetProductionLine,
  selectStation,
  startProductionLine,
  tickProductionLine,
  toggleReplayMode
} from "./simulation";

export function useProductionLine(): ProductionState & LineControls & {
  selectStation: (stationId: StationId) => void;
} {
  const [state, setState] = useState<ProductionState>(() =>
    createInitialProductionState()
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setState((current) => tickProductionLine(current, 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const controls = useMemo<LineControls>(
    () => ({
      startLine: () => setState((current) => startProductionLine(current)),
      pauseLine: () => setState((current) => pauseProductionLine(current)),
      injectFault: (stationId: StationId) =>
        setState((current) => injectStationFault(current, stationId)),
      recoverFault: () => setState((current) => recoverProductionLine(current)),
      resetLine: () => setState((current) => resetProductionLine(current)),
      toggleReplay: () => setState((current) => toggleReplayMode(current))
    }),
    []
  );

  const handleSelectStation = useCallback((stationId: StationId) => {
    setState((current) => selectStation(current, stationId));
  }, []);

  return {
    ...state,
    ...controls,
    selectStation: handleSelectStation
  };
}
