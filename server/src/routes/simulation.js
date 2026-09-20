import express from 'express';
import mongoose from 'mongoose';
import { Train, Section, TrainRun } from '../models/index.js';
import {
  startSimulation,
  stopSimulation,
  resetSimulation,
  getClock,
  injectDelay,
  getInjectedDelays,
  recomputeNow,
} from '../simulation/clock.js';
import { calculateBaselinePropagation } from '../simulation/propagation.js';
import { calculateOptimizedSchedule } from '../simulation/optimizer.js';
import { calculateMetrics } from '../simulation/metrics.js';
import {
  predictDelayForTrain,
  predictDelaysForTrains,
  calculateDelayPredictions,
} from '../simulation/prediction.js';

const router = express.Router();

/**
 * Checks if the MongoDB connection is active.
 */
const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Standardized JSON error response helper.
 */
function sendError(res, status, error, details = null) {
  return res.status(status).json({
    error,
    details: details || error,
  });
}

/**
 * Shared helper to load trains, track sections, and injected delays in one place.
 * Returns safe empty arrays if the database is in disconnected mode.
 *
 * @param {string} simulationId 
 * @returns {Promise<{ trains: Array, sections: Array, injectedDelays: Object }>}
 */
async function getNetworkContext(simulationId = 'default') {
  const injectedDelays = getInjectedDelays(simulationId);

  if (!isDbConnected()) {
    return { trains: [], sections: [], injectedDelays };
  }

  const [trains, sections] = await Promise.all([
    Train.find().lean(),
    Section.find()
      .populate('fromStation', 'code name x y')
      .populate('toStation', 'code name x y')
      .lean(),
  ]);

  return { trains, sections, injectedDelays };
}

// ─── 1. GET /api/simulation/state ──────────────────────────────────────────
// Returns live position/status/delay for every train in a simulation run.
router.get('/state', async (req, res) => {
  try {
    const simulationId = req.query.simulationId || 'default';
    const clock = getClock(simulationId);

    if (!isDbConnected()) {
      return res.status(200).json({
        simulationId,
        clock,
        trains: [],
        totalRegisteredTrains: 0,
        sections: [],
        dbStatus: 'disconnected',
      });
    }

    const [trains, runs, sections] = await Promise.all([
      Train.find().lean(),
      TrainRun.find({ simulationId })
        .populate('train', 'trainNumber name type priority')
        .populate({
          path: 'currentSection',
          select: 'code fromStation toStation lengthKm maxSpeedKmph lineType',
          populate: [
            { path: 'fromStation', select: 'code name x y' },
            { path: 'toStation', select: 'code name x y' },
          ],
        })
        .lean(),
      Section.find()
        .populate('fromStation', 'code name x y')
        .populate('toStation', 'code name x y')
        .lean(),
    ]);

    res.status(200).json({
      simulationId,
      clock,
      trains: runs,
      totalRegisteredTrains: trains.length,
      sections,
    });
  } catch (error) {
    console.error('Error fetching simulation state:', error);
    sendError(res, 500, 'Internal Server Error', error.message);
  }
});

// ─── 2. GET /api/simulation/clock ───────────────────────────────────────────
// Returns current simulated minute and running/paused status.
router.get('/clock', (req, res) => {
  try {
    const simulationId = req.query.simulationId || 'default';
    const clock = getClock(simulationId);
    res.status(200).json({ simulationId, clock });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error', error.message);
  }
});

// ─── 3. POST /api/simulation/start ──────────────────────────────────────────
// Starts the tick loop with strict parameter validation.
router.post('/start', (req, res) => {
  try {
    const {
      simulationId = 'default',
      tickIntervalMs = 1000,
      minutesPerTick = 1,
      startMinute,
    } = req.body || {};

    const parsedTickInterval = Number(tickIntervalMs);
    if (isNaN(parsedTickInterval) || parsedTickInterval <= 0) {
      return sendError(res, 400, 'Bad Request', 'tickIntervalMs must be a positive number (> 0)');
    }

    const parsedMinutesPerTick = Number(minutesPerTick);
    if (isNaN(parsedMinutesPerTick) || parsedMinutesPerTick <= 0) {
      return sendError(res, 400, 'Bad Request', 'minutesPerTick must be a positive number (> 0)');
    }

    const result = startSimulation(simulationId, {
      tickIntervalMs: parsedTickInterval,
      minutesPerTick: parsedMinutesPerTick,
      startMinute,
    });

    res.status(200).json({
      message: `Simulation "${simulationId}" started`,
      clock: result,
    });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error', error.message);
  }
});

// ─── 4. POST /api/simulation/pause ──────────────────────────────────────────
// Pauses the active tick loop.
router.post('/pause', (req, res) => {
  try {
    const simulationId = req.body?.simulationId || req.query.simulationId || 'default';
    const result = stopSimulation(simulationId);

    res.status(200).json({
      message: `Simulation "${simulationId}" paused`,
      clock: result,
    });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error', error.message);
  }
});

// ─── 5. POST /api/simulation/reset ──────────────────────────────────────────
// Stops simulation, clears TrainRuns and wipes injected delay history.
router.post('/reset', async (req, res) => {
  try {
    const simulationId = req.body?.simulationId || req.query.simulationId || 'default';
    const result = await resetSimulation(simulationId);

    res.status(200).json({
      message: `Simulation "${simulationId}" reset successfully`,
      ...result,
    });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error', error.message);
  }
});

