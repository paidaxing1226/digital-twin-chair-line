import { describe, expect, it } from "vitest";
import {
  createInitialProductionState,
  injectStationFault,
  recoverProductionLine,
  resetProductionLine,
  selectStation,
  startProductionLine,
  tickProductionLine,
  toggleReplayMode
} from "./simulation";

describe("production line simulation", () => {
  it("starts paused and moves running stations forward after start", () => {
    const initial = createInitialProductionState();
    const started = startProductionLine(initial);
    const next = tickProductionLine(started, 6);

    expect(initial.mode).toBe("paused");
    expect(started.mode).toBe("running");
    expect(next.seatProgress).toBeGreaterThan(started.seatProgress);
    expect(next.metrics.runtimeMinutes).toBeGreaterThan(started.metrics.runtimeMinutes);
    expect(next.stations.some((station) => station.status === "running")).toBe(true);
  });

  it("injects a station fault that freezes progress and degrades metrics", () => {
    const running = startProductionLine(createInitialProductionState());
    const faulted = injectStationFault(running, "inspection");
    const afterTick = tickProductionLine(faulted, 12);

    expect(faulted.mode).toBe("fault");
    expect(faulted.stations.find((station) => station.id === "inspection")?.status).toBe(
      "fault"
    );
    expect(afterTick.seatProgress).toBe(faulted.seatProgress);
    expect(afterTick.metrics.oee).toBeLessThan(running.metrics.oee);
    expect(afterTick.metrics.faultCount).toBe(running.metrics.faultCount + 1);
  });

  it("recovers from a fault and records bounded history snapshots", () => {
    let state = injectStationFault(startProductionLine(createInitialProductionState()), "armrest");
    state = recoverProductionLine(state);

    for (let index = 0; index < 80; index += 1) {
      state = tickProductionLine(state, 2);
    }

    expect(state.mode).toBe("running");
    expect(state.stations.every((station) => station.status !== "fault")).toBe(true);
    expect(state.history.length).toBeLessThanOrEqual(60);
  });

  it("supports selecting stations, replay mode, and reset", () => {
    const state = tickProductionLine(
      selectStation(startProductionLine(createInitialProductionState()), "packaging"),
      10
    );
    const replay = toggleReplayMode(state);
    const reset = resetProductionLine(replay);

    expect(state.selectedStationId).toBe("packaging");
    expect(replay.mode).toBe("replay");
    expect(replay.replayIndex).toBeGreaterThanOrEqual(0);
    expect(reset.mode).toBe("paused");
    expect(reset.metrics.output).toBe(0);
    expect(reset.selectedStationId).toBe("frame");
  });
});
