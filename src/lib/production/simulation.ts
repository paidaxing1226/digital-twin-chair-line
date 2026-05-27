import type {
  LineMode,
  ProductionMetrics,
  ProductionSnapshot,
  ProductionState,
  Station,
  StationId,
  StationStatus
} from "./types";

export const STATION_IDS: StationId[] = [
  "frame",
  "cushion",
  "armrest",
  "inspection",
  "packaging"
];

const STATION_NAMES: Record<StationId, string> = {
  frame: "框架组装",
  cushion: "坐垫安装",
  armrest: "扶手安装",
  inspection: "质量检测",
  packaging: "下线包装"
};

const STATION_TASKS: Record<StationId, string> = {
  frame: "焊接座椅骨架并校准夹具",
  cushion: "定位坐垫并完成锁附",
  armrest: "安装左右扶手与扭矩复核",
  inspection: "视觉检测与压力测试",
  packaging: "扫码入库并等待装车"
};

const INITIAL_METRICS: ProductionMetrics = {
  oee: 91.8,
  output: 0,
  qualityRate: 98.6,
  cycleTime: 42,
  faultCount: 0,
  runtimeMinutes: 0
};

const HISTORY_LIMIT = 60;
const SECONDS_PER_UNIT = 54;

function createStations(activeIndex: number, mode: LineMode): Station[] {
  return STATION_IDS.map((id, index) => {
    let status: StationStatus = "idle";

    if (mode === "running") {
      if (index < activeIndex) {
        status = "complete";
      } else if (index === activeIndex) {
        status = "running";
      }
    }

    return {
      id,
      name: STATION_NAMES[id],
      order: index + 1,
      status,
      task: STATION_TASKS[id],
      cycleTime: 36 + index * 4,
      qualityRate: Number((99.1 - index * 0.35).toFixed(1)),
      alert: null
    };
  });
}

function activeIndexFromProgress(progress: number): number {
  return Math.min(STATION_IDS.length - 1, Math.floor(progress * STATION_IDS.length));
}

function snapshotOf(state: ProductionState): ProductionSnapshot {
  return {
    timestamp: state.timestamp,
    mode: state.mode,
    metrics: state.metrics,
    stations: state.stations,
    seatProgress: state.seatProgress
  };
}

function withHistory(state: ProductionState): ProductionState {
  const nextHistory = [...state.history, snapshotOf(state)].slice(-HISTORY_LIMIT);
  return {
    ...state,
    history: nextHistory
  };
}

function rounded(value: number): number {
  return Number(value.toFixed(1));
}

export function createInitialProductionState(): ProductionState {
  return {
    timestamp: 0,
    mode: "paused",
    metrics: INITIAL_METRICS,
    stations: createStations(0, "paused"),
    seatProgress: 0,
    selectedStationId: "frame",
    history: [],
    replayIndex: 0
  };
}

export function startProductionLine(state: ProductionState): ProductionState {
  const activeIndex = activeIndexFromProgress(state.seatProgress);

  return {
    ...state,
    mode: "running",
    stations: createStations(activeIndex, "running"),
    replayIndex: 0
  };
}

export function pauseProductionLine(state: ProductionState): ProductionState {
  return {
    ...state,
    mode: "paused",
    stations: state.stations.map((station) =>
      station.status === "running" ? { ...station, status: "idle" } : station
    )
  };
}

export function injectStationFault(
  state: ProductionState,
  stationId: StationId
): ProductionState {
  return withHistory({
    ...state,
    mode: "fault",
    metrics: {
      ...state.metrics,
      oee: Math.max(48, rounded(state.metrics.oee - 18)),
      qualityRate: Math.max(88, rounded(state.metrics.qualityRate - 3.6)),
      faultCount: state.metrics.faultCount + 1
    },
    selectedStationId: stationId,
    stations: state.stations.map((station) => {
      if (station.id === stationId) {
        return {
          ...station,
          status: "fault",
          alert: `${station.name} 出现节拍异常，等待复位`
        };
      }

      return station.status === "running"
        ? { ...station, status: "blocked", alert: "上游故障导致等待" }
        : station;
    })
  });
}

export function recoverProductionLine(state: ProductionState): ProductionState {
  const activeIndex = activeIndexFromProgress(state.seatProgress);

  return withHistory({
    ...state,
    mode: "running",
    metrics: {
      ...state.metrics,
      oee: Math.min(93, rounded(state.metrics.oee + 8.5)),
      qualityRate: Math.min(99, rounded(state.metrics.qualityRate + 1.5))
    },
    stations: createStations(activeIndex, "running")
  });
}

export function resetProductionLine(_state?: ProductionState): ProductionState {
  return createInitialProductionState();
}

export function selectStation(
  state: ProductionState,
  stationId: StationId
): ProductionState {
  return {
    ...state,
    selectedStationId: stationId
  };
}

export function toggleReplayMode(state: ProductionState): ProductionState {
  if (state.mode === "replay") {
    return startProductionLine(state);
  }

  const replayIndex = Math.max(0, state.history.length - 1);
  const replaySnapshot = state.history[replayIndex];

  return {
    ...state,
    mode: "replay",
    replayIndex,
    metrics: replaySnapshot?.metrics ?? state.metrics,
    stations: replaySnapshot?.stations ?? state.stations,
    seatProgress: replaySnapshot?.seatProgress ?? state.seatProgress
  };
}

export function tickProductionLine(
  state: ProductionState,
  deltaSeconds: number
): ProductionState {
  if (state.mode === "fault" || state.mode === "paused") {
    return {
      ...state,
      timestamp: state.timestamp + deltaSeconds
    };
  }

  if (state.mode === "replay") {
    if (state.history.length === 0) {
      return state;
    }

    const replayIndex = (state.replayIndex + 1) % state.history.length;
    const snapshot = state.history[replayIndex];

    return {
      ...state,
      timestamp: state.timestamp + deltaSeconds,
      replayIndex,
      metrics: snapshot.metrics,
      stations: snapshot.stations,
      seatProgress: snapshot.seatProgress
    };
  }

  const nextProgress = (state.seatProgress + deltaSeconds / SECONDS_PER_UNIT) % 1;
  const completedCycle = nextProgress < state.seatProgress;
  const activeIndex = activeIndexFromProgress(nextProgress);
  const runtimeMinutes = state.metrics.runtimeMinutes + deltaSeconds / 60;
  const cycleWave = Math.sin((state.timestamp + deltaSeconds) / 18);

  const nextState: ProductionState = {
    ...state,
    timestamp: state.timestamp + deltaSeconds,
    seatProgress: nextProgress,
    metrics: {
      ...state.metrics,
      runtimeMinutes: rounded(runtimeMinutes),
      output: state.metrics.output + (completedCycle ? 1 : 0),
      oee: rounded(90.5 + cycleWave * 2.3),
      qualityRate: rounded(98.2 + Math.cos(runtimeMinutes) * 0.5),
      cycleTime: rounded(41.5 + Math.sin(runtimeMinutes * 1.7) * 2)
    },
    stations: createStations(activeIndex, "running")
  };

  return withHistory(nextState);
}
