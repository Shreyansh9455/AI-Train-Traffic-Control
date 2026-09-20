import React from 'react';

const TONES = {
  green: {
    border: 'border-emerald-500/30 group-hover:border-emerald-500/60',
    glow: 'shadow-emerald-500/10',
    iconBg: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400',
    text: 'text-emerald-400',
  },
  amber: {
    border: 'border-amber-500/30 group-hover:border-amber-500/60',
    glow: 'shadow-amber-500/10',
    iconBg: 'bg-amber-950/60 border-amber-800/60 text-amber-400',
    text: 'text-amber-400',
  },
  rose: {
    border: 'border-rose-500/30 group-hover:border-rose-500/60',
    glow: 'shadow-rose-500/10',
    iconBg: 'bg-rose-950/60 border-rose-800/60 text-rose-400',
    text: 'text-rose-400',
  },
  cyan: {
    border: 'border-cyan-500/30 group-hover:border-cyan-500/60',
    glow: 'shadow-cyan-500/10',
    iconBg: 'bg-cyan-950/60 border-cyan-800/60 text-cyan-400',
    text: 'text-cyan-400',
  },
  blue: {
    border: 'border-blue-500/30 group-hover:border-blue-500/60',
    glow: 'shadow-blue-500/10',
    iconBg: 'bg-blue-950/60 border-blue-800/60 text-blue-400',
    text: 'text-blue-400',
  },
};

function KpiCard({ label, value, unit = '', icon: Icon, tone = 'cyan', subtext = '', trend = null }) {
  const currentTone = TONES[tone] || TONES.cyan;

  return (
    <div className={`group relative bg-panel-card/90 backdrop-blur-md border ${currentTone.border} rounded-xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 shadow-lg ${currentTone.glow}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-muted mb-1">
            {label}
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${currentTone.text}`}>
              {value !== undefined && value !== null ? value : '--'}
            </span>
            {unit && <span className="text-xs font-mono text-ink-secondary">{unit}</span>}
          </div>
          {subtext && (
            <div className="text-[11px] text-ink-muted mt-1.5 flex items-center space-x-1">
              <span>{subtext}</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${currentTone.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

export default KpiCard;
