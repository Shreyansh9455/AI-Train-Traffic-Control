import express from 'express';
import { Train, Section } from '../models/index.js';
import { getInjectedDelays } from '../simulation/clock.js';
import { calculateBaselinePropagation } from '../simulation/propagation.js';
import { calculateOptimizedSchedule } from '../simulation/optimizer.js';
import { calculateMetrics } from '../simulation/metrics.js';

const router = express.Router();

// GET /api/metrics/summary - Direct KPI summary query
router.get('/summary', async (req, res, next) => {
  try {
    // Default to 'baseline' (FIFO) so callers get the unoptimized baseline
    // unless they explicitly request mode=optimized for the AI-enhanced view.
    const mode = req.query.mode || 'baseline';
    const simulationId = req.query.simulationId || 'default';
    const injectedDelays = getInjectedDelays(simulationId);

    const [trains, sections] = await Promise.all([
      Train.find().lean(),
      Section.find().lean(),
    ]);

    const result = mode === 'baseline'
      ? calculateBaselinePropagation(trains, sections, injectedDelays)
      : calculateOptimizedSchedule(trains, sections, injectedDelays);

    const metrics = calculateMetrics(result.resolvedSchedules, trains);

    res.status(200).json({
      mode,
      simulationId,
      metrics,
      schedules: result.resolvedSchedules,
      conflictsCount: result.conflicts?.length || 0,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
