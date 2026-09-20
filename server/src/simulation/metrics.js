/**
 * Simulation KPI Metrics Calculator (Day 9)
 * 
 * Computes core railway operational indicators:
 * - Average Delay (minutes)
 * - Maximum Delay (minutes)
 * - Punctuality Rate (% on-time, defined as delay <= 5 min)
 * - Breakdown by train type / priority
 */

/**
 * Calculates aggregate performance metrics from a set of train delays/schedules.
 * 
 * @param {Array|Object} schedules - Array of schedule objects or { [trainId]: delay } map
 * @param {Array} trains - Array of Train documents for priority/type breakdown
 * @returns {Object} Operational KPI metrics
 */
export function calculateMetrics(schedules = {}, trains = []) {
  let scheduleList = [];

  if (Array.isArray(schedules)) {
    scheduleList = schedules;
  } else if (typeof schedules === 'object' && schedules !== null) {
    // If it's a map of trainId -> resolvedSchedule object or numeric delay
    scheduleList = Object.keys(schedules).map((key) => {
      const val = schedules[key];
      if (typeof val === 'number') {
        const train = trains.find((t) => String(t._id) === key);
        return {
          trainId: key,
          type: train?.type || 'unknown',
          priority: train?.priority || 3,
          totalDelay: val,
        };
      }
      return val;
    });
  }

  const totalTrains = scheduleList.length;
  if (totalTrains === 0) {
    return {
      totalTrains: 0,
      avgDelayMinutes: 0,
      maxDelayMinutes: 0,
      onTimeCount: 0,
      delayedCount: 0,
      punctualityRate: 100,
      byType: { express: 0, passenger: 0, freight: 0 },
    };
  }

  let totalDelaySum = 0;
  let maxDelay = 0;
  let onTimeCount = 0;

  const typeDelays = { express: [], passenger: [], freight: [] };

  scheduleList.forEach((item) => {
    const delay = Number(item.totalDelay ?? item.delayMinutes ?? 0);
    totalDelaySum += delay;
    if (delay > maxDelay) maxDelay = delay;
    if (delay <= 5) onTimeCount++;

    const trainType = item.type || 'passenger';
    if (typeDelays[trainType]) {
      typeDelays[trainType].push(delay);
    }
  });

  const avgDelayMinutes = Number((totalDelaySum / totalTrains).toFixed(1));
  const punctualityRate = Number(((onTimeCount / totalTrains) * 100).toFixed(1));
  const delayedCount = totalTrains - onTimeCount;

  const avgByType = {};
  Object.keys(typeDelays).forEach((type) => {
    const arr = typeDelays[type];
    avgByType[type] = arr.length > 0
      ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1))
      : 0;
  });

  return {
    totalTrains,
    avgDelayMinutes,
    maxDelayMinutes: Math.round(maxDelay),
    onTimeCount,
    delayedCount,
    punctualityRate,
    byType: avgByType,
  };
}
