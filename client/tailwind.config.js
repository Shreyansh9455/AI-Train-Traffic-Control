/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        panel: {
          base: '#080d1a',
          surface: '#0d1527',
          card: '#111d35',
          'card-hover': '#162544',
          border: '#1c2b4a',
          header: '#0a1122',
          rail: '#223458',
        },
        ink: {
          primary: '#f8fafc',
          secondary: '#94a3b8',
          muted: '#64748b',
          code: '#38bdf8',
        },
        signal: {
          green: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
          cyan: '#06b6d4',
          blue: '#3b82f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'signal-amber': '0 0 15px rgba(245, 158, 11, 0.6), 0 0 30px rgba(245, 158, 11, 0.3)',
        'signal-green': '0 0 15px rgba(16, 185, 129, 0.6), 0 0 30px rgba(16, 185, 129, 0.3)',
        'signal-red': '0 0 15px rgba(239, 68, 68, 0.6), 0 0 30px rgba(239, 68, 68, 0.3)',
        'signal-cyan': '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)',
      },
    },
  },
  plugins: [],
}
