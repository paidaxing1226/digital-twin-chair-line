"use client";

import { OrbitControls, Text } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import type { LineMode, Station, StationId } from "@/lib/production/types";

const stationPositions: Record<StationId, [number, number, number]> = {
  frame: [-6, 0.1, -1.7],
  cushion: [-3, 0.1, 1.7],
  armrest: [0, 0.1, -1.7],
  inspection: [3, 0.1, 1.7],
  packaging: [6, 0.1, -1.7]
};

const stationColors = {
  running: "#46d5e8",
  idle: "#94a3b8",
  fault: "#ef4444",
  blocked: "#f59e0b",
  complete: "#22c55e"
};

interface TwinSceneProps {
  stations: Station[];
  selectedStationId: StationId;
  seatProgress: number;
  mode: LineMode;
  onSelectStation: (stationId: StationId) => void;
}

function statusColor(station: Station): string {
  return stationColors[station.status];
}

function Conveyor({ running }: { running: boolean }) {
  const stripesRef = useRef<Group>(null);

  useFrame((_state, delta) => {
    if (!stripesRef.current || !running) {
      return;
    }

    stripesRef.current.position.x =
      ((stripesRef.current.position.x + delta * 1.2 + 0.35) % 0.7) - 0.35;
  });

  return (
    <group>
      <mesh position={[0, -0.03, 0]} receiveShadow>
        <boxGeometry args={[15.8, 0.16, 2.3]} />
        <meshStandardMaterial color="#303846" metalness={0.35} roughness={0.42} />
      </mesh>
      <mesh position={[0, 0.08, -1.35]} receiveShadow>
        <boxGeometry args={[16.2, 0.12, 0.16]} />
        <meshStandardMaterial color="#7f8b9b" metalness={0.55} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.08, 1.35]} receiveShadow>
        <boxGeometry args={[16.2, 0.12, 0.16]} />
        <meshStandardMaterial color="#7f8b9b" metalness={0.55} roughness={0.25} />
      </mesh>
      <group ref={stripesRef}>
        {Array.from({ length: 24 }).map((_, index) => (
          <mesh key={index} position={[-7.7 + index * 0.7, 0.09, 0]} rotation-y={0.25}>
            <boxGeometry args={[0.08, 0.05, 2.05]} />
            <meshStandardMaterial color="#111827" roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function SeatModel({ progress, offset }: { progress: number; offset: number }) {
  const localProgress = (progress + offset) % 1;
  const x = -7 + localProgress * 14;
  const stage = Math.floor(localProgress * 5);

  return (
    <group position={[x, 0.45, 0]}>
      <mesh castShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[0.75, 0.16, 0.72]} />
        <meshStandardMaterial color={stage >= 1 ? "#f4c95d" : "#111827"} />
      </mesh>
      {stage >= 1 && (
        <mesh castShadow position={[0.1, 0.58, 0.27]} rotation-x={-0.28}>
          <boxGeometry args={[0.76, 0.12, 0.86]} />
          <meshStandardMaterial color="#f5d56b" roughness={0.55} />
        </mesh>
      )}
      {stage >= 2 && (
        <>
          <mesh castShadow position={[0, 0.32, -0.48]}>
            <boxGeometry args={[0.82, 0.18, 0.12]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh castShadow position={[-0.48, 0.32, 0.06]}>
            <boxGeometry args={[0.1, 0.2, 0.68]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh castShadow position={[0.48, 0.32, 0.06]}>
            <boxGeometry args={[0.1, 0.2, 0.68]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
        </>
      )}
      {stage >= 3 && (
        <mesh castShadow position={[0, 0.82, 0.55]}>
          <boxGeometry args={[0.72, 0.12, 0.2]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      )}
      {stage >= 4 && (
        <mesh castShadow position={[0, -0.08, 0]}>
          <boxGeometry args={[0.94, 0.08, 0.88]} />
          <meshStandardMaterial color="#22c55e" emissive="#0b4d2a" emissiveIntensity={0.25} />
        </mesh>
      )}
    </group>
  );
}

function Worker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.45, 0]}>
        <capsuleGeometry args={[0.13, 0.52, 8, 16]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
      <mesh castShadow position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.15, 20, 20]} />
        <meshStandardMaterial color="#f4c95d" />
      </mesh>
      <mesh castShadow position={[0, 1.02, 0]}>
        <boxGeometry args={[0.34, 0.1, 0.3]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
    </group>
  );
}

function RoboticArm({
  position,
  color,
  active
}: {
  position: [number, number, number];
  color: string;
  active: boolean;
}) {
  const armRef = useRef<Group>(null);

  useFrame((state) => {
    if (!armRef.current) {
      return;
    }

    armRef.current.rotation.z = active ? Math.sin(state.clock.elapsedTime * 2) * 0.35 : 0.12;
  });

  return (
    <group position={position}>
      <mesh castShadow position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.13, 0.18, 0.7, 20]} />
        <meshStandardMaterial color="#475569" metalness={0.45} />
      </mesh>
      <group ref={armRef} position={[0, 0.75, 0]}>
        <mesh castShadow position={[0.32, 0.12, 0]}>
          <boxGeometry args={[0.68, 0.12, 0.12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12} />
        </mesh>
        <mesh castShadow position={[0.68, -0.16, 0]}>
          <boxGeometry args={[0.12, 0.55, 0.12]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      </group>
    </group>
  );
}

function StationObject({
  station,
  selected,
  onSelect
}: {
  station: Station;
  selected: boolean;
  onSelect: (stationId: StationId) => void;
}) {
  const color = statusColor(station);
  const position = stationPositions[station.id];
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(station.id);
  };

  return (
    <group position={position} onClick={handleClick}>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <boxGeometry args={[1.65, 0.08, 1.05]} />
        <meshStandardMaterial color={selected ? "#dbeafe" : "#cbd5e1"} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[1.35, 0.12, 0.76]} />
        <meshStandardMaterial color="#111827" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.23, 0.48]}>
        <boxGeometry args={[1.36, 0.08, 0.08]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      <Text
        position={[0, 0.72, 0]}
        rotation-x={-0.85}
        fontSize={0.18}
        color={selected ? "#0f172a" : "#334155"}
        anchorX="center"
      >
        {station.name}
      </Text>
      <RoboticArm
        position={[station.id === "inspection" ? -0.42 : 0.42, 0.2, -0.48]}
        color={color}
        active={station.status === "running"}
      />
      <Worker position={[0.7, 0.05, station.order % 2 === 0 ? -0.72 : 0.72]} />
    </group>
  );
}

