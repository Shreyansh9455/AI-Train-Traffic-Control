import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Train, 
  GitBranch, 
  CalendarClock, 
  Radio, 
  ShieldAlert,
  SlidersHorizontal 
} from 'lucide-react';

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    code: 'DSH-01',
    description: 'System Overview & Telemetry'
  },
  {
    path: '/trains',
    label: 'Trains',
    icon: Train,
    code: 'TRN-02',
    description: 'Fleet & Priority Profiles'
  },
  {
    path: '/sections',
    label: 'Sections',
    icon: GitBranch,
    code: 'SEC-03',
    description: 'Track Grid & Block Capacities'
  },
  {
    path: '/schedule',
    label: 'Schedule',
    icon: CalendarClock,
    code: 'SCH-04',
    description: 'Timetables & Conflict Solver'
  },
];

function Sidebar() {
  return (
    <aside className="w-64 bg-panel-surface border-r border-panel-border flex flex-col justify-between select-none shrink-0 min-h-screen">
      {/* Top Header & Branding */}
      <div>
        <div className="h-16 px-5 border-b border-panel-border flex items-center space-x-3 bg-panel-header/70 backdrop-blur-sm">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Train className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-wide text-ink-primary">
              AI TRAIN CONTROL
            </div>
            <div className="text-[10px] font-mono text-signal-cyan flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-cyan animate-pulse"></span>
              <span>OCC DISPATCH PANEL</span>
            </div>
          </div>
        </div>

        {/* Navigation with Signature Signal Rail */}
        <div className="px-4 py-6">
          <div className="text-[10px] font-mono tracking-wider text-ink-muted uppercase mb-4 px-2 flex items-center justify-between">
            <span>Signal Rail Navigation</span>
            <Radio className="w-3 h-3 text-ink-muted" />
          </div>

          {/* Signal Rail Container */}
          <nav className="relative pl-6 space-y-3">
            {/* Vertical Signal Track Line */}
            <div className="absolute left-2.5 top-4 bottom-4 w-0.5 bg-panel-rail"></div>

            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-panel-card text-ink-primary font-medium border border-panel-border/80 shadow-md'
                        : 'text-ink-secondary hover:text-ink-primary hover:bg-panel-card/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Signal Rail Node (Dot on the vertical line) */}
                      <div
                        className={`absolute -left-[18.5px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-300 border-2 ${
                          isActive
                            ? 'bg-signal-amber border-amber-300 shadow-signal-amber scale-110'
                            : 'bg-panel-surface border-panel-border group-hover:border-slate-500 group-hover:bg-slate-700'
                        }`}
                      >
                        {isActive && (
                          <div className="w-full h-full rounded-full bg-signal-amber animate-ping opacity-75"></div>
                        )}
                      </div>

                      {/* Icon & Label */}
                      <div className="flex items-center space-x-2.5">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive ? 'text-signal-amber' : 'text-ink-muted group-hover:text-ink-secondary'
                          }`}
                        />
                        <span className="tracking-tight">{item.label}</span>
                      </div>

                      {/* Code Badge */}
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                          isActive
                            ? 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                            : 'bg-panel-base text-ink-muted border-panel-border group-hover:text-ink-secondary'
                        }`}
                      >
                        {item.code}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer / Telemetry Status */}
      <div className="p-4 border-t border-panel-border bg-panel-header/50">
        <div className="p-3 rounded-lg bg-panel-base border border-panel-border">
          <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
            <span className="text-ink-muted">DISPATCH GRID:</span>
            <span className="text-signal-green font-semibold flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-green"></span>
              <span>NORMAL</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-ink-muted">SYSTEM:</span>
            <span className="text-ink-code">v1.0.0-dev</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
