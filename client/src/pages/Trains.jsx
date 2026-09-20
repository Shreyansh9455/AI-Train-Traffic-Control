import React, { useState, useEffect } from 'react';
import {
  Train, Plus, Trash2, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, WifiOff, MapPin, ChevronDown
} from 'lucide-react';
import { getTrains, createTrain, deleteTrain } from '../api/simulation.js';

const EMPTY_FORM = {
  trainNumber: '',
  name: '',
  type: 'passenger',
  priority: 2,
};

const TYPE_COLORS = {
  express: 'bg-rose-950/60 border-rose-800/50 text-rose-400',
  passenger: 'bg-amber-950/60 border-amber-800/50 text-amber-400',
  freight: 'bg-cyan-950/60 border-cyan-800/50 text-cyan-400',
};

const PRIORITY_LABELS = { 1: 'P1 · High (Express)', 2: 'P2 · Normal (Passenger)', 3: 'P3 · Low (Freight)' };

const inputCls =
  'w-full bg-panel-base border border-panel-border text-ink-primary text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-signal-amber/60 placeholder-ink-muted';

function Trains() {
  const [trains, setTrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchTrainList = async () => {
    setLoading(true);
    try {
      const data = await getTrains();
      setTrains(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load trains:', err);
      setError('Cannot reach the backend. Confirm the server is running on http://localhost:5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainList();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.trainNumber.trim()) {
      showToast('error', 'Train Number is required');
      return;
    }
    if (!form.name.trim()) {
      showToast('error', 'Train Name is required');
      return;
    }

    setSaving(true);
    try {
      await createTrain({
        trainNumber: form.trainNumber.trim().toUpperCase(),
        name: form.name.trim(),
        type: form.type,
        priority: Number(form.priority),
        route: [], // Submits with empty route array by default
      });

      showToast('success', `Created train ${form.trainNumber.toUpperCase()}`);
      setForm(EMPTY_FORM);
      fetchTrainList();
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to create train';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (train) => {
    const ok = window.confirm(`Are you sure you want to delete train "${train.trainNumber} - ${train.name}"?`);
    if (!ok) return;

    setDeletingId(train._id);
    try {
      await deleteTrain(train._id);
      showToast('success', `Deleted train ${train.trainNumber}`);
      fetchTrainList();
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || 'Failed to delete train';
      showToast('error', msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-mono transition-all animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700/60 text-emerald-300'
              : 'bg-rose-950/90 border-rose-700/60 text-rose-300'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono shadow-lg animate-pulse">
          <WifiOff className="w-5 h-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <span className="font-bold uppercase tracking-wider block">Connection Error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTrainList}
            className="px-3 py-1.5 rounded-lg bg-rose-900/60 border border-rose-700 hover:bg-rose-800 text-rose-200 font-semibold transition-colors flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-signal-cyan animate-ping" />
            <span className="text-[11px] font-mono font-semibold text-signal-cyan uppercase tracking-widest">
              Rolling Stock Management
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink-primary tracking-tight">Train Profiles & Timetable</h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Configure rolling stock classifications, dispatch priority weights, and station route stops
          </p>
        </div>

        <button
          onClick={fetchTrainList}
          disabled={loading}
          className="p-2.5 rounded-xl bg-panel-card border border-panel-border text-ink-secondary hover:text-ink-primary hover:bg-panel-surface transition-colors self-start sm:self-auto"
          title="Refresh Train List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Add Train Mini-Form ──────────────────────── */}
      <div className="bg-panel-card border border-panel-border rounded-2xl p-5 shadow-xl space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-ink-primary">Register New Train</h2>
          <p className="text-xs text-ink-secondary">Add rolling stock to the active traffic management database</p>
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Train Number */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              Train Number
            </label>
            <input
              type="text"
              value={form.trainNumber}
              onChange={(e) => setForm({ ...form, trainNumber: e.target.value })}
              placeholder="e.g. 12301"
              disabled={saving}
              className={inputCls}
            />
          </div>

          {/* Train Name */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              Train Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rajdhani Express"
              disabled={saving}
              className={inputCls}
            />
          </div>

          {/* Type */}
          <div className="relative">
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              Rolling Stock Type
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              disabled={saving}
              className={`${inputCls} appearance-none pr-8`}
            >
              <option value="express">Express</option>
              <option value="passenger">Passenger</option>
              <option value="freight">Freight</option>
            </select>
            <ChevronDown className="absolute right-3 top-7 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
          </div>

          {/* Priority */}
          <div className="relative">
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              Dispatch Priority
            </label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              disabled={saving}
              className={`${inputCls} appearance-none pr-8`}
            >
              <option value={1}>P1 · High (Express)</option>
              <option value={2}>P2 · Normal (Passenger)</option>
              <option value={3}>P3 · Low (Freight)</option>
            </select>
            <ChevronDown className="absolute right-3 top-7 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
          </div>

          {/* Submit Button */}
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center space-x-1.5 py-2.5 rounded-xl bg-signal-cyan/20 border border-signal-cyan/40 text-signal-cyan hover:bg-signal-cyan/30 text-xs font-mono font-bold transition-all disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Add Train</span>
            </button>
          </div>
        </form>

        <p className="text-[11px] text-ink-muted font-mono pt-1">
          ℹ️ <strong>Note:</strong> Trains created via this quick form start with an empty route array. Full intermediate stop schedules can be attached via the API.
        </p>
      </div>

      {/* ── Trains Table ───────────────────────────── */}
      <div className="bg-panel-card border border-panel-border rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-panel-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-ink-primary">Registered Trains Registry</h2>
            <p className="text-xs text-ink-secondary">Complete rolling stock inventory and priority weighting</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-panel-base border border-panel-border text-ink-muted">
            {trains.length} trains registered
          </span>
        </div>

        {loading && trains.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-ink-muted">
            <Loader2 className="w-6 h-6 animate-spin text-signal-cyan" />
            <p className="text-xs font-mono">Loading registered trains...</p>
          </div>
        ) : trains.length === 0 ? (
          <div className="py-16 text-center text-ink-muted space-y-2 font-mono text-xs">
            <Train className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-sm font-semibold text-ink-secondary">No trains registered</p>
            <p>Use the form above to add your first train profile.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-panel-base/60 text-ink-muted border-b border-panel-border uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Number</th>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Route Stops</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {trains.map((train) => {
                  const typeCls = TYPE_COLORS[train.type] || TYPE_COLORS.passenger;
                  const routeStopsCount = train.route?.length || 0;
                  const isDeleting = deletingId === train._id;

                  return (
                    <tr key={train._id} className="hover:bg-panel-surface/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-ink-primary">{train.trainNumber}</td>
                      <td className="px-6 py-4 text-ink-secondary font-sans font-semibold">{train.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${typeCls}`}>
                          {train.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ink-primary font-bold">
                        P{train.priority} <span className="text-[11px] text-ink-muted font-normal">({PRIORITY_LABELS[train.priority] || 'Custom'})</span>
                      </td>
                      <td className="px-6 py-4 text-ink-secondary">
                        <span className="inline-flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-signal-cyan" />
                          <span>{routeStopsCount} {routeStopsCount === 1 ? 'stop' : 'stops'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(train)}
                          disabled={isDeleting}
                          className="p-2 rounded-lg bg-panel-base border border-panel-border text-ink-secondary hover:text-rose-400 hover:border-rose-700 transition-colors disabled:opacity-40"
                          title="Delete Train"
                        >
                          {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
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

export default Trains;
