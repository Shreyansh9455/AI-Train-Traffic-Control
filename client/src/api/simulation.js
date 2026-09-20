import api from './client.js';

export const SIM_ID = 'default';

/**
 * Fetches current live simulation state (clock, trains, sections).
 *
 * @param {string} simulationId 
 * @returns {Promise<Object>}
 */
export async function getSimulationState(simulationId = SIM_ID) {
  const response = await api.get(`/simulation/state?simulationId=${simulationId}`);
  return response.data;
}

/**
 * Fetches operational KPI summary.
 *
 * @param {'baseline'|'optimized'} mode 
 * @param {string} simulationId 
 * @returns {Promise<Object>}
 */
export async function getMetrics(mode = 'baseline', simulationId = SIM_ID) {
  const response = await api.get(`/metrics/summary?simulationId=${simulationId}&mode=${mode}`);
  return response.data;
}

/**
 * Starts simulation clock loop.
 *
 * @param {Object} [opts] - { tickIntervalMs, minutesPerTick, startMinute }
 * @returns {Promise<Object>}
 */
export async function startSimulation(opts = {}) {
  let simulationId = SIM_ID;
  let payload = opts;

  if (typeof opts === 'string') {
    simulationId = opts;
    payload = arguments[1] || {};
  }

  const response = await api.post('/simulation/start', {
    simulationId,
    tickIntervalMs: payload.tickIntervalMs ?? 1000,
    minutesPerTick: payload.minutesPerTick ?? 1,
    startMinute: payload.startMinute,
  });
  return response.data;
}

/**
 * Pauses active simulation clock loop.
 *
 * @param {string} [simulationId]
 * @returns {Promise<Object>}
 */
export async function pauseSimulation(simulationId = SIM_ID) {
  const response = await api.post('/simulation/pause', { simulationId });
  return response.data;
}

/**
 * Resets simulation state and clears historical TrainRuns.
 *
 * @param {string} [simulationId]
 * @returns {Promise<Object>}
 */
export async function resetSimulation(simulationId = SIM_ID) {
  const response = await api.post('/simulation/reset', { simulationId });
  return response.data;
}

/**
 * Injects a manual delay onto a specific train.
 *
 * @param {string} trainId 
 * @param {number} minutes 
 * @param {string} [simulationId]
 * @returns {Promise<Object>}
 */
export async function injectDelay(trainId, minutes, simulationId = SIM_ID) {
  const response = await api.post('/simulation/inject-delay', {
    simulationId,
    trainId,
    minutes: Number(minutes),
  });
  return response.data;
}

/**
 * Fetches comparative baseline vs optimized timetable.
 *
 * @param {string} [simulationId]
 * @returns {Promise<Object>}
 */
export async function getScheduleComparison(simulationId = SIM_ID) {
  const response = await api.get(`/simulation/compare?simulationId=${simulationId}`);
  return response.data;
}

// ─── Resource CRUD API Wrappers ────────────────────────────────────────────

export async function getStations() {
  const response = await api.get('/stations');
  return response.data;
}

export async function getSections() {
  const response = await api.get('/sections');
  return response.data;
}

export async function createSection(data) {
  const response = await api.post('/sections', data);
  return response.data;
}

export async function updateSection(id, data) {
  const response = await api.put(`/sections/${id}`, data);
  return response.data;
}

export async function deleteSection(id) {
  const response = await api.delete(`/sections/${id}`);
  return response.data;
}

export async function getTrains() {
  const response = await api.get('/trains');
  return response.data;
}

export async function createTrain(data) {
  const response = await api.post('/trains', data);
  return response.data;
}

export async function updateTrain(id, data) {
  const response = await api.put(`/trains/${id}`, data);
  return response.data;
}

export async function deleteTrain(id) {
  const response = await api.delete(`/trains/${id}`);
  return response.data;
}
