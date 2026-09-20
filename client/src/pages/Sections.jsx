import React, { useState, useEffect } from 'react';
import {
  GitBranch, Plus, Trash2, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, WifiOff, ChevronDown, Layers, Route
} from 'lucide-react';
import { getSections, getStations, createSection, deleteSection } from '../api/simulation.js';

const EMPTY_FORM = {
  code: '',
  fromStation: '',
  toStation: '',
  lengthKm: 15,
  capacity: 1,
  lineType: 'single',
};

const inputCls =
  'w-full bg-panel-base border border-panel-border text-ink-primary text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-signal-amber/60 placeholder-ink-muted';

function Sections() {
  const [sections, setSections] = useState([]);
  const [stations, setStations] = useState([]);
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

  const fetchInfrastructure = async () => {
    setLoading(true);
    try {
      const [secData, stnData] = await Promise.all([
        getSections(),
        getStations(),
      ]);
      setSections(secData || []);
      setStations(stnData || []);

      if (stnData && stnData.length >= 2 && !form.fromStation) {
        setForm((prev) => ({
          ...prev,
          fromStation: prev.fromStation || stnData[0]._id,
          toStation: prev.toStation || stnData[1]._id,
        }));
      }

      setError(null);
    } catch (err) {
      console.error('Failed to load infrastructure:', err);
      setError('Cannot reach the backend. Confirm the server is running on http://localhost:5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfrastructure();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      showToast('error', 'Section Code is required');
      return;
    }
    if (!form.fromStation) {
      showToast('error', 'From Station is required');
      return;
    }
    if (!form.toStation) {
      showToast('error', 'To Station is required');
      return;
    }
    if (form.fromStation === form.toStation) {
      showToast('error', 'From and To station cannot be identical');
      return;
    }
    if (Number(form.lengthKm) <= 0) {
      showToast('error', 'Length must be > 0 km');
      return;
    }

    setSaving(true);
    try {
      await createSection({
        code: form.code.trim().toUpperCase(),
        fromStation: form.fromStation,
        toStation: form.toStation,
        lengthKm: Number(form.lengthKm),
        capacity: Number(form.capacity),
        lineType: form.lineType,
        maxSpeedKmph: 100,
      });

      showToast('success', `Created section ${form.code.toUpperCase()}`);
      setForm({
        ...EMPTY_FORM,
        fromStation: stations[0]?._id || '',
        toStation: stations[1]?._id || '',
      });
      fetchInfrastructure();
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || err.message || 'Failed to create section';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sec) => {
    const ok = window.confirm(`Are you sure you want to delete section "${sec.code}"?`);
    if (!ok) return;

    setDeletingId(sec._id);
    try {
      await deleteSection(sec._id);
      showToast('success', `Deleted section ${sec.code}`);
      fetchInfrastructure();
    } catch (err) {
      const msg = err.response?.data?.details || err.response?.data?.error || 'Failed to delete section';
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
            onClick={fetchInfrastructure}
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
              Network Topology Infrastructure
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-ink-primary tracking-tight">Track Sections & Blocks</h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Manage track block links, single-line bottleneck segments, and double-line throughput corridors
          </p>
        </div>

        <button
          onClick={fetchInfrastructure}
          disabled={loading}
          className="p-2.5 rounded-xl bg-panel-card border border-panel-border text-ink-secondary hover:text-ink-primary hover:bg-panel-surface transition-colors self-start sm:self-auto"
          title="Refresh Sections"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Add Section Mini-Form ────────────────────── */}
      <div className="bg-panel-card border border-panel-border rounded-2xl p-5 shadow-xl space-y-3">
        <div>
          <h2 className="text-sm font-extrabold text-ink-primary">Register New Track Section</h2>
          <p className="text-xs text-ink-secondary">Define block connectivity between two physical stations</p>
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 pt-1">
          {/* Section Code */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              Section Code
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. SEC-AB"
              disabled={saving}
              className={inputCls}
            />
          </div>

          {/* From Station */}
          <div className="relative">
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              From Station
            </label>
            <select
              value={form.fromStation}
              onChange={(e) => setForm({ ...form, fromStation: e.target.value })}
              disabled={saving}
              className={`${inputCls} appearance-none pr-8`}
            >
              <option value="">Select...</option>
              {stations.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.code} ({s.name})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-7 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
          </div>

          {/* To Station */}
          <div className="relative">
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              To Station
            </label>
            <select
              value={form.toStation}
              onChange={(e) => setForm({ ...form, toStation: e.target.value })}
              disabled={saving}
              className={`${inputCls} appearance-none pr-8`}
            >
              <option value="">Select...</option>
              {stations.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.code} ({s.name})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-7 w-3.5 h-3.5 text-ink-muted pointer-events-none" />
          </div>

          {/* Length */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              Length (km)
            </label>
            <input
              type="number"
              min="1"
              step="0.5"
              value={form.lengthKm}
              onChange={(e) => setForm({ ...form, lengthKm: e.target.value })}
              disabled={saving}
              className={inputCls}
            />
          </div>

          {/* Capacity */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              Capacity
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              disabled={saving}
              className={inputCls}
            />
          </div>

          {/* Line Type */}
          <div className="relative">
            <label className="text-[10px] font-mono uppercase tracking-wider text-ink-muted block mb-1">
              Line Type
            </label>
            <select
              value={form.lineType}
              onChange={(e) => {
                const lt = e.target.value;
                setForm({
                  ...form,
                  lineType: lt,
                  capacity: lt === 'double' ? 2 : 1,
                });
              }}
              disabled={saving}
              className={`${inputCls} appearance-none pr-8`}
            >
              <option value="single">Single Line</option>
              <option value="double">Double Line</option>
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
              <span>Add Block</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Sections Table ─────────────────────────── */}
      <div className="bg-panel-card border border-panel-border rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-panel-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-ink-primary">Track Block Registry</h2>
            <p className="text-xs text-ink-secondary">Physical inter-station track blocks and line constraints</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-panel-base border border-panel-border text-ink-muted">
            {sections.length} blocks registered
          </span>
        </div>

        {loading && sections.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3 text-ink-muted">
            <Loader2 className="w-6 h-6 animate-spin text-signal-cyan" />
            <p className="text-xs font-mono">Loading track infrastructure...</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="py-16 text-center text-ink-muted space-y-2 font-mono text-xs">
            <GitBranch className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-sm font-semibold text-ink-secondary">No track sections registered</p>
            <p>Use the form above to add your first track block.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-panel-base/60 text-ink-muted border-b border-panel-border uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">From</th>
                  <th className="px-6 py-3.5">To</th>
                  <th className="px-6 py-3.5">Length</th>
                  <th className="px-6 py-3.5">Capacity</th>
                  <th className="px-6 py-3.5">Line Type</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {sections.map((sec) => {
                  const fromCode = sec.fromStation?.code || '—';
                  const toCode = sec.toStation?.code || '—';
                  const isSingle = sec.lineType === 'single' || sec.capacity <= 1;
                  const isDeleting = deletingId === sec._id;

                  return (
                    <tr key={sec._id} className="hover:bg-panel-surface/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-ink-primary">
                        {sec.code || (fromCode !== '—' && toCode !== '—' ? `${fromCode}–${toCode}` : 'SEC')}
                      </td>
                      <td className="px-6 py-4 text-ink-primary font-semibold">{fromCode}</td>
                      <td className="px-6 py-4 text-ink-primary font-semibold">{toCode}</td>
                      <td className="px-6 py-4 text-ink-secondary">{sec.lengthKm} km</td>
                      <td className="px-6 py-4 text-ink-secondary">
                        {sec.capacity} {sec.capacity > 1 ? 'trains' : 'train'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isSingle
                              ? 'bg-amber-950/50 border-amber-800/60 text-signal-amber'
                              : 'bg-emerald-950/50 border-emerald-800/60 text-signal-green'
                          }`}
                        >
                          {isSingle ? 'Single Line' : 'Double Line'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(sec)}
                          disabled={isDeleting}
                          className="p-2 rounded-lg bg-panel-base border border-panel-border text-ink-secondary hover:text-rose-400 hover:border-rose-700 transition-colors disabled:opacity-40"
                          title="Delete Section"
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

export default Sections;
