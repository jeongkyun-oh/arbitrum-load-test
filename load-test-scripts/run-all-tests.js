const { runEthTransfersTest } = require('./eth-transfers-test');
const { runContractDeploymentTest } = require('./contract-deployment-test');
const { runContractCallsTest } = require('./contract-calls-test');
const { runMixedWorkloadTest } = require('./mixed-workload-test');
const fs = require('fs');

async function runAllTests() {
  console.log('======================================');
  console.log('=== Arbitrum Nitro Dev Node Load Test ===');
  console.log('======================================\n');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  try {
    console.log('\n\n=== Running ETH Transfers Test ===\n');
    results.tests.ethTransfers = await runEthTransfersTest();
    
    console.log('\n\n=== Running Contract Deployment Test ===\n');
    results.tests.contractDeployment = await runContractDeploymentTest();
    
    console.log('\n\n=== Running Contract Calls Test ===\n');
    results.tests.contractCalls = await runContractCallsTest();
    
    console.log('\n\n=== Running Mixed Workload Test ===\n');
    results.tests.mixedWorkload = await runMixedWorkloadTest();
    
    const resultsFile = `load-test-results-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${resultsFile}`);
    
    console.log('\n=== Load Test Summary ===');
    console.log(`ETH Transfers: ${results.tests.ethTransfers.stats.totalTx} txs, ${(results.tests.ethTransfers.stats.totalTx / results.tests.ethTransfers.totalDuration).toFixed(2)} TPS`);
    console.log(`Contract Deployments: ${results.tests.contractDeployment.stats.totalTx} txs, ${(results.tests.contractDeployment.stats.totalTx / results.tests.contractDeployment.totalDuration).toFixed(2)} TPS`);
    console.log(`Contract Calls: ${results.tests.contractCalls.stats.totalTx} txs, ${(results.tests.contractCalls.stats.totalTx / results.tests.contractCalls.totalDuration).toFixed(2)} TPS`);
    console.log(`Mixed Workload: ${results.tests.mixedWorkload.stats.totalTx} txs, ${(results.tests.mixedWorkload.stats.totalTx / results.tests.mixedWorkload.actualDuration).toFixed(2)} TPS`);
    console.log('========================');
    
    return results;
  } catch (error) {
    console.error('Error running all tests:', error);
    throw error;
  }
}

if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