function WarehouseRack() {
  return (
    <group position={[8.6, 0.15, 2.3]}>
      {Array.from({ length: 7 }).map((_, xIndex) =>
        Array.from({ length: 5 }).map((__, yIndex) => (
          <mesh
            key={`${xIndex}-${yIndex}`}
            position={[xIndex * 0.34, yIndex * 0.38, 0]}
            castShadow
          >
            <boxGeometry args={[0.05, 0.75, 2.2]} />
            <meshStandardMaterial color="#334155" metalness={0.4} />
          </mesh>
        ))
      )}
      <mesh position={[1.0, 2.05, 0]}>
        <boxGeometry args={[2.75, 0.08, 2.35]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      <mesh position={[1.0, 1.15, -1.16]}>
        <boxGeometry args={[2.4, 1.05, 0.08]} />
        <meshStandardMaterial color="#172033" emissive="#0f172a" />
      </mesh>
      <Text position={[1.0, 1.42, -1.22]} fontSize={0.16} color="#46d5e8">
        OEE 91.8%
      </Text>
      <Text position={[1.0, 1.14, -1.22]} fontSize={0.12} color="#e2e8f0">
        预测维护 4.3h
      </Text>
    </group>
  );
}

function TruckYard() {
  return (
    <group position={[9.5, 0.1, -2.4]}>
      {[-0.5, 0.75].map((zOffset, index) => (
        <group key={index} position={[index * 0.9, 0, zOffset]}>
          <mesh castShadow position={[0, 0.24, 0]}>
            <boxGeometry args={[0.72, 0.42, 0.72]} />
            <meshStandardMaterial color={index === 0 ? "#991b1b" : "#111827"} />
          </mesh>
          <mesh castShadow position={[0.72, 0.3, 0]}>
            <boxGeometry args={[0.9, 0.5, 0.72]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          {[-0.28, 0.28].map((wheelZ) =>
            [0.05, 0.85].map((wheelX) => (
              <mesh
                key={`${wheelZ}-${wheelX}`}
                position={[wheelX, 0.02, wheelZ]}
                rotation-z={Math.PI / 2}
              >
                <cylinderGeometry args={[0.12, 0.12, 0.08, 20]} />
                <meshStandardMaterial color="#111827" />
              </mesh>
            ))
          )}
        </group>
      ))}
    </group>
  );
}

function FactoryShell() {
  return (
    <group>
      <mesh receiveShadow position={[1, -0.14, 0]}>
        <boxGeometry args={[22, 0.08, 8]} />
        <meshStandardMaterial color="#c7d7e8" roughness={0.85} />
      </mesh>
      {[-3.1, 3.1].map((z) => (
        <mesh key={z} position={[0.2, 1.8, z]}>
          <boxGeometry args={[17.5, 0.06, 0.06]} />
          <meshStandardMaterial color="#273244" />
        </mesh>
      ))}
      {Array.from({ length: 9 }).map((_, index) => (
        <mesh key={index} position={[-7.8 + index * 2.1, 0.92, 3.1]}>
          <boxGeometry args={[0.05, 1.7, 0.05]} />
          <meshStandardMaterial color="#273244" />
        </mesh>
      ))}
      <mesh position={[4.55, 0.7, 0]}>
        <boxGeometry args={[0.9, 1.25, 2.6]} />
        <meshStandardMaterial color="#e2e8f0" transparent opacity={0.62} />
      </mesh>
    </group>
  );
}

function SceneContent(props: TwinSceneProps) {
  const running = props.mode === "running";
  const seats = useMemo(() => [0, 0.26, 0.52, 0.78], []);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 8, 6]} intensity={1.25} castShadow />
      <FactoryShell />
      <Conveyor running={running} />
      {seats.map((offset) => (
        <SeatModel key={offset} progress={props.seatProgress} offset={offset} />
      ))}
      {props.stations.map((station) => (
        <StationObject
          key={station.id}
          station={station}
          selected={station.id === props.selectedStationId}
          onSelect={props.onSelectStation}
        />
      ))}
      <WarehouseRack />
      <TruckYard />
      <OrbitControls
        makeDefault
        minDistance={6}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.05}
        target={[1.2, 0.25, 0]}
      />
    </>
  );
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function FallbackTwinScene(props: TwinSceneProps) {
  const seats = [0, 0.26, 0.52, 0.78].map((offset) => {
    const localProgress = (props.seatProgress + offset) % 1;
    return {
      x: 90 + localProgress * 660,
      y: 250 + Math.sin(localProgress * Math.PI * 2) * 10,
      stage: Math.floor(localProgress * 5)
    };
  });

  const stationNodes = props.stations.map((station, index) => ({
    station,
    x: 110 + index * 150,
    y: index % 2 === 0 ? 184 : 316,
    color: statusColor(station)
  }));

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#dbe7f4]">
      <svg
        aria-label="WebGL 不可用时的座椅产线等距视图"
        className="h-full w-full"
        viewBox="0 0 980 620"
        role="img"
      >
        <defs>
          <linearGradient id="floor" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#e8f1fb" offset="0" />
            <stop stopColor="#c7d7e8" offset="1" />
          </linearGradient>
          <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="14" stdDeviation="10" floodColor="#64748b" floodOpacity="0.28" />
          </filter>
        </defs>

        <path d="M40 430 L840 120 L960 220 L190 560 Z" fill="url(#floor)" />
        <path
          d="M90 325 L760 170 L810 218 L138 382 Z"
          fill="#303846"
          filter="url(#softShadow)"
        />
        <path d="M92 300 L760 145 L810 166 L137 322 Z" fill="#7f8b9b" opacity="0.72" />
        <path d="M122 366 L790 206" stroke="#111827" strokeWidth="7" opacity="0.72" />
        <path d="M104 292 L770 138" stroke="#273244" strokeWidth="8" />
        <path d="M148 402 L818 238" stroke="#273244" strokeWidth="8" />

        {Array.from({ length: 18 }).map((_, index) => (
          <path
            key={index}
            d={`M${120 + index * 38} ${292 - index * 9} L${170 + index * 38} ${405 - index * 9}`}
            stroke="#111827"
            strokeWidth="3"
            opacity="0.52"
          />
        ))}

        {stationNodes.map(({ station, x, y, color }) => (
          <g
            key={station.id}
            onClick={() => props.onSelectStation(station.id)}
            className="cursor-pointer"
            opacity={station.id === props.selectedStationId ? 1 : 0.88}
          >
            <path
              d={`M${x} ${y} l95 -28 l70 38 l-98 31 z`}
              fill={station.id === props.selectedStationId ? "#dbeafe" : "#f8fafc"}
              stroke={color}
              strokeWidth={station.id === props.selectedStationId ? 5 : 3}
              filter="url(#softShadow)"
            />
            <path d={`M${x + 22} ${y + 8} l64 -19 l43 23 l-66 20 z`} fill="#111827" />
            <path d={`M${x + 24} ${y + 31} l64 -19 l43 23`} stroke={color} strokeWidth="6" />
            <circle cx={x + 132} cy={y - 8} r="12" fill={color} />
            <path d={`M${x + 126} ${y - 8} l-34 28`} stroke="#475569" strokeWidth="8" />
            <text x={x + 58} y={y - 22} fill="#0f172a" fontSize="18" fontWeight="700">
              {station.name}
            </text>
            <text x={x + 60} y={y + 65} fill="#475569" fontSize="14">
              {station.status === "fault" ? "故障处置" : station.status === "running" ? "运行中" : "待机"}
            </text>
          </g>
        ))}

        {seats.map((seat, index) => (
          <g key={index} transform={`translate(${seat.x} ${seat.y}) skewY(-12)`}>
            <rect x="-28" y="-14" width="60" height="22" rx="4" fill={seat.stage >= 1 ? "#f4c95d" : "#111827"} />
            {seat.stage >= 1 ? (
              <rect x="-18" y="-54" width="56" height="18" rx="4" fill="#f5d56b" transform="rotate(-18)" />
            ) : null}
            {seat.stage >= 2 ? (
              <>
                <rect x="-42" y="-12" width="10" height="48" rx="2" fill="#1f2937" />
                <rect x="34" y="-12" width="10" height="48" rx="2" fill="#1f2937" />
              </>
            ) : null}
            {seat.stage >= 4 ? <rect x="-34" y="16" width="74" height="9" rx="3" fill="#22c55e" /> : null}
          </g>
        ))}

        <g transform="translate(790 120)">
          {Array.from({ length: 8 }).map((_, index) => (
            <line key={index} x1={index * 18} y1="0" x2={index * 18} y2="190" stroke="#334155" strokeWidth="4" />
          ))}
          {Array.from({ length: 5 }).map((_, index) => (
            <line key={index} x1="0" y1={index * 42} x2="142" y2={index * 42} stroke="#334155" strokeWidth="4" />
          ))}
          <rect x="15" y="78" width="116" height="66" rx="5" fill="#172033" />
          <text x="35" y="105" fill="#46d5e8" fontSize="16" fontWeight="700">
            OEE 91.8%
          </text>
          <text x="35" y="128" fill="#e2e8f0" fontSize="13">
            预测维护 4.3h
          </text>
          <rect x="-2" y="-18" width="148" height="14" fill="#facc15" />
        </g>

        <g transform="translate(800 420)">
          <rect x="0" y="24" width="70" height="42" rx="4" fill="#991b1b" />
          <rect x="68" y="12" width="110" height="54" rx="4" fill="#475569" />
          {[28, 78, 124, 164].map((x) => (
            <circle key={x} cx={x} cy="72" r="10" fill="#111827" />
          ))}
        </g>

        <text x="56" y="92" fill="#475569" fontSize="16">
          当前浏览器禁用 WebGL，已切换为等距备用视图
        </text>
      </svg>
    </div>
  );
}

export function TwinScene(props: TwinSceneProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglSupported(detectWebGL());
  }, []);

  if (webglSupported === false) {
    return <FallbackTwinScene {...props} />;
  }

  if (webglSupported === null) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#dbe7f4] text-sm font-medium text-slate-500">
        正在检测 3D 渲染能力...
      </div>
    );
  }

  return (
    <Canvas
      shadows
      camera={{ position: [7.8, 5.6, 7.2], fov: 45 }}
      gl={{ antialias: true }}
      className="h-full w-full"
    >
      <color attach="background" args={["#dbe7f4"]} />
      <fog attach="fog" args={["#dbe7f4", 14, 24]} />
      <SceneContent {...props} />
    </Canvas>
  );
}
