import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Station } from './models/index.js';
import { seedDatabase } from './seed.js';

dotenv.config();

let isConnecting = false;
let reconnectTimer = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_INTERVAL_MS = 30000;
const INITIAL_RECONNECT_INTERVAL_MS = 2000;

// Production & Local Resilient Mongoose Options
export const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging 30s
  connectTimeoutMS: 10000,        // Timeout initial socket connection after 10s
  socketTimeoutMS: 45000,         // Close sockets after 45 seconds of inactivity
  maxPoolSize: 10,                // Maintain up to 10 socket connections
  minPoolSize: 2,                 // Keep at least 2 socket connections open
  family: 4,                      // Use IPv4 (avoids Windows localhost slow IPv6 DNS resolving)
  autoIndex: true,                // Build indexes automatically
};

/**
 * Checks if the database is currently empty and auto-seeds initial Indian Railways data.
 */
export async function autoSeedIfEmpty() {
  try {
    if (mongoose.connection.readyState !== 1) return;
    const stationCount = await Station.countDocuments();
    if (stationCount === 0) {
      console.log('🌱 Database is empty. Auto-seeding Indian Railways network data...');
      await seedDatabase(false);
      console.log('✨ Auto-seed complete!');
    }
  } catch (err) {
    console.warn('⚠️  Auto-seed check skipped or failed:', err.message);
  }
}

/**
 * Connects to MongoDB with robust retries and auto-reconnection.
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI?.trim() || 'mongodb://127.0.0.1:27017/train-control';

  if (isConnecting || mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  isConnecting = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    console.log(`🔄 Connecting to MongoDB (${maskUri(uri)})...`);
    await mongoose.connect(uri, MONGO_OPTIONS);
    reconnectAttempts = 0;
    console.log('✅ Connected to MongoDB successfully.');
    await autoSeedIfEmpty();
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    scheduleReconnect();
  } finally {
    isConnecting = false;
  }

  return mongoose.connection;
}

/**
 * Schedules automatic reconnection attempt with exponential backoff.
 */
function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectAttempts++;
  const backoff = Math.min(
    INITIAL_RECONNECT_INTERVAL_MS * Math.pow(1.5, reconnectAttempts - 1),
    MAX_RECONNECT_INTERVAL_MS
  );

  console.log(`⏳ Auto-reconnect attempt #${reconnectAttempts} in ${(backoff / 1000).toFixed(1)}s...`);
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await connectDB();
  }, backoff);
}

// Global Connection Event Listeners
mongoose.connection.on('connected', () => {
  const host = mongoose.connection.host || 'unknown';
  const dbName = mongoose.connection.name || 'unknown';
  console.log(`🟢 Mongoose connected to [${dbName}] at ${host}`);
});

mongoose.connection.on('error', (err) => {
  console.error('🔴 Mongoose runtime error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('🟡 Mongoose disconnected from MongoDB.');
  if (!isConnecting) {
    scheduleReconnect();
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('🟢 Mongoose reconnected to MongoDB.');
});

/**
 * Helper to get current database health & metrics.
 */
export async function getDbStatus() {
  const stateCode = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const state = states[stateCode] || 'unknown';

  let stationCount = 0;
  let trainCount = 0;
  let sectionCount = 0;

  if (stateCode === 1) {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map((c) => c.name);
      if (collectionNames.includes('stations')) {
        stationCount = await mongoose.connection.db.collection('stations').countDocuments();
      }
      if (collectionNames.includes('trains')) {
        trainCount = await mongoose.connection.db.collection('trains').countDocuments();
      }
      if (collectionNames.includes('sections')) {
        sectionCount = await mongoose.connection.db.collection('sections').countDocuments();
      }
    } catch {
      // ignore
    }
  }

  const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/train-control';
  const isAtlas = rawUri.includes('mongodb+srv://') || rawUri.includes('.mongodb.net');

  return {
    state,
    readyState: stateCode,
    isAtlas,
    host: mongoose.connection.host || (stateCode === 1 ? '127.0.0.1' : null),
    port: mongoose.connection.port || null,
    database: mongoose.connection.name || null,
    uri: maskUri(rawUri),
    counts: {
      stations: stationCount,
      trains: trainCount,
      sections: sectionCount,
    },
    reconnectAttempts,
  };
}

/**
 * Gracefully disconnect from MongoDB (useful for tests and shutdown).
 */
export async function disconnectDB() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed gracefully.');
  }
}

/**
 * Helper to hide credentials in URI for safe logging.
 */
export function maskUri(uri) {
  if (!uri) return 'not configured';
  return uri.replace(/\/\/(.*):(.*)@/, '//***:***@');
}

export default {
  connectDB,
  disconnectDB,
  getDbStatus,
  autoSeedIfEmpty,
  MONGO_OPTIONS,
};
