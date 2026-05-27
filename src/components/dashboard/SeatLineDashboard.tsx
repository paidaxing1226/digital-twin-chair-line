"use client";

import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Box,
  History,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Wrench
} from "lucide-react";
import { STATION_IDS } from "@/lib/production/simulation";
import { useProductionLine } from "@/lib/production/use-production-line";
import type { LineMode, ProductionSnapshot, Station, StationId } from "@/lib/production/types";

const TwinScene = dynamic(
  () => import("@/components/twin/TwinScene").then((module) => module.TwinScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#dbe7f4] text-sm font-medium text-slate-500">
        3D 产线加载中...
      </div>
    )
  }
);

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const statusLabel: Record<Station["status"], string> = {
  running: "运行",
  idle: "待机",
  fault: "故障",
  blocked: "阻塞",
  complete: "完成"
};

const statusDot: Record<Station["status"], string> = {
  running: "bg-cyan-400",
  idle: "bg-slate-400",
  fault: "bg-red-500",
  blocked: "bg-amber-400",
  complete: "bg-emerald-500"
};

const modeText: Record<LineMode, string> = {
  running: "实时生产",
  paused: "产线暂停",
  fault: "故障处置",
  replay: "历史回放"
};

function MetricCard({
  label,
  value,
  unit,
  icon: Icon
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: typeof Activity;
}) {
  return (
    <div className="min-w-[138px] rounded-md border border-white/45 bg-white/72 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className="h-4 w-4 text-cyan-600" />
        {label}
      </div>
      <div className="mt-1 flex items-end gap-1">
        <span className="text-2xl font-semibold tabular-nums text-slate-950">{value}</span>
        {unit ? <span className="pb-1 text-xs text-slate-500">{unit}</span> : null}
      </div>
    </div>
  );
}

function TopMetrics({
  mode,
  metrics
}: {
  mode: LineMode;
  metrics: ReturnType<typeof useProductionLine>["metrics"];
}) {
  return (
    <header className="pointer-events-auto absolute left-5 right-5 top-4 z-20 flex items-center justify-between gap-4">
      <div className="rounded-md border border-white/50 bg-white/78 px-4 py-3 shadow-sm backdrop-blur">
        <div className="text-xs font-medium text-cyan-700">Seat Line Digital Twin</div>
        <h1 className="mt-1 text-xl font-semibold text-slate-950">数字孪生座椅产线</h1>
      </div>
      <div className="flex flex-1 items-center justify-end gap-3 overflow-hidden">
        <MetricCard label="OEE" value={metrics.oee.toFixed(1)} unit="%" icon={Activity} />
        <MetricCard label="产量" value={metrics.output} unit="件" icon={Box} />
        <MetricCard
          label="合格率"
          value={metrics.qualityRate.toFixed(1)}
          unit="%"
          icon={ShieldCheck}
        />
        <div
          className={cn(
            "rounded-md border px-4 py-3 text-sm font-semibold shadow-sm backdrop-blur",
            mode === "fault"
              ? "border-red-200 bg-red-50/90 text-red-700"
              : "border-white/45 bg-slate-950/82 text-cyan-100"
          )}
        >
          {modeText[mode]}
        </div>
      </div>
    </header>
  );
}

function ControlButton({
  onClick,
  icon: Icon,
  children,
  tone = "dark",
  disabled = false
}: {
  onClick: () => void;
  icon: typeof Play;
  children: React.ReactNode;
  tone?: "dark" | "light" | "danger" | "success";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-45",
        tone === "dark" && "bg-slate-950 text-white hover:bg-slate-800",
        tone === "light" && "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
        tone === "danger" && "bg-red-600 text-white hover:bg-red-500",
        tone === "success" && "bg-emerald-600 text-white hover:bg-emerald-500"
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </button>
  );
}

