import assert from 'assert';
import useAppStore from './src/store/useAppStore.js';
import { HealthDataRepository } from './src/features/health/repository/HealthDataRepository.js';
import { GoogleFitHealthProvider } from './src/features/health/providers/GoogleFitHealthProvider.js';
import { HealthConnectProvider } from './src/features/health/providers/HealthConnectProvider.js';
import { HealthDataSource, StepData } from './src/features/health/types/healthTypes.js';

console.log('====================================================');
console.log('   REPLOG END-TO-END FRESH USER SIMULATION TEST     ');
console.log('====================================================\n');

// 1. Reset to factory clean state
useAppStore.getState().clearAllData();
const state0 = useAppStore.getState();

console.log('--> STEP 1: Verifying Clean Slate Initial State...');
assert.strictEqual(state0.athleteProfile.name, '', 'Profile name must be empty string');
assert.strictEqual(state0.dailyHealth.steps, 0, 'Initial steps must be 0');
assert.strictEqual(state0.dailyHealth.caloriesBurned, 0, 'Initial calories must be 0');
assert.strictEqual(state0.dailyHealth.activeMinutes, 0, 'Initial active minutes must be 0');
assert.strictEqual(state0.dailyHealth.activeHealthSource, 'NONE', 'Active health source must be NONE');
assert.deepStrictEqual(state0.weightHistory, [], 'Weight history must be empty array');
assert.deepStrictEqual(state0.progressPhotos, [], 'Progress photos must be empty array');
assert.deepStrictEqual(state0.sessionHistory, [], 'Session history must be empty array');
assert.deepStrictEqual(state0.exercisePRs, {}, 'Exercise PRs must be empty object');
assert.strictEqual(state0.streak, 0, 'Initial streak must be 0');
assert.strictEqual(state0.lvl, 1, 'Initial level must be 1');
assert.strictEqual(state0.currExp, 0, 'Initial XP must be 0');
console.log('  ✓ PASS: Initial state is 100% clean and zero-mocked.');

// 2. Profile Setup
console.log('\n--> STEP 2: Updating Athlete Profile...');
useAppStore.getState().updateAthleteProfile({
  name: 'Alex Hunter',
  title: 'Strength Enthusiast',
  weightKg: 82.5,
  heightCm: 180,
});
const stateProfile = useAppStore.getState();
assert.strictEqual(stateProfile.athleteProfile.name, 'Alex Hunter');
assert.strictEqual(stateProfile.athleteProfile.weightKg, 82.5);
console.log('  ✓ PASS: Athlete profile saved accurately.');

// 3. Log Body Measurements
console.log('\n--> STEP 3: Adding Body Measurements...');
useAppStore.getState().addWeightEntry({
  date: '2026-09-20',
  weightKg: 83.0,
  waistCm: 84.0,
});
useAppStore.getState().addWeightEntry({
  date: '2026-09-24',
  weightKg: 82.5,
  waistCm: 83.0,
});
let stateMeasure = useAppStore.getState();
assert.strictEqual(stateMeasure.weightHistory.length, 2);
assert.strictEqual(stateMeasure.measurements.currentWeightKg, 82.5);
assert.strictEqual(stateMeasure.measurements.currentWaistCm, 83.0);

// Test Deletion
useAppStore.getState().deleteWeightEntry('2026-09-20');
stateMeasure = useAppStore.getState();
assert.strictEqual(stateMeasure.weightHistory.length, 1);
assert.strictEqual(stateMeasure.weightHistory[0].date, '2026-09-24');
console.log('  ✓ PASS: Measurement logged, updated, and deleted accurately.');

