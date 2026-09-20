/**
 * Calculates a train's dynamic position, section occupancy, and state at a given simulated minute.
 * 
 * @param {Object} train - Train document with route stops
 * @param {Array} sections - Array of Section documents
 * @param {number} currentMinute - Current simulated minute
 * @param {number} delayMinutes - Dynamic delay in minutes (default 0)
 * @returns {Object} { status, currentSection, progress, currentStation, currentSpeedKmph }
 */
export function calculateTrainPosition(train, sections = [], currentMinute = 0, delayMinutes = 0) {
  if (!train || !train.route || train.route.length < 2) {
    return {
      status: 'scheduled',
      currentSection: null,
      progress: 0,
      currentStation: null,
      currentSpeedKmph: 0,
    };
  }

  const route = train.route.map((stop) => ({
    stationId: String(stop.station?._id || stop.station),
    arr: stop.arrivalTimeMinutes + delayMinutes,
    dep: stop.departureTimeMinutes + delayMinutes,
  }));

  const firstStop = route[0];
  const lastStop = route[route.length - 1];

  // 1. Scheduled: has not departed from the initial station yet
  if (currentMinute < firstStop.dep) {
    return {
      status: 'scheduled',
      currentSection: null,
      progress: 0,
      currentStation: firstStop.stationId,
      currentSpeedKmph: 0,
    };
  }

  // 2. Completed: has reached the final destination station
  if (currentMinute >= lastStop.arr) {
    return {
      status: 'completed',
      currentSection: null,
      progress: 1,
      currentStation: lastStop.stationId,
      currentSpeedKmph: 0,
    };
  }

  // Helper to lookup the section between two stations
  const findSection = (fromId, toId) => {
    return sections.find((sec) => {
      const sFrom = String(sec.fromStation?._id || sec.fromStation);
      const sTo = String(sec.toStation?._id || sec.toStation);
      return (sFrom === fromId && sTo === toId) || (sFrom === toId && sTo === fromId);
    }) || null;
  };

  // 3. Check intermediate station dwell (held state)
  for (let i = 1; i < route.length - 1; i++) {
    const stop = route[i];
    if (currentMinute >= stop.arr && currentMinute <= stop.dep) {
      return {
        status: 'held',
        currentSection: null,
        progress: 0,
        currentStation: stop.stationId,
        currentSpeedKmph: 0,
      };
    }
  }

  // 4. Check track movement between consecutive stops (running state)
  for (let i = 0; i < route.length - 1; i++) {
    const depTime = route[i].dep;
    const arrTime = route[i + 1].arr;

    if (currentMinute >= depTime && currentMinute < arrTime) {
      const duration = arrTime - depTime;
      const elapsed = currentMinute - depTime;
      const rawProgress = duration > 0 ? elapsed / duration : 0;
      const progress = Math.min(Math.max(rawProgress, 0), 1);

      const section = findSection(route[i].stationId, route[i + 1].stationId);
      
      let currentSpeedKmph = train.maxSpeedKmph || 100;
      if (section && duration > 0) {
        const calculatedSpeed = Math.round(section.lengthKm / (duration / 60));
        currentSpeedKmph = Math.min(calculatedSpeed, section.maxSpeedKmph || currentSpeedKmph);
      }

      return {
        status: 'running',
        currentSection: section ? section._id : null,
        section,
        progress: Number(progress.toFixed(2)),
        currentStation: null,
        currentSpeedKmph,
      };
    }
  }

  // Fallback
  return {
    status: 'scheduled',
    currentSection: null,
    progress: 0,
    currentStation: firstStop.stationId,
    currentSpeedKmph: 0,
  };
}
