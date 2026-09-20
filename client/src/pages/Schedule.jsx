import React, { useState, useEffect } from 'react';
import { CalendarClock, RefreshCw, Cpu, GitBranch, WifiOff, Loader2 } from 'lucide-react';
import api from '../api/client.js';
import GanttChart from '../components/GanttChart.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';

function Schedule() {
  const [trains, setTrains] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [mode, setMode] = useState('optimized');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [trainRes, compareRes] = await Promise.allSettled([
        api.get('/trains'),
        api.get('/simulation/compare?simulationId=default'),
      ]);

      let hasData = false;

      if (trainRes.status === 'fulfilled') {
        setTrains(trainRes.value.data || []);
        hasData = true;
      }
      if (compareRes.status === 'fulfilled') {
        setCompareData(compareRes.value.data || null);
        hasData = true;
      }

      if (hasData) {
        setError(null);
      } else {
        setError('Cannot reach the backend. Confirm the server is running on http://localhost:5000.');
      }
    } catch (err) {
      setError('Cannot reach the backend. Confirm the server is running on http://localhost:5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const metrics = mode === 'optimized'
    ? compareData?.optimizedMetrics
    : compareData?.baselineMetrics;

  const perTrain = compareData?.perTrain || compareData?.trainComparison || [];

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

      {/* ── Page Header ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-signal-amber text-xs font-mono mb-2">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>TIMETABLE &amp; CONFLICT RESOLUTION</span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink-primary tracking-tight">Train Schedule</h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Planned vs resolved arrival times — Gantt view with priority dispatch comparison.
          </p>
        </div>

        {/* Mode Toggle Button Group */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-panel-card border border-panel-border p-1">
            <button
              onClick={() => setMode('baseline')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold font-mono transition-all ${
                mode === 'baseline'
                  ? 'bg-panel-surface border border-panel-border text-ink-primary shadow-sm'
                  : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Baseline FIFO</span>
            </button>
            <button
              onClick={() => setMode('optimized')}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold font-mono transition-all ${
                mode === 'optimized'
                  ? 'bg-signal-cyan/20 border border-signal-cyan/50 text-signal-cyan shadow-sm'
                  : 'text-ink-muted hover:text-ink-secondary'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>AI Optimized</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-panel-card border border-panel-border text-ink-secondary hover:text-ink-primary hover:bg-panel-surface transition-colors"
            title="Refresh Schedule"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards ─────────────────────── */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-panel-card border border-panel-border rounded-xl p-4 shadow-lg">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">Avg Delay</div>
            <div className={`text-2xl font-extrabold font-mono ${metrics.avgDelayMinutes <= 2 ? 'text-signal-green' : 'text-signal-amber'}`}>
              {metrics.avgDelayMinutes.toFixed(1)} min
            </div>
            <p className="text-[10px] text-ink-muted mt-1">Network-wide average</p>
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl p-4 shadow-lg">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">Max Delay</div>
            <div className={`text-2xl font-extrabold font-mono ${metrics.maxDelayMinutes === 0 ? 'text-signal-green' : 'text-rose-400'}`}>
              {metrics.maxDelayMinutes} min
            </div>
            <p className="text-[10px] text-ink-muted mt-1">Peak individual bottleneck</p>
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl p-4 shadow-lg">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">Punctuality</div>
            <div className={`text-2xl font-extrabold font-mono ${metrics.punctualityRate >= 80 ? 'text-signal-green' : 'text-signal-amber'}`}>
              {metrics.punctualityRate}%
            </div>
            <p className="text-[10px] text-ink-muted mt-1">On-time (delay &lt;= 5m)</p>
          </div>

          <div className="bg-panel-card border border-panel-border rounded-xl p-4 shadow-lg">
            <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">On-Time Trains</div>
            <div className="text-2xl font-extrabold font-mono text-signal-cyan">
              {metrics.onTimeCount} / {metrics.totalTrains}
            </div>
            <p className="text-[10px] text-ink-muted mt-1">Trains meeting schedule</p>
          </div>
        </div>
      )}

      {/* ── Gantt Chart Component ─────────────────── */}
      <ErrorBoundary>
        {loading && !trains.length ? (
          <div className="bg-panel-card border border-panel-border rounded-2xl p-16 flex flex-col items-center justify-center space-y-3 text-ink-muted">
            <Loader2 className="w-8 h-8 animate-spin text-signal-amber" />
            <p className="text-xs font-mono">Calculating timetable timeline...</p>
          </div>
        ) : (
          <GanttChart
            trains={trains}
            perTrain={perTrain}
            mode={mode}
            compareData={compareData}
          />
        )}
      </ErrorBoundary>
    </div>
  );
}

export default Schedule;