// ─── 6. POST /api/simulation/inject-delay ───────────────────────────────────
// Validates delay input, persists manual delay, and immediately synchronizes state.
router.post('/inject-delay', async (req, res) => {
  try {
    const { simulationId = 'default', trainId, minutes } = req.body || {};

    if (!trainId || typeof trainId !== 'string' || !trainId.trim()) {
      return sendError(res, 400, 'Bad Request', 'trainId is required and must be a non-empty string');
    }

    if (minutes === undefined || minutes === null) {
      return sendError(res, 400, 'Bad Request', 'minutes is required');
    }

    const parsedMinutes = Number(minutes);
    if (isNaN(parsedMinutes) || parsedMinutes < 0) {
      return sendError(res, 400, 'Bad Request', 'minutes must be a non-negative number (>= 0)');
    }

    let trainNumber = String(trainId);
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(trainId)) {
      const train = await Train.findById(trainId).lean();
      if (!train) {
        return sendError(res, 404, 'Not Found', `Train with id "${trainId}" not found`);
      }
      trainNumber = train.trainNumber;
    }

    const injectResult = injectDelay(simulationId, trainId, parsedMinutes);

    if (isDbConnected()) {
      await recomputeNow(simulationId);
    }

    const clock = getClock(simulationId);

    res.status(200).json({
      message: `Injected ${parsedMinutes} min delay on train ${trainNumber}`,
      simulationId,
      trainId,
      trainNumber,
      injectedMinutes: parsedMinutes,
      allDelays: injectResult.allInjectedDelays,
      clock,
    });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error', error.message);
  }
});

// ─── 7. GET /api/simulation/optimized-schedule ──────────────────────────────
// On-demand AI Priority-Aware timetable calculation.
router.get('/optimized-schedule', async (req, res) => {
  try {
    const simulationId = req.query.simulationId || 'default';
    const { trains, sections, injectedDelays } = await getNetworkContext(simulationId);

    const optimized = calculateOptimizedSchedule(trains, sections, injectedDelays);
    const metrics = calculateMetrics(optimized.resolvedSchedules, trains);

    const scheduleList = trains.map((train) => {
      const id = String(train._id || train.id || train.trainNumber);
      return {
        trainId: id,
        trainNumber: train.trainNumber,
        name: train.name,
        type: train.type,
        priority: train.priority,
        optimizedDelayMinutes: optimized.delays[id] || 0,
      };
    });

    res.status(200).json({
      simulationId,
      trains: scheduleList,
      perTrain: scheduleList,
      metrics,
      ...optimized,
    });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error', error.message);
  }
});

// ─── 8. GET /api/simulation/compare ─────────────────────────────────────────
// Side-by-side comparison of FIFO Baseline vs. AI Priority-Aware Schedules.
router.get('/compare', async (req, res) => {
  try {
    const simulationId = req.query.simulationId || 'default';
    const { trains, sections, injectedDelays } = await getNetworkContext(simulationId);

    const baseline = calculateBaselinePropagation(trains, sections, injectedDelays);
    const optimized = calculateOptimizedSchedule(trains, sections, injectedDelays);

    const baselineMetrics = calculateMetrics(baseline.resolvedSchedules, trains);
    const optimizedMetrics = calculateMetrics(optimized.resolvedSchedules, trains);

    const perTrain = trains.map((train) => {
      const id = String(train._id || train.id || train.trainNumber);
      const bSched = baseline.resolvedSchedules[id] || {};
      const oSched = optimized.resolvedSchedules[id] || {};
      const bDelay = bSched.totalDelay || 0;
      const oDelay = oSched.totalDelay || 0;
      const delayDiff = bDelay - oDelay;

      return {
        trainId: id,
        trainNumber: train.trainNumber,
        name: train.name,
        type: train.type,
        priority: train.priority,
        injectedDelayMinutes: injectedDelays[id] || 0,
        baselineDelayMinutes: bDelay,
        optimizedDelayMinutes: oDelay,
        savedMinutes: Math.max(delayDiff, 0),
        status: delayDiff > 0 ? 'Optimized' : delayDiff < 0 ? 'Absorbed Delay' : 'Unchanged',
      };
    });

    res.status(200).json({
      simulationId,
      perTrain,
      trainComparison: perTrain,
      baselineMetrics,
      optimizedMetrics,
      savings: {
        avgDelaySavedMinutes: Number((baselineMetrics.avgDelayMinutes - optimizedMetrics.avgDelayMinutes).toFixed(1)),
        punctualityImprovementPct: Number((optimizedMetrics.punctualityRate - baselineMetrics.punctualityRate).toFixed(1)),
      },
      baseline,
      optimized,
    });
  } catch (error) {
    sendError(res, 500, 'Internal Server Error', error.message);
  }
});

// ─── 9. GET /api/simulation/predictions ─────────────────────────────────────
// Generates categorical empirical delay predictions.
router.get('/predictions', async (req, res) => {
  try {
    const { trains } = await getNetworkContext();
    const delayMap = await predictDelaysForTrains(trains);

    const predictions = trains.map((train) => {
      const id = String(train._id || train.id || train.trainNumber);
      return {
        trainId: id,
        trainNumber: train.trainNumber,
        name: train.name,
        type: train.type,
        priority: train.priority,
        predictedDelayMinutes: delayMap[id] ?? 0,
      };
    });

    res.status(200).json(predictions);
  } catch (error) {
    sendError(res, 500, 'Internal Server Error', error.message);
  }
});

export default router;
