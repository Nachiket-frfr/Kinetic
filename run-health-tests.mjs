import { runGoogleFitTests } from './src/features/health/tests/googleFit.test.js';
import { runHealthConnectTests } from './src/features/health/tests/healthConnect.test.js';
import { runHealthRepositoryTests } from './src/features/health/tests/healthRepository.test.js';

async function main() {
  console.log('====================================================');
  console.log('  REPLOG HEALTH & ACTIVITY INTEGRATION TEST SUITE   ');
  console.log('====================================================\n');

  console.log('--> RUNNING PATH A: GOOGLE FIT TESTS...');
  const gfResults = await runGoogleFitTests();
  gfResults.forEach(r => {
    console.log(`  ${r.passed ? '✓ PASS' : '✕ FAIL'}: ${r.test} ${r.error ? `(${r.error})` : ''}`);
  });

  console.log('\n--> RUNNING PATH B: HEALTH CONNECT TESTS...');
  const hcResults = await runHealthConnectTests();
  hcResults.forEach(r => {
    console.log(`  ${r.passed ? '✓ PASS' : '✕ FAIL'}: ${r.test} ${r.error ? `(${r.error})` : ''}`);
  });

  console.log('\n--> RUNNING SHARED REPOSITORY & DEDUPLICATION TESTS...');
  const repoResults = await runHealthRepositoryTests();
  repoResults.forEach(r => {
    console.log(`  ${r.passed ? '✓ PASS' : '✕ FAIL'}: ${r.test} ${r.error ? `(${r.error})` : ''}`);
  });

  const all = [...gfResults, ...hcResults, ...repoResults];
  const passed = all.filter(r => r.passed).length;
  const failed = all.filter(r => !r.passed).length;

  console.log('\n====================================================');
  console.log(`  TOTAL: ${all.length} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