function SidePanel({
  state,
  selectedStation
}: {
  state: ReturnType<typeof useProductionLine>;
  selectedStation: Station;
}) {
  const chartData = (
    state.history.length > 4
      ? state.history.slice(-18)
      : Array.from({ length: 8 }).map((_, index) => ({
          timestamp: index,
          metrics: {
            ...state.metrics,
            oee: state.metrics.oee - (8 - index) * 0.35,
            output: Math.max(0, state.metrics.output - 8 + index)
          }
        }))
  ).map((snapshot: ProductionSnapshot | { timestamp: number; metrics: typeof state.metrics }) => ({
    time: `${Math.round(snapshot.timestamp)}s`,
    oee: snapshot.metrics.oee,
    output: snapshot.metrics.output
  }));
  const chartWidth = 320;
  const chartHeight = 130;
  const points = chartData.map((point, index) => {
    const x = (index / Math.max(1, chartData.length - 1)) * chartWidth;
    const y = chartHeight - ((point.oee - 70) / 30) * chartHeight;
    return [x, Math.max(4, Math.min(chartHeight - 4, y))] as const;
  });
  const linePath = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <aside className="pointer-events-auto absolute right-5 top-28 z-20 w-[360px] space-y-3">
      <section className="rounded-md border border-slate-700/35 bg-slate-950/84 p-4 text-white shadow-xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-cyan-300">实时驾驶舱</div>
            <h2 className="text-lg font-semibold">产线健康概览</h2>
          </div>
          <BarChart3 className="h-5 w-5 text-cyan-300" />
        </div>
        <div className="h-[150px]">
          <svg className="h-full w-full" viewBox={`0 0 ${chartWidth} ${chartHeight + 18}`}>
            <defs>
              <linearGradient id="oeeFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#46d5e8" stopOpacity="0.72" />
                <stop offset="95%" stopColor="#46d5e8" stopOpacity="0.04" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3].map((line) => (
              <line
                key={`h-${line}`}
                x1="0"
                x2={chartWidth}
                y1={(line / 3) * chartHeight}
                y2={(line / 3) * chartHeight}
                stroke="#334155"
                strokeDasharray="4 5"
                strokeWidth="1"
              />
            ))}
            {[0, 1, 2, 3, 4].map((line) => (
              <line
                key={`v-${line}`}
                x1={(line / 4) * chartWidth}
                x2={(line / 4) * chartWidth}
                y1="0"
                y2={chartHeight}
                stroke="#334155"
                strokeDasharray="4 5"
                strokeWidth="1"
              />
            ))}
            <path d={areaPath} fill="url(#oeeFill)" />
            <path d={linePath} fill="none" stroke="#46d5e8" strokeWidth="3" />
            {points.map(([x, y], index) => (
              <circle key={index} cx={x} cy={y} r="3" fill="#46d5e8" />
            ))}
            <text x="0" y={chartHeight + 16} fill="#94a3b8" fontSize="11">
              {chartData[0]?.time}
            </text>
            <text x={chartWidth - 40} y={chartHeight + 16} fill="#94a3b8" fontSize="11">
              {chartData.at(-1)?.time}
            </text>
            <text x="4" y="12" fill="#94a3b8" fontSize="11">
              100
            </text>
            <text x="4" y={chartHeight - 4} fill="#94a3b8" fontSize="11">
              70
            </text>
          </svg>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded bg-white/8 px-2 py-2">
            <div className="text-slate-400">节拍</div>
            <div className="mt-1 font-semibold text-white">{state.metrics.cycleTime.toFixed(1)}s</div>
          </div>
          <div className="rounded bg-white/8 px-2 py-2">
            <div className="text-slate-400">运行</div>
            <div className="mt-1 font-semibold text-white">
              {state.metrics.runtimeMinutes.toFixed(1)}m
            </div>
          </div>
          <div className="rounded bg-white/8 px-2 py-2">
            <div className="text-slate-400">故障</div>
            <div className="mt-1 font-semibold text-white">{state.metrics.faultCount}</div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-white/45 bg-white/84 p-4 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-medium text-cyan-700">选中设备</div>
            <h2 className="text-lg font-semibold text-slate-950">{selectedStation.name}</h2>
          </div>
          <span
            className={cn(
              "rounded px-2 py-1 text-xs font-semibold",
              selectedStation.status === "fault"
                ? "bg-red-100 text-red-700"
                : "bg-cyan-100 text-cyan-700"
            )}
          >
            {statusLabel[selectedStation.status]}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{selectedStation.task}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs text-slate-500">工位节拍</div>
            <div className="mt-1 font-semibold">{selectedStation.cycleTime}s</div>
          </div>
          <div className="rounded border border-slate-200 bg-white px-3 py-2">
            <div className="text-xs text-slate-500">工位良率</div>
            <div className="mt-1 font-semibold">{selectedStation.qualityRate}%</div>
          </div>
        </div>
        {selectedStation.alert ? (
          <div className="mt-3 flex items-start gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {selectedStation.alert}
          </div>
        ) : null}
      </section>
    </aside>
  );
}

