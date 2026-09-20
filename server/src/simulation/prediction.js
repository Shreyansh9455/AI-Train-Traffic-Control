import { TrainRun, Train } from '../models/index.js';

/**
 * Historical Delay Predictor Baseline (Day 14)
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURAL DESIGN NOTE & PROJECT REPORT HONESTY:
 * This prediction module is a deliberately simple baseline estimator: it computes
 * the historical average delay strictly by rolling-stock category (express,
 * passenger, freight) from completed and active TrainRun records.
 *
 * It does NOT incorporate multi-variate machine learning features such as weather
 * conditions, section gradient, track geometry, crew turnover, or peak time-of-day
 * congestion. In the project report and documentation, this should be explicitly
 * stated as an empirical categorical baseline rather than oversold as a deep ML model.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Predicts the delay for a single train based on historical TrainRuns of matching type.
 *
 * @param {Object} train - Train document or object with `type` property
 * @returns {Promise<number>} Average delay in minutes (rounded to 1 decimal place), or 0 if none
 */
export async function predictDelayForTrain(train) {
  if (!train || !train.type) return 0;

  try {
    const targetType = String(train.type).toLowerCase();

    // Query TrainRun records where delayMinutes is recorded
    const runs = await TrainRun.find({ delayMinutes: { $ne: null } })
      .populate('train', 'type')
      .lean();

    // Filter to only runs whose train.type matches the given train's type
    const matchingRuns = runs.filter((run) => {
      const runType = String(run.train?.type || '').toLowerCase();
      return runType === targetType && typeof run.delayMinutes === 'number';
    });

    if (matchingRuns.length === 0) {
      return 0;
    }

    const totalDelay = matchingRuns.reduce((sum, run) => sum + run.delayMinutes, 0);
    const avgDelay = totalDelay / matchingRuns.length;

    return Number(avgDelay.toFixed(1));
  } catch (error) {
    console.error('Error predicting delay for train:', error);
    return 0;
  }
}

/**
 * Predicts delay minutes for an array of trains.
 *
 * @param {Array} trains - Array of Train documents or objects
 * @returns {Promise<Object>} Map of { [trainId]: predictedDelayMinutes }
 */
export async function predictDelaysForTrains(trains = []) {
  if (!Array.isArray(trains) || trains.length === 0) {
    return {};
  }

  try {
    // Optimization: Pre-fetch matching runs in a single query rather than N sequential queries
    const runs = await TrainRun.find({ delayMinutes: { $ne: null } })
      .populate('train', 'type')
      .lean();

    const typeStats = {
      express: { sum: 0, count: 0 },
      passenger: { sum: 0, count: 0 },
      freight: { sum: 0, count: 0 },
    };

    runs.forEach((run) => {
      const type = String(run.train?.type || '').toLowerCase();
      if (typeStats[type] && typeof run.delayMinutes === 'number') {
        typeStats[type].sum += run.delayMinutes;
        typeStats[type].count += 1;
      }
    });

    const typeAverages = {
      express: typeStats.express.count > 0 ? Number((typeStats.express.sum / typeStats.express.count).toFixed(1)) : 0,
      passenger: typeStats.passenger.count > 0 ? Number((typeStats.passenger.sum / typeStats.passenger.count).toFixed(1)) : 0,
      freight: typeStats.freight.count > 0 ? Number((typeStats.freight.sum / typeStats.freight.count).toFixed(1)) : 0,
    };

    const delayMap = {};
    trains.forEach((train) => {
      const id = String(train._id || train.id || train.trainNumber);
      const type = String(train.type || 'passenger').toLowerCase();
      delayMap[id] = typeAverages[type] !== undefined ? typeAverages[type] : 0;
    });

    return delayMap;
  } catch (error) {
    console.error('Error predicting delays for trains:', error);
    const delayMap = {};
    trains.forEach((t) => {
      delayMap[String(t._id || t.id || t.trainNumber)] = 0;
    });
    return delayMap;
  }
}

/**
 * Full summary helper (used by /api/simulation/predictions and frontend analytics)
 */
export async function calculateDelayPredictions() {
  try {
    const trains = await Train.find().lean();
    const delayMap = await predictDelaysForTrains(trains);

    const predictions = trains.map((train) => {
      const id = String(train._id);
      return {
        trainId: id,
        trainNumber: train.trainNumber,
        name: train.name,
        type: train.type,
        priority: train.priority,
        predictedDelayMinutes: delayMap[id] || 0,
      };
    });

    return {
      predictions,
      totalRegisteredTrains: trains.length,
    };
  } catch (error) {
    console.error('Error in calculateDelayPredictions:', error);
    return {
      predictions: [],
      totalRegisteredTrains: 0,
    };
  }
}
