import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { Station, Section, Train, TrainRun } from './models/index.js';

dotenv.config();

const DEFAULT_MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/train-control';

export async function seedDatabase(shouldDisconnect = false, customUri = null) {
  const uri = customUri || process.env.MONGODB_URI || DEFAULT_MONGODB_URI;

  if (mongoose.connection.readyState !== 1) {
    if (!uri || uri.trim() === '') {
      throw new Error('MONGODB_URI is not defined in your server/.env file.');
    }
    console.log('🔄 Connecting to MongoDB for seeding...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      family: 4,
    });
    console.log('✅ Connected to MongoDB.');
  }

  try {
    console.log('Clearing existing data...');
    await Promise.all([
      Station.deleteMany({}),
      Section.deleteMany({}),
      Train.deleteMany({}),
      TrainRun.deleteMany({}),
    ]);

    // ─────────────────────────────────────────────────────────────────────────
    // REAL INDIAN RAILWAYS DATA
    // Route: New Delhi → Agra → Jhansi → Bhopal → Nagpur → Hyderabad (Deccan)
    // Based on actual Indian Railways Central/South-Central corridor
    // ─────────────────────────────────────────────────────────────────────────

    console.log('Creating stations...');
    const stationsData = [
      { code: 'NDLS', name: 'New Delhi',          x: 100, y: 220 },
      { code: 'AGC',  name: 'Agra Cantt',         x: 240, y: 290 },
      { code: 'JHS',  name: 'Jhansi Jn',          x: 380, y: 310 },
      { code: 'BPL',  name: 'Bhopal Jn',          x: 500, y: 260 },
      { code: 'NGP',  name: 'Nagpur Jn',          x: 630, y: 330 },
      { code: 'HYB',  name: 'Hyderabad Deccan',   x: 750, y: 410 },
    ];

    const createdStations = await Station.insertMany(stationsData);
    const byCode = {};
    createdStations.forEach((st) => {
      byCode[st.code] = st._id;
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Track Sections — real approximate distances on Delhi-Hyderabad corridor
    // NDLS→AGC: Double Line (busy corridor)
    // AGC→JHS: Single Line (bottleneck)
    // JHS→BPL: Double Line
    // BPL→NGP: Single Line (bottleneck)
    // NGP→HYB: Single Line (bottleneck)
    // ─────────────────────────────────────────────────────────────────────────

    console.log('Creating track sections...');
    const sectionsData = [
      { code: 'SEC-NDLS-AGC', fromStation: byCode['NDLS'], toStation: byCode['AGC'], lengthKm: 196, capacity: 2, lineType: 'double', maxSpeedKmph: 130 },
      { code: 'SEC-AGC-JHS',  fromStation: byCode['AGC'],  toStation: byCode['JHS'], lengthKm: 274, capacity: 1, lineType: 'single', maxSpeedKmph: 100 },
      { code: 'SEC-JHS-BPL',  fromStation: byCode['JHS'],  toStation: byCode['BPL'], lengthKm: 316, capacity: 2, lineType: 'double', maxSpeedKmph: 110 },
      { code: 'SEC-BPL-NGP',  fromStation: byCode['BPL'],  toStation: byCode['NGP'], lengthKm: 347, capacity: 1, lineType: 'single', maxSpeedKmph: 100 },
      { code: 'SEC-NGP-HYB',  fromStation: byCode['NGP'],  toStation: byCode['HYB'], lengthKm: 502, capacity: 1, lineType: 'single', maxSpeedKmph: 90  },
    ];

    await Section.insertMany(sectionsData);

    // ─────────────────────────────────────────────────────────────────────────
    // REAL TRAINS — Delhi to Hyderabad corridor (actual train numbers)
    // Times in simulation minutes (T+0 = simulation start)
    // ─────────────────────────────────────────────────────────────────────────

    console.log('Creating trains...');
    const trainsData = [
      {
        // Rajdhani Express — Delhi to Hyderabad (highest priority)
        trainNumber: '12723',
        name: 'Telangana Rajdhani Express',
        type: 'express',
        priority: 1,
        maxSpeedKmph: 130,
        route: [
          { station: byCode['NDLS'], arrivalTimeMinutes: 0,   departureTimeMinutes: 0,   stopDurationMinutes: 0  },
          { station: byCode['AGC'],  arrivalTimeMinutes: 18,  departureTimeMinutes: 20,  stopDurationMinutes: 2  },
          { station: byCode['JHS'],  arrivalTimeMinutes: 44,  departureTimeMinutes: 47,  stopDurationMinutes: 3  },
          { station: byCode['BPL'],  arrivalTimeMinutes: 75,  departureTimeMinutes: 78,  stopDurationMinutes: 3  },
          { station: byCode['NGP'],  arrivalTimeMinutes: 110, departureTimeMinutes: 113, stopDurationMinutes: 3  },
          { station: byCode['HYB'],  arrivalTimeMinutes: 150, departureTimeMinutes: 150, stopDurationMinutes: 0  },
        ],
      },
      {
        // Shatabdi Express — Delhi to Bhopal (passenger, high frequency)
        trainNumber: '12002',
        name: 'Bhopal Shatabdi Express',
        type: 'express',
        priority: 1,
        maxSpeedKmph: 150,
        route: [
          { station: byCode['NDLS'], arrivalTimeMinutes: 5,   departureTimeMinutes: 5,   stopDurationMinutes: 0  },
          { station: byCode['AGC'],  arrivalTimeMinutes: 22,  departureTimeMinutes: 24,  stopDurationMinutes: 2  },
          { station: byCode['JHS'],  arrivalTimeMinutes: 50,  departureTimeMinutes: 52,  stopDurationMinutes: 2  },
          { station: byCode['BPL'],  arrivalTimeMinutes: 80,  departureTimeMinutes: 80,  stopDurationMinutes: 0  },
        ],
      },
      {
        // Intercity Passenger — Agra to Nagpur
        trainNumber: '11077',
        name: 'Jhelum Express',
        type: 'passenger',
        priority: 2,
        maxSpeedKmph: 90,
        route: [
          { station: byCode['AGC'],  arrivalTimeMinutes: 8,   departureTimeMinutes: 10,  stopDurationMinutes: 2  },
          { station: byCode['JHS'],  arrivalTimeMinutes: 42,  departureTimeMinutes: 46,  stopDurationMinutes: 4  },
          { station: byCode['BPL'],  arrivalTimeMinutes: 85,  departureTimeMinutes: 90,  stopDurationMinutes: 5  },
          { station: byCode['NGP'],  arrivalTimeMinutes: 132, departureTimeMinutes: 132, stopDurationMinutes: 0  },
        ],
      },
      {
        // Deccan Express — Jhansi to Hyderabad
        trainNumber: '17031',
        name: 'Hyderabad Express',
        type: 'passenger',
        priority: 2,
        maxSpeedKmph: 85,
        route: [
          { station: byCode['JHS'],  arrivalTimeMinutes: 12,  departureTimeMinutes: 15,  stopDurationMinutes: 3  },
          { station: byCode['BPL'],  arrivalTimeMinutes: 58,  departureTimeMinutes: 62,  stopDurationMinutes: 4  },
          { station: byCode['NGP'],  arrivalTimeMinutes: 105, departureTimeMinutes: 108, stopDurationMinutes: 3  },
          { station: byCode['HYB'],  arrivalTimeMinutes: 155, departureTimeMinutes: 155, stopDurationMinutes: 0  },
        ],
      },
      {
        // Coal/Iron Ore Freight — Full corridor (lowest priority)
        trainNumber: '70401',
        name: 'SECR Coal Freight',
        type: 'freight',
        priority: 3,
        maxSpeedKmph: 75,
        route: [
          { station: byCode['NDLS'], arrivalTimeMinutes: 3,   departureTimeMinutes: 5,   stopDurationMinutes: 2  },
          { station: byCode['AGC'],  arrivalTimeMinutes: 28,  departureTimeMinutes: 32,  stopDurationMinutes: 4  },
          { station: byCode['JHS'],  arrivalTimeMinutes: 72,  departureTimeMinutes: 78,  stopDurationMinutes: 6  },
          { station: byCode['BPL'],  arrivalTimeMinutes: 125, departureTimeMinutes: 130, stopDurationMinutes: 5  },
          { station: byCode['NGP'],  arrivalTimeMinutes: 185, departureTimeMinutes: 185, stopDurationMinutes: 0  },
        ],
      },
    ];

    await Train.insertMany(trainsData);

    console.log('✅ Database seeded with REAL Indian Railways data:');
    console.log('   🚉 6 Stations: NDLS → AGC → JHS → BPL → NGP → HYB');
    console.log('   🛤️  5 Track Sections (Delhi–Hyderabad corridor)');
    console.log('   🚆 5 Trains: 12723 (Rajdhani), 12002 (Shatabdi), 11077 (Jhelum), 17031 (Hyderabad), 70401 (Coal Freight)');

    return { success: true, countStations: 6, countSections: 5, countTrains: 5 };
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    throw error;
  } finally {
    if (shouldDisconnect) {
      await mongoose.disconnect();
      console.log('Done. Disconnected from MongoDB.');
    }
  }
}

// Check if run directly via CLI (e.g. `npm run seed` or `node src/seed.js`)
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').toLowerCase() === currentFilePath.replace(/\\/g, '/').toLowerCase()) {
  seedDatabase(true)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
