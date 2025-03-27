const { ethers } = require('ethers');
const config = require('./config');
const utils = require('./utils');

async function runMixedWorkloadTest() {
  console.log('=== Mixed Workload Load Test ===');
  console.log(`RPC URL: ${config.rpcUrl}`);
  console.log(`Duration: ${config.scenarios.mixedWorkload.duration} seconds`);
  console.log(`Target TPS: ${config.scenarios.mixedWorkload.tps}`);
  console.log('===============================');
  
  try {
    const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    const wallet = new ethers.Wallet(config.devAccount.privateKey, provider);
    
    console.log('Getting initial node metrics...');
    const initialMetrics = await utils.getNodeMetrics();
    console.log(`Initial block number: ${initialMetrics.blockNumber}`);
    console.log(`Pending transactions: ${initialMetrics.pendingTransactions}`);
    
    console.log('Creating test wallets...');
    const testWallets = await utils.createWallets(10);
    console.log(`Created ${testWallets.length} test wallets`);
    
    console.log('Deploying test contract...');
    const contract = await utils.deploySimpleStorageContract(wallet);
    console.log(`Test contract deployed at: ${contract.address}`);
    
    const startTime = Date.now();
    const endTime = startTime + (config.scenarios.mixedWorkload.duration * 1000);
    
    const results = [];
    const txPromises = [];
    let txCount = 0;
    
    console.log('Starting mixed workload...');
    
    while (Date.now() < endTime) {
      const elapsedTime = (Date.now() - startTime) / 1000;
      const targetTxCount = Math.floor(config.scenarios.mixedWorkload.tps * elapsedTime);
      const txToSend = Math.max(0, targetTxCount - txCount);
      
      if (txToSend > 0) {
        for (let i = 0; i < txToSend; i++) {
          const txType = Math.floor(Math.random() * 3);
          
          let txPromise;
          
          switch (txType) {
            case 0: // ETH transfer
              const toWallet = testWallets[txCount % testWallets.length];
              txPromise = utils.measureTxConfirmationTime(
                utils.sendEthTransfer(wallet, toWallet.address, '0.0001')
              );
              break;
              
            case 1: // Contract deployment
              if (txCount % 10 === 0) { // Deploy less frequently
                txPromise = utils.measureTxConfirmationTime(
                  utils.deploySimpleStorageContract(wallet)
                );
              } else {
                continue;
              }
              break;
              
            case 2: // Contract call
              txPromise = utils.measureTxConfirmationTime(
                contract.store(txCount, {
                  gasLimit: config.scenarios.contractCalls.gasLimit
                })
              );
              break;
          }
          
          txPromises.push(txPromise);
          txCount++;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const completedPromises = [];
      for (let i = 0; i < txPromises.length; i++) {
        const promise = txPromises[i];
        if (promise.isCompleted) continue;
        
        try {
          const result = await Promise.race([
            promise,
            new Promise(resolve => setTimeout(() => resolve(null), 0))
          ]);
          
          if (result !== null) {
            results.push(result);
            completedPromises.push(i);
            promise.isCompleted = true;
          }
        } catch (error) {
          console.error('Error processing transaction:', error);
          completedPromises.push(i);
          promise.isCompleted = true;
        }
      }
    }
    
    console.log('Waiting for remaining transactions to complete...');
    for (const promise of txPromises) {
      if (!promise.isCompleted) {
        try {
          const result = await promise;
          results.push(result);
        } catch (error) {
          console.error('Error processing transaction:', error);
        }
      }
    }
    
    const actualDuration = (Date.now() - startTime) / 1000;
    
    console.log('Getting final node metrics...');
    const finalMetrics = await utils.getNodeMetrics();
    
    const stats = utils.calculateStats(results);
    
    console.log('\n=== Test Results ===');
    console.log(`Total transactions: ${stats.totalTx}`);
    console.log(`Total duration: ${actualDuration.toFixed(2)} seconds`);
    console.log(`Actual transactions per second: ${(stats.totalTx / actualDuration).toFixed(2)}`);
    console.log(`Average confirmation time: ${stats.avgConfirmationTime.toFixed(2)} ms`);
    console.log(`Median confirmation time: ${stats.medianConfirmationTime.toFixed(2)} ms`);
    console.log(`Min confirmation time: ${stats.minConfirmationTime.toFixed(2)} ms`);
    console.log(`Max confirmation time: ${stats.maxConfirmationTime.toFixed(2)} ms`);
    console.log(`Total gas used: ${stats.totalGasUsed}`);
    console.log(`Average gas used per tx: ${stats.avgGasUsed.toFixed(2)}`);
    console.log(`Blocks produced: ${finalMetrics.blockNumber - initialMetrics.blockNumber}`);
    console.log('===================');
    
    return {
      stats,
      initialMetrics,
      finalMetrics,
      actualDuration,
      txCount
    };
  } catch (error) {
    console.error('Error running mixed workload test:', error);
    throw error;
  }
}

if (require.main === module) {
  runMixedWorkloadTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runMixedWorkloadTest };
