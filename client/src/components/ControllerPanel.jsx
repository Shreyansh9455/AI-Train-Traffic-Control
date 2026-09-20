import React, { useState } from 'react';
import {
  Play, Pause, RotateCcw, AlertTriangle, Zap,
  Loader2, GitBranch, Cpu, ChevronDown
} from 'lucide-react';
import {
  startSimulation,
  pauseSimulation,
  resetSimulation,
  injectDelay,
} from '../api/simulation.js';

/**
 * Simulation Controller Panel (Day 21)
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides real-time clock controls, manual delay injection, and mode switching.
 *
 * @param {Object}   props
 * @param {Array}    props.trains         - Array of trains or train runs for dropdown
 * @param {string}   props.mode           - 'baseline' | 'optimized'
 * @param {Function} props.onModeChange   - Callback (newMode: string) => void
 * @param {Function} props.onAction       - Callback invoked after successful API operations
 * @param {Object}   [props.clock]        - Optional clock object { isRunning, currentMinute }
 */
function ControllerPanel({
  trains = [],
  mode = 'baseline',
  onModeChange,
  onAction,
  onActionSuccess,
  onSimUpdate,
  clock = null,
}) {
  const [busy, setBusy] = useState(false);
  const [selectedTrainId, setSelectedTrainId] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(10);
  const [statusMessage, setStatusMessage] = useState(null);

  // Normalize train list for the dropdown
  const trainOptions = trains.map((item) => {
    const trainObj = item.train || item;
    const id = String(item.train?._id || item._id || item.trainId || item.trainNumber);
    const number = trainObj.trainNumber || item.trainNumber || '---';
    const name = trainObj.name || item.name || '';
    return { id, number, name };
  });

  const notifyParent = () => {
    if (typeof onAction === 'function') onAction();
    if (typeof onActionSuccess === 'function') onActionSuccess();
    if (typeof onSimUpdate === 'function') onSimUpdate();
  };

  const handleStart = async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      await startSimulation({ tickIntervalMs: 1000, minutesPerTick: 1 });
      setStatusMessage({ type: 'success', text: 'Simulation started' });
      notifyParent();
    } catch (err) {
      console.error('Start error:', err);
      const msg = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to start simulation';
      alert(`Simulation Error: ${msg}`);
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setBusy(false);
    }
  };

  const handlePause = async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      await pauseSimulation();
      setStatusMessage({ type: 'success', text: 'Simulation paused' });
      notifyParent();
    } catch (err) {
      console.error('Pause error:', err);
      const msg = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to pause simulation';
      alert(`Simulation Error: ${msg}`);
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    setStatusMessage(null);
    try {
      await resetSimulation();
      setStatusMessage({ type: 'success', text: 'Simulation reset' });
      notifyParent();
    } catch (err) {
      console.error('Reset error:', err);
      const msg = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to reset simulation';
      alert(`Simulation Error: ${msg}`);
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setBusy(false);
    }
  };

  const handleInjectDelay = async (e) => {
    e.preventDefault();
    if (!selectedTrainId) {
      alert('Please select a train from the dropdown before injecting delay.');
      return;
    }

    const mins = Number(delayMinutes);
    if (isNaN(mins) || mins < 0) {
      alert('Please enter a valid non-negative delay in minutes (>= 0).');
      return;
    }

    setBusy(true);
    setStatusMessage(null);
    try {
      await injectDelay(selectedTrainId, mins);
      setStatusMessage({ type: 'success', text: `Injected +${mins}m delay` });
      notifyParent();
    } catch (err) {
      console.error('Inject error:', err);
      const msg = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to inject delay';
      alert(`Delay Injection Error: ${msg}`);
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setBusy(false);
    }
  };

  const isRunning = Boolean(clock?.isRunning);

  return (
    <div className="bg-panel-card border border-panel-border rounded-2xl p-5 shadow-xl space-y-5 select-none">
      {/* ── 1. Panel Header ───────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-panel-border">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-800/50 flex items-center justify-center">
            <Zap className="w-4 h-4 text-signal-amber" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-primary">Simulation Controller</h3>
            <p className="text-[11px] font-mono text-ink-muted">
              {clock ? `T+${clock.currentMinute ?? 0} sim min` : 'Manual Dispatch & Clock'}
            </p>
          </div>
        </div>

        {/* Live Clock Indicator */}
        <div
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold ${
            isRunning
              ? 'bg-emerald-950/60 border-emerald-800/50 text-signal-green'
              : 'bg-panel-base border-panel-border text-ink-muted'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-signal-green animate-ping' : 'bg-ink-muted'}`} />
          <span>{isRunning ? 'RUNNING' : 'PAUSED'}</span>
        </div>
      </div>

      {/* ── 2. Playback Control Buttons (Start / Pause / Reset) ── */}
      <div className="space-y-2">
        <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
          Simulation Clock Controls
        </label>
        <div className="grid grid-cols-3 gap-2">
          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={busy || isRunning}
            className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-signal-green hover:bg-emerald-900/50 hover:border-signal-green transition-all disabled:opacity-40 disabled:pointer-events-none text-xs font-mono font-bold shadow-sm"
            title="Start Simulation Tick Loop"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start</span>
          </button>

          {/* Pause Button */}
          <button
            onClick={handlePause}
            disabled={busy || !isRunning}
            className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-signal-amber hover:bg-amber-900/50 hover:border-signal-amber transition-all disabled:opacity-40 disabled:pointer-events-none text-xs font-mono font-bold shadow-sm"
            title="Pause Simulation Clock"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            disabled={busy}
            className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-signal-red hover:bg-rose-900/50 hover:border-signal-red transition-all disabled:opacity-40 disabled:pointer-events-none text-xs font-mono font-bold shadow-sm"
            title="Reset Simulation History & Delays"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ── 3. Manual Delay Injection Mini-Form ────── */}
      <form onSubmit={handleInjectDelay} className="space-y-3 pt-3 border-t border-panel-border">
        <div className="flex items-center space-x-1.5 text-[11px] font-mono uppercase tracking-wider text-ink-muted">
          <AlertTriangle className="w-3.5 h-3.5 text-signal-amber" />
          <span>Inject Manual Delay</span>
        </div>

        {/* Train Selector Dropdown */}
        <div className="relative">
          <select
            value={selectedTrainId}
            onChange={(e) => setSelectedTrainId(e.target.value)}
            disabled={busy}
            className="w-full appearance-none bg-panel-base border border-panel-border text-ink-primary text-xs font-mono rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:border-signal-amber/60 disabled:opacity-50"
          >
            <option value="">-- Select Train --</option>
            {trainOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.number} {t.name ? `· ${t.name}` : ''}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-3 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
        </div>

        {/* Minutes Input + Inject Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              max="180"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(e.target.value)}
              disabled={busy}
              placeholder="Delay (min)"
              className="w-full bg-panel-base border border-panel-border text-ink-primary text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-signal-amber/60 disabled:opacity-50"
            />
            <span className="absolute right-3 top-2.5 text-[11px] font-mono text-ink-muted pointer-events-none">
              min
            </span>
          </div>

          <button
            type="submit"
            disabled={busy || !selectedTrainId}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold font-mono transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center space-x-1 shadow-md shadow-amber-900/30"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Inject</span>}
          </button>
        </div>

        {statusMessage && (
          <div
            className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border flex items-center space-x-1.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
            }`}
          >
            <span>{statusMessage.text}</span>
          </div>
        )}
      </form>

      {/* ── 4. Baseline / AI-Optimized Mode Toggle ─── */}
      <div className="space-y-2 pt-3 border-t border-panel-border">
        <label className="text-[11px] font-mono uppercase tracking-wider text-ink-muted block">
          Dispatch Algorithm Mode
        </label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-panel-base rounded-xl border border-panel-border">
          <button
            type="button"
            onClick={() => onModeChange && onModeChange('baseline')}
            disabled={busy}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
              mode === 'baseline'
                ? 'bg-panel-surface border border-panel-border text-ink-primary shadow-sm'
                : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Baseline FIFO</span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange && onModeChange('optimized')}
            disabled={busy}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
              mode === 'optimized'
                ? 'bg-signal-cyan/20 border border-signal-cyan/50 text-signal-cyan shadow-sm'
                : 'text-ink-muted hover:text-ink-secondary'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Optimized</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ControllerPanel;
