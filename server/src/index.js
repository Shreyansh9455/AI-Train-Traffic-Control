import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, disconnectDB, getDbStatus } from './db.js';
import stationRoutes from './routes/stations.js';
import sectionRoutes from './routes/sections.js';
import trainRoutes from './routes/trains.js';
import simulationRoutes from './routes/simulation.js';
import metricsRoutes from './routes/metrics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Resilient Database Connection
connectDB();

// API Health & Diagnostics Routes
app.get('/api/health', async (req, res) => {
  const dbStatus = await getDbStatus();

  res.status(200).json({
    status: 'ok',
    message: 'Train Control server is running',
    database: dbStatus.state,
    dbDetails: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/db/status', async (req, res) => {
  const dbStatus = await getDbStatus();
  res.status(200).json(dbStatus);
});

app.post('/api/db/reconnect', async (req, res) => {
  try {
    await connectDB();
    const dbStatus = await getDbStatus();
    res.status(200).json({ message: 'Reconnection attempted', dbStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'AI Train Traffic Control API Server is running 🚆',
    endpoints: {
      health: '/api/health',
      dbStatus: '/api/db/status',
      stations: '/api/stations',
      sections: '/api/sections',
      trains: '/api/trains',
      simulation: '/api/simulation',
      metrics: '/api/metrics',
    },
  });
});

// Resource & Simulation Routes
app.use('/api/stations', stationRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/trains', trainRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/metrics', metricsRoutes);

// 404 Handler for Unmatched Routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`🚀 Train Control server running on http://localhost:${PORT}`);
  console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);
});

// Graceful Shutdown
const handleGracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

export default app;
