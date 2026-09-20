import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import { 
  Activity, 
  RefreshCw, 
  Server, 
  Database, 
  Radio, 
  Clock 
} from 'lucide-react';

const PAGE_TITLES = {
  '/': { title: 'Dashboard', subtitle: 'Operational Telemetry & Simulation Control' },
  '/trains': { title: 'Trains', subtitle: 'Rolling Stock Fleet & Priority Profiles' },
  '/sections': { title: 'Sections', subtitle: 'Track Infrastructure & Signal Block Capacities' },
  '/schedule': { title: 'Schedule', subtitle: 'Conflict-Free Timetable & Dispatch Engine' },
};

function Topbar() {
  const location = useLocation();
  const [healthStatus, setHealthStatus] = useState('checking'); // 'connected' | 'error' | 'checking'
  const [healthData, setHealthData] = useState(null);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    try {
      const response = await apiClient.get('/health');
      setHealthData(response.data);
      setHealthStatus('connected');
      setLastCheckTime(new Date().toLocaleTimeString());
    } catch (error) {
      console.warn('Backend connection health check failed:', error.message);
      setHealthData(null);
      setHealthStatus('error');
      setLastCheckTime(new Date().toLocaleTimeString());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentPage = PAGE_TITLES[location.pathname] || {
    title: 'Control Panel',
    subtitle: 'AI Train Traffic Control System',
  };

  const isDbConnected = healthData?.database === 'connected';

  return (
    <header className="h-16 bg-panel-header border-b border-panel-border px-6 flex items-center justify-between shrink-0 select-none">
      {/* Current Page Title */}
      <div>
        <h1 id="page-title" className="text-lg font-bold text-ink-primary tracking-tight flex items-center space-x-2">
          <span>{currentPage.title}</span>
          <span className="text-xs font-mono text-ink-muted font-normal">/</span>
          <span className="text-xs font-normal text-ink-secondary">{currentPage.subtitle}</span>
        </h1>
      </div>

      {/* Right Side Status & Live Connection Indicator */}
      <div className="flex items-center space-x-4">
        {/* Live Clock */}
        <div className="hidden md:flex items-center space-x-2 text-xs font-mono text-ink-muted bg-panel-base px-3 py-1.5 rounded-lg border border-panel-border">
          <Clock className="w-3.5 h-3.5 text-ink-muted" />
          <span>OCC TIME:</span>
          <span className="text-ink-primary font-semibold">
            {new Date().toLocaleTimeString()}
          </span>
        </div>

        {/* Live Connection Indicator */}
        <div
          id="connection-indicator"
          className={`flex items-center space-x-2.5 text-xs font-mono px-3 py-1.5 rounded-lg border transition-all duration-300 ${
            healthStatus === 'connected'
              ? isDbConnected
                ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300'
                : 'bg-amber-950/40 border-amber-900/60 text-amber-300'
              : healthStatus === 'error'
              ? 'bg-rose-950/50 border-rose-900/70 text-rose-300 animate-pulse'
              : 'bg-panel-base border-panel-border text-ink-muted'
          }`}
        >
          {/* Signal Indicator Dot */}
          <div className="relative flex items-center justify-center">
            {healthStatus === 'connected' ? (
              <>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isDbConnected ? 'bg-signal-green shadow-signal-green' : 'bg-signal-amber shadow-signal-amber'
                  }`}
                ></span>
                <span
                  className={`absolute w-4 h-4 rounded-full animate-ping opacity-60 ${
                    isDbConnected ? 'bg-signal-green' : 'bg-signal-amber'
                  }`}
                ></span>
              </>
            ) : healthStatus === 'error' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-signal-red shadow-signal-red"></span>
                <span className="absolute w-4 h-4 rounded-full bg-signal-red animate-ping opacity-60"></span>
              </>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse"></span>
            )}
          </div>

          {/* Connection Label */}
          <span className="font-semibold tracking-tight">
            {healthStatus === 'connected' ? (
              isDbConnected ? (
                'API connected · DB connected'
              ) : (
                'API connected · DB disconnected'
              )
            ) : healthStatus === 'error' ? (
              'API unreachable'
            ) : (
              'Checking...'
            )}
          </span>

          {/* Manual Refresh Button */}
          <button
            onClick={checkHealth}
            disabled={isRefreshing}
            title="Refresh backend status"
            className="text-ink-muted hover:text-ink-primary transition-colors disabled:opacity-50 p-0.5"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
