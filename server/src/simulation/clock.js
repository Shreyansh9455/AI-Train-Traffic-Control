import { Train, Section, TrainRun } from '../models/index.js';
import { calculateTrainPosition } from './trainPosition.js';
import { calculateBaselinePropagation } from './propagation.js';

// Map of active simulation instances
const activeSimulations = new Map();

/**
 * Injects a manual delay onto a specific train in an active simulation.
 * 
 * @param {string} simulationId 
 * @param {string} trainId 
 * @param {number} minutes 
 * @returns {Object} Updated injected delays
 */
export function injectDelay(simulationId = 'default', trainId, minutes = 0) {
  if (!activeSimulations.has(simulationId)) {
    activeSimulations.set(simulationId, {
      simulationId,
      currentMinute: 0,
      minutesPerTick: 2,
      tickRateMs: 1000,
      isRunning: false,
      trainDelays: {},
      intervalId: null,
    });
  }

  const sim = activeSimulations.get(simulationId);
  if (!sim.trainDelays) sim.trainDelays = {};
  
  sim.trainDelays[String(trainId)] = Number(minutes);
  console.log(`⏱️ Injected ${minutes} min delay on train ${trainId} for simulation ${simulationId}`);

  return {
    simulationId,
    trainId,
    injectedDelay: Number(minutes),
    allInjectedDelays: sim.trainDelays,
  };
}

/**
 * Gets all injected delays for a simulation.
 */
export function getInjectedDelays(simulationId = 'default') {
  const sim = activeSimulations.get(simulationId);
  return sim?.trainDelays || {};
}

/**
 * Executes a single simulation tick: advances time, computes propagated delays, updates positions, and persists TrainRuns.
 * 
 * @param {string} simulationId 
 * @returns {Promise<Object>} Updated simulation state and train runs
 */
/**
 * Recomputes and persists all TrainRun positions at the CURRENT sim minute
 * without advancing the clock. Called immediately after injectDelay() so the
 * change shows up in /state before the next scheduled tick fires.
 *
 * Safe to call whether the simulation is running or paused.
 *
 * @param {string} simulationId
 */