function BottomRail({
  stations,
  selectedStationId,
  onSelect
}: {
  stations: Station[];
  selectedStationId: StationId;
  onSelect: (stationId: StationId) => void;
}) {
  return (
    <nav className="pointer-events-auto absolute bottom-5 left-5 right-5 z-20 rounded-md border border-white/45 bg-white/82 p-3 shadow-xl backdrop-blur">
      <div className="grid grid-cols-5 gap-3">
        {stations.map((station) => (
          <button
            key={station.id}
            type="button"
            onClick={() => onSelect(station.id)}
            className={cn(
              "flex min-h-20 flex-col items-start justify-between rounded-md border px-3 py-3 text-left transition",
              station.id === selectedStationId
                ? "border-cyan-500 bg-cyan-50"
                : "border-slate-200 bg-white/75 hover:bg-white"
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-950">{station.name}</span>
              <span className={cn("h-2.5 w-2.5 rounded-full", statusDot[station.status])} />
            </div>
            <div className="mt-3 text-xs text-slate-500">
              {station.order}. {statusLabel[station.status]}
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
}

function ControlDock({ state }: { state: ReturnType<typeof useProductionLine> }) {
  const faultTarget =
    state.mode === "fault"
      ? state.selectedStationId
      : STATION_IDS[state.metrics.faultCount % STATION_IDS.length];

  return (
    <div className="pointer-events-auto absolute left-5 top-28 z-30 flex max-w-[320px] flex-wrap gap-2">
      <ControlButton
        onClick={state.startLine}
        icon={Play}
        tone="success"
        disabled={state.mode === "running"}
      >
        启动
      </ControlButton>
      <ControlButton onClick={state.pauseLine} icon={Pause} tone="light">
        暂停
      </ControlButton>
      <ControlButton
        onClick={() => state.injectFault(faultTarget)}
        icon={AlertTriangle}
        tone="danger"
        disabled={state.mode === "fault"}
      >
        注入故障
      </ControlButton>
      <ControlButton
        onClick={state.recoverFault}
        icon={Wrench}
        tone="dark"
        disabled={state.mode !== "fault"}
      >
        恢复
      </ControlButton>
      <ControlButton onClick={state.toggleReplay} icon={History} tone="light">
        回放
      </ControlButton>
      <ControlButton onClick={state.resetLine} icon={RotateCcw} tone="light">
        重置
      </ControlButton>
    </div>
  );
}

export function SeatLineDashboard() {
  const state = useProductionLine();
  const selectedStation =
    state.stations.find((station) => station.id === state.selectedStationId) ?? state.stations[0];

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#dbe7f4]">
      <TwinScene
        stations={state.stations}
        selectedStationId={state.selectedStationId}
        seatProgress={state.seatProgress}
        mode={state.mode}
        onSelectStation={state.selectStation}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.62),rgba(255,255,255,0)_32%),linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0)_30%)]" />
      <TopMetrics mode={state.mode} metrics={state.metrics} />
      <ControlDock state={state} />
      <SidePanel state={state} selectedStation={selectedStation} />
      <BottomRail
        stations={state.stations}
        selectedStationId={state.selectedStationId}
        onSelect={state.selectStation}
      />
    </main>
  );
}
