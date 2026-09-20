import React from 'react';
import { CalendarClock, Clock } from 'lucide-react';

/**
 * Dependency-free Gantt-style Timetable Component (Day 20)
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders planned vs. actual schedule spans using CSS percentage widths
 * across a shared time horizon axis.
 *
 * @param {Object} props
 * @param {Array}  props.trains   - Train documents with .route array
 * @param {Array}  props.perTrain - Delay comparison array from /api/simulation/compare
 * @param {string} props.mode     - 'baseline' | 'optimized'
 */
function GanttChart({ trains = [], perTrain = [], mode = 'baseline', compareData = null }) {
  // Normalize comparison map
  const delayMap = {};
  const comparisonList = perTrain.length > 0 ? perTrain : (compareData?.perTrain || compareData?.trainComparison || []);

  comparisonList.forEach((item) => {
    const id = String(item.trainId || item.id || item.trainNumber);
    const delay = mode === 'optimized'
      ? (item.optimizedDelayMinutes ?? item.optimizedDelay ?? 0)
      : (item.baselineDelayMinutes ?? item.baselineDelay ?? 0);
    delayMap[id] = delay;
    if (item.trainNumber) delayMap[item.trainNumber] = delay;
  });

  // Calculate planned and actual start/end for each train
  const scheduleRows = trains.map((train) => {
    const id = String(train._id || train.id || train.trainNumber);
    const route = train.route || [];

    let plannedStart = 0;
    let plannedEnd = 60;

    if (route.length > 0) {
      const firstStop = route[0];
      const lastStop = route[route.length - 1];

      plannedStart = firstStop.departureTimeMinutes ?? firstStop.departureMin ?? firstStop.arrivalTimeMinutes ?? firstStop.arrivalMin ?? 0;
      plannedEnd = lastStop.arrivalTimeMinutes ?? lastStop.arrivalMin ?? lastStop.departureTimeMinutes ?? lastStop.departureMin ?? (plannedStart + 45);
    }

    const rawDelay = Number(delayMap[id] ?? delayMap[train.trainNumber] ?? 0);
    const delay = isNaN(rawDelay) ? 0 : rawDelay;
    const safeStart = Number(plannedStart) || 0;
    const safeEnd = Math.max(safeStart + 1, Number(plannedEnd) || (safeStart + 45));
    const actualEnd = safeEnd + delay;

    return {
      train,
      trainNumber: train.trainNumber || '---',
      name: train.name || '',
      type: train.type || 'passenger',
      priority: train.priority ?? 2,
      plannedStart: safeStart,
      plannedEnd: safeEnd,
      delay,
      actualEnd,
    };
  });

  // Determine global time horizon (maximum actualEnd across all trains)
  const validEnds = scheduleRows.flatMap((r) => [r.actualEnd, r.plannedEnd]).filter(Number.isFinite);
  const maxActualEnd = validEnds.length > 0 ? Math.max(...validEnds, 120) : 120;

  // Add 15% headroom so bars do not clip against the right edge
  const horizon = Math.max(60, Math.ceil((maxActualEnd * 1.15) / 10) * 10);

  const toPct = (min) => `${Math.max(0, Math.min(100, ((Number(min) || 0) / horizon) * 100)).toFixed(2)}%`;
  const toWidth = (start, end) => {
    const s = Number(start) || 0;
    const e = Number(end) || s + 1;
    const w = ((e - s) / horizon) * 100;
    return `${Math.max(1, Math.min(100 - (s / horizon) * 100, w)).toFixed(2)}%`;
  };

  // Time ruler ticks (10 divisions)
  const tickCount = 10;
  const tickInterval = Math.round(horizon / tickCount);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => i * tickInterval);

  if (trains.length === 0) {
    return (
      <div className="bg-panel-card border border-panel-border rounded-2xl p-12 text-center text-ink-muted">
        <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-semibold text-ink-secondary">No train schedules available</p>
        <p className="text-xs mt-1">Register trains or seed the database to generate timetable charts.</p>
      </div>
    );
  }

  return (
    <div className="bg-panel-card border border-panel-border rounded-2xl overflow-hidden shadow-xl select-none">
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-panel-border">
        <div>
          <h3 className="text-sm font-bold text-ink-primary">Timetable Gantt & Conflict Overview</h3>
          <p className="text-xs text-ink-secondary mt-0.5">
            Planned route time window vs. {mode === 'optimized' ? 'AI Priority-Aware' : 'Baseline FIFO'} clearance
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-4 text-[11px] font-mono">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2 rounded bg-slate-600/80 border border-slate-500/40 inline-block" />
            <span className="text-ink-muted">Planned Span</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-2 rounded bg-signal-amber inline-block" />
            <span className="text-ink-secondary">Actual Span (with delay)</span>
          </div>
        </div>
      </div>

      {/* Gantt Chart Grid */}
      <div className="p-6 space-y-4 overflow-x-auto">
        {/* Shared Time Ruler */}
        <div className="relative h-6 ml-44 mr-28 border-b border-panel-border/60">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute top-0 flex flex-col items-center -translate-x-1/2"
              style={{ left: toPct(t) }}
            >
              <span className="text-[10px] font-mono text-ink-muted">T+{t}m</span>
              <div className="h-1.5 w-px bg-panel-border" />
            </div>
          ))}
          <div className="absolute right-0 top-0 flex items-center text-[10px] font-mono text-ink-muted">
            <Clock className="w-3 h-3 mr-1 opacity-60" />
            <span>{horizon}m</span>
          </div>
        </div>

        {/* Train Schedule Rows */}
        {scheduleRows.map((row) => {
          const isDelayed = row.delay > 0;
          const isSeverelyDelayed = row.delay > 5; // > 5 min defines off-time threshold

          return (
            <div key={row.train._id || row.trainNumber} className="flex items-center gap-4 group">
              {/* Train Meta Info (Fixed Left Column) */}
              <div className="w-44 shrink-0 font-mono">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-ink-primary group-hover:text-signal-cyan transition-colors">
                    {row.trainNumber}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-panel-base border border-panel-border text-ink-muted uppercase">
                    {row.type}
                  </span>
                </div>
                <div className="text-[11px] text-ink-secondary truncate max-w-[170px] font-sans">
                  {row.name}
                </div>
              </div>

              {/* Horizontal Timeline Track */}
              <div className="flex-1 h-9 relative bg-panel-base rounded-xl border border-panel-border/70 overflow-hidden flex items-center px-1">
                {/* Vertical Background Grid Lines */}
                {ticks.map((t) => (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 w-px bg-panel-border/30"
                    style={{ left: toPct(t) }}
                  />
                ))}

                {/* 1. Planned Span Bar (Muted Gray / Slate) */}
                <div
                  className="absolute top-1.5 h-3 rounded-md bg-slate-700/60 border border-slate-600/50"
                  style={{
                    left: toPct(row.plannedStart),
                    width: toWidth(row.plannedStart, row.plannedEnd),
                  }}
                  title={`Planned: T+${row.plannedStart}m → T+${row.plannedEnd}m`}
                />

                {/* 2. Actual Span Bar (Amber / Signal Orange, extends past planned if delayed) */}
                <div
                  className={`absolute bottom-1.5 h-3.5 rounded-md transition-all shadow-md ${
                    isDelayed ? 'bg-signal-amber/90 border border-amber-400/50' : 'bg-signal-green/80 border border-emerald-400/40'
                  }`}
                  style={{
                    left: toPct(row.plannedStart),
                    width: toWidth(row.plannedStart, row.actualEnd),
                  }}
                  title={`Actual: T+${row.plannedStart}m → T+${row.actualEnd}m (Delay: +${row.delay}m)`}
                />
              </div>

              {/* Delay Amount & Status (Fixed Right Column) */}
              <div className="w-28 shrink-0 text-right font-mono text-xs">
                <span
                  className={`font-bold ${
                    !isDelayed
                      ? 'text-signal-green'
                      : isSeverelyDelayed
                      ? 'text-signal-red'
                      : 'text-signal-amber'
                  }`}
                >
                  {isDelayed ? `+${row.delay} min` : 'On Time'}
                </span>
                <div className="text-[10px] text-ink-muted">
                  Arr: T+{row.actualEnd}m
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(GanttChart);
