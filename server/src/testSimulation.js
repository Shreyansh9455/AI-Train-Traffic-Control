import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { TrainRun, Section, Train } from './models/index.js';
import { startSimulation, stopSimulation } from './simulation/clock.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const SIM_ID = 'test-run-1';
const TEST_DURATION_MS = 10000; // 10 real seconds

async function runSimulationTest() {
  if (!MONGODB_URI || MONGODB_URI.trim() === '') {
    console.error('❌ Error: MONGODB_URI is not defined in server/.env.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);

    console.log('Clearing previous TrainRun data for this simulation id...');
    await TrainRun.deleteMany({ simulationId: SIM_ID });

    console.log(`Starting simulation "${SIM_ID}"...`);
    startSimulation(SIM_ID, {
      minutesPerTick: 5,
      tickRateMs: 500,
      startMinute: 0,
    });

    // Wait for test duration (10s = 20 ticks * 5 min = 100 sim minutes)
    await new Promise((resolve) => setTimeout(resolve, TEST_DURATION_MS));

    const stopped = stopSimulation(SIM_ID);
    console.log(`\nStopped. Final sim clock: minute ${stopped.currentMinute}\n`);

    // Fetch and display all train runs
    const runs = await TrainRun.find({ simulationId: SIM_ID })
      .populate('train')
      .populate({
        path: 'currentSection',
        populate: [
          { path: 'fromStation', select: 'code' },
          { path: 'toStation', select: 'code' },
        ],
      })
      .sort({ 'train.priority': 1 });

    console.log('Final train states:');
    console.log('-------------------');

    for (const run of runs) {
      const trainNumber = run.train?.trainNumber.padEnd(8, ' ') || 'UNKNOWN ';
      const trainName = (run.train?.name || 'Unknown Train').padEnd(22, ' ');
      const status = `status=${run.status}`.padEnd(16, ' ');
      
      let sectionLabel = 'section=None';
      if (run.currentSection?.fromStation?.code && run.currentSection?.toStation?.code) {
        sectionLabel = `section=SEC-${run.currentSection.fromStation.code.replace('ST', '')}${run.currentSection.toStation.code.replace('ST', '')}`;
      }
      sectionLabel = sectionLabel.padEnd(16, ' ');

      const progress = `progress=${Number(run.progress).toFixed(2)}`;

      console.log(`${trainNumber} ${trainName} ${status} ${sectionLabel} ${progress}`);
    }

    console.log('\nDone. Disconnected from MongoDB.');
  } catch (error) {
    console.error('❌ Simulation test error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

runSimulationTest();
