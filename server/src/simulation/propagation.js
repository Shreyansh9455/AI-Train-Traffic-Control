/**
 * Baseline FIFO Delay Propagation and Conflict Detection (Day 6)
 * 
 * Simulates single-line section occupancy using First-Come-First-Served (FIFO) queuing.
 * When two trains contend for the same single-track section, the earlier arriving train 
 * enters first, causing cascading delays to the later train and its subsequent stops.
 */

/**
 * Finds a matching track section between two stations.
 */
function findSection(fromId, toId, sections) {
  return sections.find((sec) => {
    const sFrom = String(sec.fromStation?._id || sec.fromStation);
    const sTo = String(sec.toStation?._id || sec.toStation);
    return (sFrom === fromId && sTo === toId) || (sFrom === toId && sTo === fromId);
  }) || null;
}

/**
 * Computes baseline cascading delays across all trains.
 * 
 * @param {Array} trains - Train documents with route stops
 * @param {Array} sections - Section documents
 * @param {Object} injectedDelays - Map of trainId -> manual delay in minutes
 * @param {number} safetyBufferMinutes - Buffer between trains on single track (default 2 min)
 * @returns {Object} { delays: { [trainId]: number }, resolvedSchedules: Object, conflicts: Array }
 */
export function calculateBaselinePropagation(trains = [], sections = [], injectedDelays = {}, safetyBufferMinutes = 2) {
  const delays = {};
  trains.forEach((t) => {
    delays[String(t._id)] = injectedDelays[String(t._id)] || 0;
  });

  // Build full journey segments for each train
  const trainSegments = [];

  trains.forEach((train) => {
    const trainId = String(train._id);
    const route = train.route;

    for (let i = 0; i < route.length - 1; i++) {
      const fromStation = String(route[i].station?._id || route[i].station);
      const toStation = String(route[i + 1].station?._id || route[i + 1].station);
      const section = findSection(fromStation, toStation, sections);

      trainSegments.push({
        trainId,
        trainNumber: train.trainNumber,
        priority: train.priority || 3,
        type: train.type,
        fromStation,
        toStation,
        sectionId: section ? String(section._id) : null,
        isSingleLine: section ? section.lineType === 'single' || section.capacity <= 1 : true,
        plannedDep: route[i].departureTimeMinutes,
        plannedArr: route[i + 1].arrivalTimeMinutes,
        segmentIndex: i,
        stopCount: route.length,
      });
    }
  });

  const conflicts = [];

  // Group single-line segments by section
  const sectionGroups = {};
  trainSegments.forEach((seg) => {
    if (seg.sectionId && seg.isSingleLine) {
      if (!sectionGroups[seg.sectionId]) {
        sectionGroups[seg.sectionId] = [];
      }
      sectionGroups[seg.sectionId].push(seg);
    }
  });

  // Detect and resolve conflicts on each single section using FIFO
  Object.keys(sectionGroups).forEach((sectionId) => {
    const segments = sectionGroups[sectionId];
    if (segments.length < 2) return;

    // Sort by effective arrival time at section (FIFO)
    segments.sort((a, b) => {
      const entryA = a.plannedDep + (delays[a.trainId] || 0);
      const entryB = b.plannedDep + (delays[b.trainId] || 0);
      return entryA - entryB;
    });

    for (let i = 0; i < segments.length - 1; i++) {
      const first = segments[i];
      const second = segments[i + 1];

      const firstExit = first.plannedArr + (delays[first.trainId] || 0);
      const secondEntry = second.plannedDep + (delays[second.trainId] || 0);

      if (secondEntry < firstExit + safetyBufferMinutes) {
        const addedDelay = (firstExit + safetyBufferMinutes) - secondEntry;
        if (addedDelay > 0) {
          delays[second.trainId] = (delays[second.trainId] || 0) + addedDelay;
          conflicts.push({
            sectionId,
            heldTrainId: second.trainId,
            clearedTrainId: first.trainId,
            delayAdded: addedDelay,
            reason: `FIFO single-track conflict behind ${first.trainNumber}`,
          });
        }
      }
    }
  });

  // Calculate resolved final arrival times for each train
  const resolvedSchedules = {};
  trains.forEach((train) => {
    const trainId = String(train._id);
    const trainDelay = delays[trainId] || 0;
    const lastStop = train.route[train.route.length - 1];
    const plannedFinalArr = lastStop ? lastStop.arrivalTimeMinutes : 0;
    
    resolvedSchedules[trainId] = {
      trainId,
      trainNumber: train.trainNumber,
      name: train.name,
      type: train.type,
      priority: train.priority,
      injectedDelay: injectedDelays[trainId] || 0,
      totalDelay: trainDelay,
      plannedFinalArrival: plannedFinalArr,
      actualFinalArrival: plannedFinalArr + trainDelay,
    };
  });

  return {
    mode: 'baseline',
    delays,
    resolvedSchedules,
    conflicts,
  };
}
