import { computeOptimizedDelays, calculateOptimizedSchedule } from './simulation/optimizer.js';

console.log('🚆 Running AI Priority Optimizer Unit Tests (In-Memory)...');
console.log('==========================================================\n');

let allPassed = true;

function assert(description, condition, actualInfo) {
  if (condition) {
    console.log(`✅ PASS: ${description}`);
    if (actualInfo) console.log(`   ℹ️  ${actualInfo}`);
  } else {
    console.log(`❌ FAIL: ${description}`);
    if (actualInfo) console.log(`   ⚠️  ${actualInfo}`);
    allPassed = false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: Low-priority Freight scheduled SLIGHTLY BEFORE high-priority Express
// Section: STA -> STB (Single Line)
// Freight enters at min 10, departs min 30
// Express enters at min 15, departs min 25
// Expected: Express (Priority 1) gets slot with 0 delay. Freight (Priority 3) must wait until Express clears (min 25 + 2 min buffer = min 27 entry => +17 min delay).
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST SCENARIO 1: High-Priority Express Overtakes Low-Priority Freight ---');

const scenario1Trains = [
  {
    _id: 'train_freight',
    trainNumber: 'FR-901',
    name: 'Coal Freight Heavy',
    type: 'freight',
    priority: 3, // Low priority
    route: [
      { station: 'STA', departureTimeMinutes: 10 },
      { station: 'STB', arrivalTimeMinutes: 30 },
    ],
  },
  {
    _id: 'train_express',
    trainNumber: 'EXP-101',
    name: 'Vande Bharat Express',
    type: 'express',
    priority: 1, // High priority
    route: [
      { station: 'STA', departureTimeMinutes: 15 },
      { station: 'STB', arrivalTimeMinutes: 25 },
    ],
  },
];

const res1 = calculateOptimizedSchedule(scenario1Trains);
assert(
  'High-priority Express (EXP-101) receives 0 delay despite later scheduled departure',
  res1.delays['train_express'] === 0,
  `Express Delay = ${res1.delays['train_express']} min`
);
assert(
  'Low-priority Freight (FR-901) is held back to clear Express track reservation',
  res1.delays['train_freight'] > 0,
  `Freight Delay = ${res1.delays['train_freight']} min (Held until Express cleared at min 27)`
);
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: Two Trains of Same Priority (Tie-Breaker by Earlier Entry Time)
// Section: STB -> STC
// Passenger A enters at min 40, clears min 55
// Passenger B enters at min 45, clears min 60
// Expected: Both are Passenger (Priority 2). Fallback to FIFO: Train A gets 0 delay; Train B waits until 55 + 2 = 57 (+12 min delay).
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST SCENARIO 2: Equal Priority Tie-Breaker (FIFO Fallback) ---');

const scenario2Trains = [
  {
    _id: 'train_pass_a',
    trainNumber: 'PAS-201',
    type: 'passenger',
    priority: 2,
    route: [
      { station: 'STB', departureTimeMinutes: 40 },
      { station: 'STC', arrivalTimeMinutes: 55 },
    ],
  },
  {
    _id: 'train_pass_b',
    trainNumber: 'PAS-202',
    type: 'passenger',
    priority: 2,
    route: [
      { station: 'STB', departureTimeMinutes: 45 },
      { station: 'STC', arrivalTimeMinutes: 60 },
    ],
  },
];

const res2 = calculateOptimizedSchedule(scenario2Trains);
assert(
  'Earlier Passenger train (PAS-201) wins tie-breaker and receives 0 delay',
  res2.delays['train_pass_a'] === 0,
  `PAS-201 Delay = ${res2.delays['train_pass_a']} min`
);
assert(
  'Later Passenger train (PAS-202) yields and is delayed to min 57 entry',
  res2.delays['train_pass_b'] === 12,
  `PAS-202 Delay = ${res2.delays['train_pass_b']} min (Planned 45 -> Effective 57)`
);
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: 3-Train Contention Chain (Express, Passenger, Freight)
// Section: STC -> STD
// Freight planned: min 100 - 130
// Passenger planned: min 105 - 125
// Express planned: min 110 - 120
// Expected Order: Express (0 delay, exits 120) -> Passenger (starts 122, exits 142) -> Freight (starts 144, exits 174)
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- TEST SCENARIO 3: 3-Train Contention Chain (Express > Passenger > Freight) ---');

const scenario3Trains = [
  {
    _id: 'chain_freight',
    trainNumber: 'FR-999',
    type: 'freight',
    priority: 3,
    route: [
      { station: 'STC', departureTimeMinutes: 100 },
      { station: 'STD', arrivalTimeMinutes: 130 },
    ],
  },
  {
    _id: 'chain_passenger',
    trainNumber: 'PAS-555',
    type: 'passenger',
    priority: 2,
    route: [
      { station: 'STC', departureTimeMinutes: 105 },
      { station: 'STD', arrivalTimeMinutes: 125 },
    ],
  },
  {
    _id: 'chain_express',
    trainNumber: 'EXP-777',
    type: 'express',
    priority: 1,
    route: [
      { station: 'STC', departureTimeMinutes: 110 },
      { station: 'STD', arrivalTimeMinutes: 120 },
    ],
  },
];

const res3 = calculateOptimizedSchedule(scenario3Trains);

assert(
  'Express (EXP-777) gets immediate clearance with 0 delay',
  res3.delays['chain_express'] === 0,
  `EXP-777 Delay = ${res3.delays['chain_express']} min`
);
assert(
  'Passenger (PAS-555) gets second slot with controlled delay',
  res3.delays['chain_passenger'] === 17,
  `PAS-555 Delay = ${res3.delays['chain_passenger']} min (105 + 17 = 122 min entry)`
);
assert(
  'Freight (FR-999) yields to both higher-priority trains',
  res3.delays['chain_freight'] === 44,
  `FR-999 Delay = ${res3.delays['chain_freight']} min (100 + 44 = 144 min entry)`
);

console.log('\n==========================================================');
if (allPassed) {
  console.log('🎉 ALL AI OPTIMIZER SCENARIOS PASSED WITH PERFECT RESOLUTION!');
} else {
  console.log('⚠️ SOME TESTS FAILED.');
}