export async function recomputeNow(simulationId = 'default') {
  // If there's no active sim entry yet, create a paused one at minute 0
  if (!activeSimulations.has(simulationId)) {
    activeSimulations.set(simulationId, {
      simulationId,
      currentMinute: 0,
      minutesPerTick: 2,
      tickRateMs: 1000,
      isRunning: false,
      trainDelays: {},
      intervalId: null,
    });
  }

  const sim = activeSimulations.get(simulationId);

  const [trains, sections] = await Promise.all([
    Train.find().lean(),
    Section.find().lean(),
  ]);

  const propagation = calculateBaselinePropagation(trains, sections, sim.trainDelays || {});
  const dynamicDelays = propagation.delays || {};

  const updates = trains.map((train) => {
    const trainId = String(train._id);
    const delayForTrain = dynamicDelays[trainId] || 0;
    const position = calculateTrainPosition(train, sections, sim.currentMinute, delayForTrain);

    return TrainRun.findOneAndUpdate(
      { simulationId, train: train._id },
      {
        $set: {
          simulationId,
          train: train._id,
          status: position.status,
          currentSection: position.currentSection,
          progress: position.progress,
          delayMinutes: delayForTrain,
          currentSpeedKmph: position.currentSpeedKmph,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  });

  await Promise.all(updates);
  console.log(`🔄 recomputeNow(${simulationId}) at simMin=${sim.currentMinute}`);
}

export async function tick(simulationId) {
  const sim = activeSimulations.get(simulationId);
  if (!sim) {
    throw new Error(`Simulation with id "${simulationId}" is not active.`);
  }

  // Advance simulation clock
  sim.currentMinute += sim.minutesPerTick;

  try {
    const [trains, sections] = await Promise.all([
      Train.find().lean(),
      Section.find().lean(),
    ]);

    // Calculate baseline cascading delays with current injected delays
    const propagation = calculateBaselinePropagation(trains, sections, sim.trainDelays || {});
    const dynamicDelays = propagation.delays || {};

    const updates = [];

    for (const train of trains) {
      const trainId = String(train._id);
      const delayForTrain = dynamicDelays[trainId] || 0;

      const position = calculateTrainPosition(
        train,
        sections,
        sim.currentMinute,
        delayForTrain
      );

      const updatePromise = TrainRun.findOneAndUpdate(
        { simulationId, train: train._id },
        {
          $set: {
            simulationId,
            train: train._id,
            status: position.status,
            currentSection: position.currentSection,
            progress: position.progress,
            delayMinutes: delayForTrain,
            currentSpeedKmph: position.currentSpeedKmph,
          },
        },
        { upsert: true, new: true, runValidators: true }
      );

      updates.push(updatePromise);
    }

    const savedRuns = await Promise.all(updates);

    if (typeof sim.onTick === 'function') {
      sim.onTick({
        simulationId,
        currentMinute: sim.currentMinute,
        runs: savedRuns,
      });
    }

    return {
      simulationId,
      currentMinute: sim.currentMinute,
      trainCount: savedRuns.length,
    };
  } catch (error) {
    console.error(`❌ Error during simulation tick (${simulationId}):`, error);
    throw error;
  }
}

/**
 * Starts a simulation clock loop.
 * 
 * @param {string} simulationId 
 * @param {Object} options - { minutesPerTick, tickIntervalMs / tickRateMs, startMinute, onTick }
 * @returns {Object} Simulation status
 */
export function startSimulation(simulationId = 'default', options = {}) {
  // If already running, return existing
  if (activeSimulations.has(simulationId)) {
    const existing = activeSimulations.get(simulationId);
    if (existing.intervalId) {
      return {
        simulationId,
        currentMinute: existing.currentMinute,
        isRunning: true,
        message: 'Simulation already running',
      };
    }
  }

  const minutesPerTick = options.minutesPerTick !== undefined ? Number(options.minutesPerTick) : 2;
  const tickRateMs = options.tickIntervalMs !== undefined 
    ? Number(options.tickIntervalMs) 
    : options.tickRateMs !== undefined 
    ? Number(options.tickRateMs) 
    : 1000;
  const startMinute = options.startMinute !== undefined ? Number(options.startMinute) : 0;

  const existingDelays = activeSimulations.get(simulationId)?.trainDelays || {};

  const simState = {
    simulationId,
    currentMinute: startMinute,
    minutesPerTick,
    tickRateMs,
    isRunning: true,
    trainDelays: existingDelays,
    onTick: options.onTick || null,
    intervalId: null,
  };

  simState.intervalId = setInterval(async () => {
    try {
      await tick(simulationId);
    } catch (err) {
      console.error(`Tick execution error for ${simulationId}:`, err.message);
    }
  }, tickRateMs);

  activeSimulations.set(simulationId, simState);
  console.log(`Simulation ${simulationId} started (every ${tickRateMs}ms = +${minutesPerTick} sim min)`);

  return {
    simulationId,
    currentMinute: simState.currentMinute,
    minutesPerTick,
    tickIntervalMs: tickRateMs,
    isRunning: true,
  };
}

/**
 * Stops an active simulation clock.
 * 
 * @param {string} simulationId 
 * @returns {Object} Final simulation status
 */
export function stopSimulation(simulationId = 'default') {
  const sim = activeSimulations.get(simulationId);
  if (!sim) {
    return { simulationId, isRunning: false, message: 'Simulation not found' };
  }

  if (sim.intervalId) {
    clearInterval(sim.intervalId);
    sim.intervalId = null;
  }
  sim.isRunning = false;

  console.log(`Simulation ${simulationId} stopped at sim minute ${sim.currentMinute}`);

  return {
    simulationId,
    currentMinute: sim.currentMinute,
    isRunning: false,
  };
}

/**
 * Gets current simulation clock status.
 * 
 * @param {string} simulationId 
 * @returns {Object} Clock details
 */
export function getClock(simulationId = 'default') {
  const sim = activeSimulations.get(simulationId);
  if (!sim) {
    return { simulationId, currentMinute: 0, isRunning: false };
  }

  return {
    simulationId,
    currentMinute: sim.currentMinute,
    minutesPerTick: sim.minutesPerTick,
    tickIntervalMs: sim.tickRateMs,
    isRunning: sim.isRunning,
  };
}

/**
 * Resets a simulation clock to minute 0 and wipes run records.
 * 
 * @param {string} simulationId 
 * @returns {Promise<Object>} Reset status
 */
export async function resetSimulation(simulationId = 'default') {
  stopSimulation(simulationId);
  const sim = activeSimulations.get(simulationId);
  if (sim) {
    sim.currentMinute = 0;
    sim.trainDelays = {};
  }

  try {
    await TrainRun.deleteMany({ simulationId });
  } catch (error) {
    console.error('Error clearing TrainRun documents during reset:', error);
  }

  return {
    simulationId,
    currentMinute: 0,
    isRunning: false,
    message: `Simulation ${simulationId} reset successfully`,
  };
}
