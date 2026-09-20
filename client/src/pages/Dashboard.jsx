import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, AlertTriangle, CheckCircle2, Train,
  Radio, Loader2, WifiOff, RefreshCw, Cpu
} from 'lucide-react';
import { getSimulationState, getMetrics, SIM_ID } from '../api/simulation.js';
import api from '../api/client.js';
import KpiCard from '../components/KpiCard.jsx';
import NetworkMap from '../components/NetworkMap.jsx';
import ControllerPanel from '../components/ControllerPanel.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

const POLL_INTERVAL_MS = 2000;

function Dashboard() {
  const [simState, setSimState] = useState(null);
  const [metricsData, setMetricsData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [mode, setMode] = useState('baseline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [staticStations, setStaticStations] = useState([]);
  const [staticSections, setStaticSections] = useState([]);

  // Fetch static topology (stations, sections) once on mount
  useEffect(() => {
    async function fetchInfrastructure() {
      try {
        const [stnRes, secRes] = await Promise.allSettled([
          api.get('/stations'),
          api.get('/sections'),
        ]);
        if (stnRes.status === 'fulfilled') setStaticStations(stnRes.value.data || []);
        if (secRes.status === 'fulfilled') setStaticSections(secRes.value.data || []);
      } catch (err) {
        console.warn('Failed to load static infrastructure:', err);
      }
    }
    fetchInfrastructure();
  }, []);

  const isFetchingRef = React.useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return; // Guard: prevent overlapping concurrent polls
    isFetchingRef.current = true;

    try {
      const [stateResult, metricsResult, compareResult] = await Promise.allSettled([
        getSimulationState(SIM_ID),
        getMetrics(mode, SIM_ID),
        api.get(`/simulation/compare?simulationId=${SIM_ID}`),
      ]);

      let hasSuccess = false;

      if (stateResult.status === 'fulfilled') {
        setSimState(stateResult.value);
        hasSuccess = true;
      }
      if (metricsResult.status === 'fulfilled') {
        setMetricsData(metricsResult.value?.metrics || null);
        hasSuccess = true;
      }
      if (compareResult.status === 'fulfilled') {
        setCompareData(compareResult.value.data);
      }

      if (hasSuccess) {
        setError(null);
      } else if (stateResult.status === 'rejected') {
        setError('Cannot reach the backend. Confirm the server is running on http://localhost:5000.');
      }
    } catch (err) {
      setError('Cannot reach the backend. Confirm the server is running on http://localhost:5000.');
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [mode]);

  // Polling loop with 2-second interval, cleanly unmounted
  useEffect(() => {
    fetchData();
    const timerId = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(timerId);
  }, [fetchData]);

  // Extract variables with useMemo to prevent unnecessary array recalculations
  const clock = simState?.clock;
  const trainRuns = simState?.trains || [];
  const sections = staticSections.length > 0 ? staticSections : (simState?.sections || []);

  const stations = React.useMemo(() => {
    if (staticStations.length > 0) return staticStations;
    return sections
      .flatMap((s) => [s.fromStation, s.toStation])
      .filter(Boolean)
      .reduce((acc, st) => {
        if (st?._id && !acc.find((x) => String(x._id) === String(st._id))) acc.push(st);
        return acc;
      }, []);
  }, [staticStations, sections]);

  const totalTrains = metricsData?.totalTrains ?? trainRuns.length ?? 0;
  const avgDelay = metricsData?.avgDelayMinutes ?? 0;
  const punctuality = metricsData?.punctualityRate ?? metricsData?.punctualityPercent ?? 100;
  const maxDelay = metricsData?.maxDelayMinutes ?? 0;

  return (
    <div className="space-y-6">
      {/* ── Error Banner ──────────────────────────── */}
      {error && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono shadow-lg animate-pulse">
          <WifiOff className="w-5 h-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider block">Connection Error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 rounded-lg bg-rose-900/60 border border-rose-700 hover:bg-rose-800 text-rose-200 font-semibold transition-colors flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* ── Page Header Banner ────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-panel-card via-panel-surface to-panel-card border border-panel-border p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-signal-cyan/10 border border-signal-cyan/30 text-signal-cyan text-xs font-mono mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>OPERATION CONTROL CENTER · LIVE TELEMETRY</span>
            </div>
            <h1 className="text-2xl font-extrabold text-ink-primary tracking-tight">
              AI Train Traffic Control — Overview
            </h1>
            <p className="text-sm text-ink-secondary mt-1 max-w-2xl">
              Real-time block section occupancy, FIFO delay propagation, and priority-aware dispatch optimization.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            {/* Simulation Clock Indicator */}
            <div className="px-3.5 py-2 rounded-xl bg-panel-base border border-panel-border">
              <div className="text-ink-muted text-[10px] uppercase">Sim Clock</div>
              <div className={`font-bold flex items-center space-x-1.5 ${clock?.isRunning ? 'text-signal-green' : 'text-ink-secondary'}`}>
                <span>T+{clock?.currentMinute ?? 0}m</span>
                <span className={`w-2 h-2 rounded-full ${clock?.isRunning ? 'bg-signal-green animate-ping' : 'bg-ink-muted'}`} />
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-panel-base border border-panel-border p-1">
              <button
                onClick={() => setMode('baseline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === 'baseline'
                    ? 'bg-panel-surface border border-panel-border text-ink-primary shadow-sm'
                    : 'text-ink-muted hover:text-ink-secondary'
                }`}
              >
                Baseline FIFO
              </button>
              <button
                onClick={() => setMode('optimized')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${
                  mode === 'optimized'
                    ? 'bg-signal-cyan/20 border border-signal-cyan/50 text-signal-cyan shadow-sm'
                    : 'text-ink-muted hover:text-ink-secondary'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>AI Optimized</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. KPI Cards Row ──────────────────────── */}
      {loading && !simState ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-panel-card border border-panel-border animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Trains"
            value={totalTrains}
            unit="scheduled"
            icon={Train}
            tone="cyan"
            subtext={`${trainRuns.filter((r) => r.status === 'running').length} running · ${trainRuns.filter((r) => r.status === 'held').length} held`}
          />
          <KpiCard
            label="Avg Delay"
            value={avgDelay}
            unit="min"
            icon={Clock}
            tone={avgDelay <= 2 ? 'green' : avgDelay <= 6 ? 'amber' : 'rose'}
            subtext={mode === 'optimized' ? 'AI priority smoothed' : 'Unoptimized baseline'}
          />
          <KpiCard
            label="Punctuality"
            value={punctuality}
            unit="%"
            icon={CheckCircle2}
            tone={punctuality >= 85 ? 'green' : punctuality >= 60 ? 'amber' : 'rose'}
            subtext="On-time threshold <= 5 min"
          />
          <KpiCard
            label="Max Delay"
            value={maxDelay}
            unit="min"
            icon={AlertTriangle}
            tone={maxDelay === 0 ? 'green' : maxDelay <= 10 ? 'amber' : 'rose'}
            subtext="Peak single train hold"
          />
        </div>
      )}

      {/* ── 2 & 3. Network Map & Simulation Controller ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ErrorBoundary>
            <NetworkMap
              stations={stations}
              sections={sections}
              trainRuns={trainRuns}
              currentMinute={clock?.currentMinute ?? 0}
            />
          </ErrorBoundary>
        </div>

        <div>
          <ErrorBoundary>
            <ControllerPanel
              simulationId={SIM_ID}
              clock={clock}
              trains={trainRuns}
              mode={mode}
              onModeChange={setMode}
              onAction={fetchData}
              onActionSuccess={fetchData}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* ── 4. Live Train Telemetry Table ─────────── */}
      <div className="bg-panel-card border border-panel-border rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-panel-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-ink-primary">Live Train Telemetry</h2>
            <p className="text-xs text-ink-secondary">Real-time status, block location, and dynamic delays</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-signal-cyan animate-ping" />
            <span className="text-[11px] font-mono text-ink-muted">
              {trainRuns.length} registered runs
            </span>
          </div>
        </div>

        {loading && !simState ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-ink-muted">
            <Loader2 className="w-6 h-6 animate-spin text-signal-cyan" />
            <p className="text-xs font-mono">Fetching live telemetry...</p>
          </div>
        ) : trainRuns.length === 0 ? (
          <div className="py-16 text-center text-ink-muted space-y-2 font-mono text-xs">
            <Train className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-sm font-semibold text-ink-secondary">No active train journeys</p>
            <p className="text-ink-muted">Start the simulation or inject a delay to view live positions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-panel-base/60 text-ink-muted border-b border-panel-border uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Train</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Section / Location</th>
                  <th className="px-6 py-3.5 text-right">Delay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {trainRuns.map((run) => {
                  const train = run.train || {};
                  const trainNo = String(train.trainNumber || run.trainNumber || '---');
                  const trainName = String(train.name || '---');
                  const trainType = String(train.type || 'passenger').toLowerCase();
                  const priority = train.priority ?? 2;
                  const delay = Number(run.delayMinutes || 0);

                  let secCode = 'Station Dwell';
                  if (typeof run.currentSection === 'object' && run.currentSection) {
                    if (run.currentSection.code) {
                      secCode = run.currentSection.code;
                    } else if (run.currentSection.fromStation && run.currentSection.toStation) {
                      const f = run.currentSection.fromStation.code || run.currentSection.fromStation.name || 'Stn';
                      const t = run.currentSection.toStation.code || run.currentSection.toStation.name || 'Stn';
                      secCode = `${f} → ${t}`;
                    }
                  } else if (typeof run.currentSection === 'string' && run.currentSection.trim()) {
                    secCode = run.currentSection;
                  }

                  return (
                    <tr key={run._id || trainNo} className="hover:bg-panel-surface/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-ink-primary">
                        {trainNo} <span className="font-normal text-ink-secondary">({trainName})</span>
                      </td>
                      <td className="px-6 py-4 uppercase text-[11px] text-ink-secondary">
                        {trainType}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          priority === 1
                            ? 'bg-rose-950/60 border border-rose-800/60 text-rose-400'
                            : priority === 2
                            ? 'bg-amber-950/60 border border-amber-800/60 text-amber-400'
                            : 'bg-cyan-950/60 border border-cyan-800/60 text-cyan-400'
                        }`}>
                          P{priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          run.status === 'running'
                            ? 'bg-emerald-950/50 border-emerald-800/60 text-signal-green'
                            : run.status === 'held'
                            ? 'bg-amber-950/50 border-amber-800/60 text-signal-amber'
                            : run.status === 'completed'
                            ? 'bg-blue-950/50 border-blue-800/60 text-blue-400'
                            : 'bg-panel-base border-panel-border text-ink-muted'
                        }`}>
                          {run.status || 'scheduled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-secondary">
                        {secCode} {run.status === 'running' && `(${Math.round((run.progress || 0) * 100)}%)`}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${delay > 0 ? 'text-signal-amber' : 'text-signal-green'}`}>
                        {delay > 0 ? `+${delay} min` : 'On Time'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
