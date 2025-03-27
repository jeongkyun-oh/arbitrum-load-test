const { ethers } = require('ethers');
const config = require('./config');
const utils = require('./utils');

async function runContractDeploymentTest() {
  console.log('=== Contract Deployment Load Test ===');
  console.log(`RPC URL: ${config.rpcUrl}`);
  console.log(`Deployments: ${config.scenarios.contractDeployment.count}`);
  console.log(`Concurrency: ${config.scenarios.contractDeployment.concurrency}`);
  console.log('=====================================');
  
  try {
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.devAccount.privateKey, provider);
    
    console.log('Getting initial node metrics...');
    const initialMetrics = await utils.getNodeMetrics();
    console.log(`Initial block number: ${initialMetrics.blockNumber}`);
    console.log(`Pending transactions: ${initialMetrics.pendingTransactions}`);
    
    const startTime = Date.now();
    
    console.log('Starting contract deployments...');
    const results = await utils.runConcurrentTransactions(
      config.scenarios.contractDeployment.count,
      config.scenarios.contractDeployment.concurrency,
      () => {
        const factory = new ethers.ContractFactory(
          config.simpleStorageContractAbi,
          config.simpleStorageContractBytecode,
          wallet
        );
        
        return factory.deploy({
          gasLimit: config.scenarios.contractDeployment.gasLimit
        });
      }
    );
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000; // in seconds
    
    console.log('Getting final node metrics...');
    const finalMetrics = await utils.getNodeMetrics();
    
    const stats = utils.calculateStats(results);
    
    console.log('\n=== Test Results ===');
    console.log(`Total deployments: ${stats.totalTx}`);
    console.log(`Total duration: ${totalDuration.toFixed(2)} seconds`);
    console.log(`Deployments per second: ${(stats.totalTx / totalDuration).toFixed(2)}`);
    console.log(`Average confirmation time: ${stats.avgConfirmationTime.toFixed(2)} ms`);
    console.log(`Median confirmation time: ${stats.medianConfirmationTime.toFixed(2)} ms`);
    console.log(`Min confirmation time: ${stats.minConfirmationTime.toFixed(2)} ms`);
    console.log(`Max confirmation time: ${stats.maxConfirmationTime.toFixed(2)} ms`);
    console.log(`Total gas used: ${stats.totalGasUsed}`);
    console.log(`Average gas used per deployment: ${stats.avgGasUsed.toFixed(2)}`);
    console.log(`Blocks produced: ${finalMetrics.blockNumber - initialMetrics.blockNumber}`);
    console.log('===================');
    
    return {
      stats,
      initialMetrics,
      finalMetrics,
      totalDuration
    };
  } catch (error) {
    console.error('Error running contract deployment test:', error);
    throw error;
  }
}

if (require.main === module) {
  runContractDeploymentTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runContractDeploymentTest };
