const { ethers } = require('ethers');
const config = require('./config');
const utils = require('./utils');

async function runEthTransfersTest() {
  console.log('=== ETH Transfers Load Test ===');
  console.log(`RPC URL: ${config.rpcUrl}`);
  console.log(`Transactions: ${config.scenarios.ethTransfers.count}`);
  console.log(`Concurrency: ${config.scenarios.ethTransfers.concurrency}`);
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
    
    const startTime = Date.now();
    
    console.log('Starting ETH transfers...');
    const results = await utils.runConcurrentTransactions(
      config.scenarios.ethTransfers.count,
      config.scenarios.ethTransfers.concurrency,
      (index) => {
        const toWallet = testWallets[index % testWallets.length];
        return utils.sendEthTransfer(wallet, toWallet.address, config.scenarios.ethTransfers.value);
      }
    );
    
    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000; // in seconds
    
    console.log('Getting final node metrics...');
    const finalMetrics = await utils.getNodeMetrics();
    
    const stats = utils.calculateStats(results);
    
    console.log('\n=== Test Results ===');
    console.log(`Total transactions: ${stats.totalTx}`);
    console.log(`Total duration: ${totalDuration.toFixed(2)} seconds`);
    console.log(`Transactions per second: ${(stats.totalTx / totalDuration).toFixed(2)}`);
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
      totalDuration
    };
  } catch (error) {
    console.error('Error running ETH transfers test:', error);
    throw error;
  }
}

if (require.main === module) {
  runEthTransfersTest()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runEthTransfersTest };
