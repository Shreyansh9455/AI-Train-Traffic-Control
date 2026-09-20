import React, { useState } from 'react';
import { Radio } from 'lucide-react';

/**
 * Pure SVG Railway Network Topology Map (Day 19)
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURAL SIMPLIFICATION:
 * This kinematic renderer assumes every train travels from a section's fromStation
 * toward its toStation along the coordinate vector (true for this project's seed
 * route progression, but a bidirectional real system would check the train's route
 * stop order to interpolate in reverse when travelling toStation -> fromStation).
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @param {Object} props
 * @param {Array} props.stations   - Station documents with { _id, code, name, x, y }
 * @param {Array} props.sections   - Section documents with { _id, code, fromStation, toStation, lineType }
 * @param {Array} props.trainRuns  - Live TrainRun documents with { status, progress, currentSection, train }
 */
function NetworkMap({ stations = [], sections = [], trainRuns = [] }) {
  const [hoveredTrain, setHoveredTrain] = useState(null);

  // Default fallback stations (Indian Railways Delhi-Hyderabad corridor)
  const displayStations = stations.length > 0 ? stations : [
    { _id: '1', code: 'NDLS', name: 'New Delhi', x: 100, y: 220 },
    { _id: '2', code: 'AGC', name: 'Agra Cantt', x: 240, y: 290 },
    { _id: '3', code: 'JHS', name: 'Jhansi Jn', x: 380, y: 310 },
    { _id: '4', code: 'BPL', name: 'Bhopal Jn', x: 500, y: 260 },
    { _id: '5', code: 'NGP', name: 'Nagpur Jn', x: 630, y: 330 },
    { _id: '6', code: 'HYB', name: 'Hyderabad Deccan', x: 750, y: 410 },
  ];

  // Lookup map by station _id and code
  const stationMap = {};
  displayStations.forEach((st) => {
    stationMap[String(st._id)] = st;
    if (st.code) stationMap[st.code] = st;
  });

  const getStation = (ref) => {
    if (!ref) return null;
    if (typeof ref === 'object') {
      if (typeof ref.x === 'number' && typeof ref.y === 'number') return ref;
      if (ref._id && stationMap[String(ref._id)]) return stationMap[String(ref._id)];
      if (ref.code && stationMap[ref.code]) return stationMap[ref.code];
    }
    return stationMap[String(ref)] || null;
  };

  return (
    <div className="relative bg-panel-card border border-panel-border rounded-2xl p-4 sm:p-6 shadow-2xl overflow-hidden select-none">
      {/* Map Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-panel-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/50 flex items-center justify-center">
            <Radio className="w-4 h-4 text-signal-cyan animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-primary">Live Track Topology & Dispatch Grid</h3>
            <p className="text-[11px] font-mono text-ink-muted">Scale 1:1 Simulated Section Coordinates · Block Junction at STC</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] font-mono text-ink-secondary">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-signal-amber shadow-sm shadow-amber-500/50" />
            <span>Active Train</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="inline-block w-4 h-1 bg-cyan-500 rounded" />
            <span>Double Track</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="inline-block w-4 h-0.5 bg-slate-500 rounded" />
            <span>Single Track</span>
          </div>
        </div>
      </div>

      {/* Main SVG Canvas */}
      <div className="w-full aspect-[860/460] bg-panel-base/90 border border-panel-border/80 rounded-xl relative overflow-hidden flex items-center justify-center">
        <svg
          viewBox="0 0 860 460"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="networkGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(34, 52, 88, 0.15)" strokeWidth="0.5" />
            </pattern>

            {/* Glowing filter for train markers */}
            <filter id="trainGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="860" height="460" fill="url(#networkGrid)" />

          {/* 1. Track Section Lines */}
          {sections.map((sec, idx) => {
            const fromSt = getStation(sec.fromStation);
            const toSt = getStation(sec.toStation);
            if (!fromSt || !toSt || typeof fromSt.x !== 'number' || typeof fromSt.y !== 'number' || typeof toSt.x !== 'number' || typeof toSt.y !== 'number') {
              return null;
            }

            const isDouble = sec.lineType === 'double' || sec.capacity > 1;
            const midX = (fromSt.x + toSt.x) / 2;
            const midY = (fromSt.y + toSt.y) / 2;

            return (
              <g key={sec._id || idx} className="group/sec">
                {/* Track Bed Base */}
                <line
                  x1={fromSt.x}
                  y1={fromSt.y}
                  x2={toSt.x}
                  y2={toSt.y}
                  stroke="#1c2b4a"
                  strokeWidth={isDouble ? 8 : 4}
                  strokeLinecap="round"
                />

                {/* Foreground Track Rail */}
                <line
                  x1={fromSt.x}
                  y1={fromSt.y}
                  x2={toSt.x}
                  y2={toSt.y}
                  stroke={isDouble ? '#0284c7' : '#475569'}
                  strokeWidth={isDouble ? 4 : 2}
                  strokeDasharray={isDouble ? '6 3' : 'none'}
                  strokeLinecap="round"
                  className="transition-colors group-hover/sec:stroke-signal-cyan"
                />

                {/* Section Info Tag */}
                <g transform={`translate(${midX - 28}, ${midY - 10})`}>
                  <rect
                    width="56"
                    height="16"
                    rx="4"
                    fill="#080d1a"
                    stroke="#1c2b4a"
                    strokeWidth="1"
                    className="opacity-80"
                  />
                  <text
                    x="28"
                    y="11"
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    {sec.lengthKm}km
                  </text>
                </g>
              </g>
            );
          })}

          {/* 2. Station Nodes */}
          {displayStations.map((st) => {
            const isJunction = st.code === 'STC';
            return (
              <g key={st._id || st.code}>
                {/* Station Code Label ABOVE station circle */}
                <g transform={`translate(${st.x - 20}, ${st.y - 30})`}>
                  <rect
                    width="40"
                    height="16"
                    rx="4"
                    fill="#0d1527"
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x="20"
                    y="11"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                  >
                    {st.code}
                  </text>
                </g>

                {/* Station Outer Circle */}
                <circle
                  cx={st.x}
                  cy={st.y}
                  r={isJunction ? 12 : 9}
                  fill="#080d1a"
                  stroke={isJunction ? '#f59e0b' : '#06b6d4'}
                  strokeWidth={isJunction ? 3 : 2}
                />

                {/* Station Center Dot */}
                <circle
                  cx={st.x}
                  cy={st.y}
                  r={isJunction ? 5 : 3.5}
                  fill={isJunction ? '#f59e0b' : '#38bdf8'}
                />

                {/* Station Full Name Below */}
                <text
                  x={st.x}
                  y={st.y + 22}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="Inter"
                >
                  {st.name}
                </text>
              </g>
            );
          })}

          {/* 3. Live Train Markers (Interpolated along track line) */}
          {trainRuns.map((run) => {
            if (run.status !== 'running' || !run.currentSection) return null;

            const sec = typeof run.currentSection === 'object'
              ? run.currentSection
              : sections.find((s) => String(s._id) === String(run.currentSection));

            if (!sec) return null;

            const fromSt = getStation(sec.fromStation);
            const toSt = getStation(sec.toStation);
            if (!fromSt || !toSt || typeof fromSt.x !== 'number' || typeof fromSt.y !== 'number' || typeof toSt.x !== 'number' || typeof toSt.y !== 'number') {
              return null;
            }

            // Interpolate position along the vector based on progress (0 to 1)
            const rawProgress = Number(run.progress ?? 0);
            const progress = isNaN(rawProgress) ? 0 : Math.max(0, Math.min(1, rawProgress));
            const trainX = fromSt.x + (toSt.x - fromSt.x) * progress;
            const trainY = fromSt.y + (toSt.y - fromSt.y) * progress;

            if (isNaN(trainX) || isNaN(trainY)) return null;

            const train = run.train || {};
            const trainNumber = String(train.trainNumber || run.trainNumber || 'TRN');

            return (
              <g
                key={run._id || trainNumber}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredTrain({ ...run, train, x: trainX, y: trainY })}
                onMouseLeave={() => setHoveredTrain(null)}
              >
                {/* Ping Pulse Animation */}
                <circle
                  cx={trainX}
                  cy={trainY}
                  r="14"
                  fill="#f59e0b"
                  opacity="0.25"
                  className="animate-ping"
                />

                {/* Train Marker Dot */}
                <circle
                  cx={trainX}
                  cy={trainY}
                  r="8"
                  fill="#f59e0b"
                  stroke="#080d1a"
                  strokeWidth="2"
                  filter="url(#trainGlow)"
                />

                {/* Train Number Label Badge */}
                <g transform={`translate(${trainX - 26}, ${trainY - 24})`}>
                  <rect
                    width="52"
                    height="16"
                    rx="4"
                    fill="#0a1122"
                    stroke="#f59e0b"
                    strokeWidth="1.2"
                  />
                  <text
                    x="26"
                    y="11.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono"
                  >
                    {trainNumber}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredTrain && (
          <div
            className="absolute z-30 pointer-events-none bg-panel-card/95 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 shadow-2xl text-xs font-mono w-52 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${(hoveredTrain.x / 860) * 100}%`,
              top: `${(hoveredTrain.y / 460) * 100}%`,
            }}
          >
            <div className="flex items-center justify-between text-signal-cyan font-bold border-b border-panel-border pb-1 mb-1">
              <span>{hoveredTrain.train?.trainNumber}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-panel-base border border-panel-border text-ink-primary uppercase">
                {hoveredTrain.train?.type || 'Passenger'}
              </span>
            </div>
            <div className="text-ink-secondary text-[11px] font-sans font-semibold mb-1">
              {hoveredTrain.train?.name}
            </div>
            <div className="space-y-0.5 text-[11px] text-ink-muted">
              <div>Progress: <span className="text-ink-primary">{Math.round((hoveredTrain.progress || 0) * 100)}%</span></div>
              <div>Speed: <span className="text-signal-green">{hoveredTrain.currentSpeedKmph || 80} km/h</span></div>
              <div>Delay: <span className={hoveredTrain.delayMinutes > 0 ? 'text-signal-amber' : 'text-signal-green'}>{hoveredTrain.delayMinutes || 0} min</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(NetworkMap);