// 4. Workout Session & PR Generation
console.log('\n--> STEP 4: Executing Workout & Logging PRs...');
const todayStr = new Date().toISOString().slice(0, 10);
// Log Set 1: Bench Press 80kg x 8 reps
useAppStore.getState().saveSession({
  exercise: 'barbell-bench-press',
  weight: 80,
  reps: 8,
  date: todayStr,
});
let stateWorkout = useAppStore.getState();
assert.strictEqual(stateWorkout.sessionHistory.length, 1);
assert.strictEqual(stateWorkout.sessionHistory[0].isPR, true, 'First set should be a PR');
assert.strictEqual(stateWorkout.exercisePRs['barbell-bench-press'].maxWeight, 80);
assert.strictEqual(stateWorkout.exercisePRs['barbell-bench-press'].maxVolume, 640);
assert.ok(stateWorkout.dailyHealth.caloriesBurned > 0, 'Calories burned should increase');

// Log Set 2: Bench Press 85kg x 6 reps (New Weight PR)
useAppStore.getState().saveSession({
  exercise: 'barbell-bench-press',
  weight: 85,
  reps: 6,
  date: todayStr,
});
stateWorkout = useAppStore.getState();
assert.strictEqual(stateWorkout.sessionHistory.length, 2);
assert.strictEqual(stateWorkout.exercisePRs['barbell-bench-press'].maxWeight, 85);
console.log('  ✓ PASS: Workout sets and PRs evaluated accurately.');

// 5. Finishing Workout & Gamification Progression
console.log('\n--> STEP 5: Finalizing Session & Gamification Progression...');
const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
useAppStore.getState().logSession(todayStr, yesterdayStr);
const stateGamification = useAppStore.getState();
assert.strictEqual(stateGamification.streak, 1, 'Streak should increment to 1');
assert.ok(stateGamification.currExp > 0, 'XP should increase after completing session');
assert.ok(stateGamification.completedDates.includes(todayStr), 'Completed dates must include today');
console.log(`  ✓ PASS: Level=${stateGamification.lvl}, XP=${stateGamification.currExp}, Streak=${stateGamification.streak}`);

// 6. Deduplication and Provider Linking
console.log('\n--> STEP 6: Health Provider Deduplication...');
const createMockStorage = () => ({
  data: {},
  getItem(k) { return this.data[k] || null; },
  setItem(k, v) { this.data[k] = String(v); },
  removeItem(k) { delete this.data[k]; },
});
const gf = new GoogleFitHealthProvider({ storage: createMockStorage() });
const hc = new HealthConnectProvider({ storage: createMockStorage() });
const repo = new HealthDataRepository({
  googleFitProvider: gf,
  healthConnectProvider: hc,
  storage: createMockStorage(),
});

const gfRecords = [
  new StepData({ date: todayStr, steps: 8000, source: HealthDataSource.GOOGLE_FIT }),
];
const hcRecords = [
  new StepData({ date: todayStr, steps: 8500, source: HealthDataSource.HEALTH_CONNECT }),
];

const deduplicated = repo.combineRecordsWithDeduplication(
  gfRecords,
  hcRecords,
  HealthDataSource.HEALTH_CONNECT
);

const todayRec = deduplicated.find((r) => r.date === todayStr);
assert.strictEqual(todayRec.steps, 8500, 'Must deduplicate and take primary source steps');
assert.notStrictEqual(todayRec.steps, 16500, 'Must not sum additively to 16,500');
console.log('  ✓ PASS: Provider synchronization accurately deduplicated (8,500 resolved, non-additive).');

// 7. Factory Reset
console.log('\n--> STEP 7: Reset All Data Verification...');
useAppStore.getState().clearAllData();
const stateReset = useAppStore.getState();
assert.strictEqual(stateReset.sessionHistory.length, 0);
assert.strictEqual(stateReset.weightHistory.length, 0);
assert.strictEqual(stateReset.streak, 0);
assert.strictEqual(stateReset.lvl, 1);
assert.strictEqual(stateReset.athleteProfile.name, '');
console.log('  ✓ PASS: All application data reset cleanly to factory defaults.');

console.log('\n====================================================');
console.log('  ALL END-TO-END SIMULATION TESTS PASSED (7 / 7)     ');
console.log('====================================================\n');
