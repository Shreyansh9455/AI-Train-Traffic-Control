# AI Train Traffic Control & Autonomous Dispatch System 🚆⚡

An enterprise-grade, full-stack AI-driven Railway Traffic Management System (TMS) prototype built with **Node.js/Express**, **MongoDB/Mongoose**, and **React 18 + Vite + Tailwind CSS**.

The system features real-time conflict detection, baseline FIFO delay propagation, priority-aware AI schedule optimization (Express > Passenger > Freight), categorical delay risk forecasting, interactive SVG topological track layout, and a live telemetry dashboard.

---

## 🌐 Live Deployed Application

- **Live Frontend (OCC Dashboard):** [https://ai-train-traffic-control.vercel.app](https://ai-train-traffic-control.vercel.app) *(Replace with your Vercel URL)*
- **Live Backend API Server:** [https://ai-train-control-api.onrender.com](https://ai-train-control-api.onrender.com) *(Replace with your Render URL)*
- **API Health Check:** `https://ai-train-control-api.onrender.com/api/health`

---

## 🌟 Key Highlights & Capabilities

- **Real-Time Telemetry Dashboard:** 2-second polling of train kinematics, block occupancies, and operational KPIs.
- **Topological Track Visualizer:** Pure SVG canvas with dynamic coordinate interpolation for moving rolling stock across single and double track blocks.
- **Baseline FIFO Conflict Engine:** Models cascading domino delays on bidirectional single-line track bottlenecks under first-come, first-served queuing.
- **AI Priority-Aware Optimizer:** Heuristic multi-pass dispatch engine that resolves single-track contention by prioritizing high-urgency rolling stock (Express P1 > Passenger P2 > Freight P3), minimizing overall passenger impact.
- **Interactive Timetable Gantt Chart:** CSS-scaled timeline comparing planned route schedules against dynamic arrival timestamps.
- **Manual Delay Injector:** Live dispatcher override panel to test network resilience and cascading recovery in real time.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS | Single-Page Application (SPA), control-room dark theme UI |
| **Icons & Design** | Lucide React, Google Fonts (`Inter`, `JetBrains Mono`) | Visual indicators, signal-light status tokens, font typography |
| **Backend** | Node.js, Express.js (ES Modules) | REST API controllers, simulation lifecycle, math engines |
| **Database** | MongoDB Atlas, Mongoose ODM | Infrastructure persistence (`Station`, `Section`, `Train`, `TrainRun`) |
| **Hosting** | Vercel (Client) + Render (Server) | Free-tier cloud deployment with dynamic CORS configuration |

---

## 📁 Repository Structure

```
AI Train Traffic Control/
├── server/                                # Backend Express Server
│   ├── src/
│   │   ├── config/                        # Database connection setup
│   │   ├── models/                        # Mongoose Schemas (Station, Section, Train, TrainRun)
│   │   ├── routes/                        # REST Controllers (/api/stations, /api/sections, /api/trains, /api/simulation, /api/metrics)
│   │   ├── simulation/                    # Core Simulation & Mathematical Models
│   │   │   ├── clock.js                   # Simulation lifecycle, tick loop & state persistence
│   │   │   ├── trainPosition.js           # Kinematic coordinate interpolation
│   │   │   ├── propagation.js             # Baseline FIFO conflict detection
│   │   │   ├── optimizer.js               # Multi-pass greedy priority-aware optimizer
│   │   │   ├── metrics.js                 # Throughput, punctuality & type breakdown
│   │   │   └── prediction.js              # Categorical delay risk forecasting
│   │   ├── scripts/
│   │   │   └── seed.js                    # Database seeder (6 Stations, 5 Sections, 4 Trains)
│   │   ├── testOptimizer.js               # In-memory optimizer unit tests
│   │   └── index.js                       # Express app entrypoint & middleware
│   ├── .env.example
│   └── package.json
│
├── client/                                # Frontend React Application
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js                  # Axios client configuration
│   │   │   └── simulation.js              # Simulation API service wrappers
│   │   ├── components/
│   │   │   ├── ControllerPanel.jsx        # Dispatch & delay injection widget
│   │   │   ├── NetworkMap.jsx             # Pure SVG track topology map
│   │   │   ├── GanttChart.jsx             # Timetable comparison Gantt view
│   │   │   ├── KpiCard.jsx                # Operational metric cards
│   │   │   └── ErrorBoundary.jsx          # UI fault-tolerance wrapper
│   │   ├── layout/
│   │   │   ├── Layout.jsx                 # App shell wrapper
│   │   │   ├── Sidebar.jsx                # Signal-rail navigation
│   │   │   └── Topbar.jsx                 # Live connection status
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx              # Main live control room overview
│   │   │   ├── Schedule.jsx               # Timetable & AI optimization comparison
│   │   │   ├── Trains.jsx                 # Train fleet registry & route viewer
│   │   │   └── Sections.jsx               # Track block infrastructure editor
│   │   ├── App.jsx                        # Route configuration
│   │   ├── index.css                      # Tailwind base & custom scrollbar
│   │   └── main.jsx                       # React DOM entrypoint
│   ├── vercel.json                        # SPA rewrite rule configuration
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
│
└── README.md
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** >= 18.x
- **MongoDB Atlas** connection string (or local MongoDB on `mongodb://127.0.0.1:27017/train-traffic-control`)

### 2. Backend Installation & Startup
```bash
# Navigate to server folder
cd server

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and paste your MONGODB_URI

# Seed the database with sample stations, sections, and trains
node src/scripts/seed.js

# Start the development server
npm run dev
```
Backend runs at: **`http://localhost:5000`** (Health check: `/api/health`).

### 3. Frontend Installation & Startup
```bash
# Open a new terminal and navigate to client folder
cd client

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend runs at: **`http://localhost:5173`**.

---

## 🔬 System Integration Concept (Kavach & NTES)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UPSTREAM TELEMETRY SOURCE                       │
│     [ Kavach ATP System / Trackside RFID / Loco On-Board Units ]       │
│               • Replaces simulation clock tick in production           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ (MQTT / Ingestion Stream)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             AI TRAIN TRAFFIC CONTROL SYSTEM (THIS PROJECT)             │
│   ┌───────────────────────────┐     ┌──────────────────────────────┐   │
│   │ Baseline Conflict Engine  │ vs. │  AI Priority Dispatch Engine │   │
│   │   (FIFO Delay Cascade)    │     │  (Multi-pass P1>P2>P3 Resch) │   │
│   └───────────────────────────┘     └──────────────────────────────┘   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│     DOWNSTREAM PUBLIC CONSUMER    │ │   OPERATIONAL CONTROL CENTER UI   │
│  [ NTES / IRCTC Passenger Hub ]   │ │   [ Controller Dashboard (UI) ]   │
│   • Dynamic platform updates      │ │   • Interactive SVG Topology Map  │
│   • Passenger delay notifications │ │   • Manual Dispatch Overrides     │
└───────────────────────────────────┘ └───────────────────────────────────┘
```

1. **Upstream (Kavach ATP):** In a real-world deployment, real-time GPS coordinates, RFID transponder timestamps, and automatic train protection events from **Kavach** would directly replace the internal simulation clock loop (`clock.js`).
2. **Downstream (NTES):** The recalculated arrival estimates and conflict resolution decisions output by `/api/simulation/compare` would be published directly to the **National Train Enquiry System (NTES)** for passenger visibility.

---

## ⚠️ Known Limitations & Design Assumptions

1. **Greedy Heuristic vs. Global Solver:** The optimizer uses a greedy multi-pass priority sort rather than an exact Mixed-Integer Linear Programming (MILP) or Google OR-Tools solver. It delivers rapid sub-millisecond dispatch heuristics suitable for interactive simulation but is not guaranteed to find mathematically global optimums across thousands of interlocking junctions.
2. **Simulation-Based Data:** Data is generated via mathematical kinematic interpolation rather than live physical railway feeds.
3. **Categorical Delay Prediction:** Delay prediction uses historical average delay by train class (`express`, `passenger`, `freight`) rather than multi-variate ML regression incorporating weather, track gradients, and crew shifts.
4. **HTTP Polling:** Telemetry updates every 2 seconds via REST polling rather than full duplex WebSockets.
5. **No Authentication Layer:** Prototype is tailored for evaluation without role-based access control.

---

## 📜 License
MIT License. Built as an academic and proof-of-concept AI Railway Traffic Management demonstration.
