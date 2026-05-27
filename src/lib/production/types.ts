export type StationId =
  | "frame"
  | "cushion"
  | "armrest"
  | "inspection"
  | "packaging";

export type StationStatus = "running" | "idle" | "fault" | "blocked" | "complete";

export type LineMode = "running" | "paused" | "fault" | "replay";

export interface Station {
  id: StationId;
  name: string;
  order: number;
  status: StationStatus;
  task: string;
  cycleTime: number;
  qualityRate: number;
  alert: string | null;
}

export interface ProductionMetrics {
  oee: number;
  output: number;
  qualityRate: number;
  cycleTime: number;
  faultCount: number;
  runtimeMinutes: number;
}

export interface ProductionSnapshot {
  timestamp: number;
  mode: LineMode;
  metrics: ProductionMetrics;
  stations: Station[];
  seatProgress: number;
}

export interface ProductionState extends ProductionSnapshot {
  selectedStationId: StationId;
  history: ProductionSnapshot[];
  replayIndex: number;
}

export interface LineControls {
  startLine: () => void;
  pauseLine: () => void;
  injectFault: (stationId: StationId) => void;
  recoverFault: () => void;
  resetLine: () => void;
  toggleReplay: () => void;
}
