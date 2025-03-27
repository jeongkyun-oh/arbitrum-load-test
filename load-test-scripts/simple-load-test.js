const { ethers } = require('ethers');

const config = {
  rpcUrl: 'http://127.0.0.1:8547',
  privateKey: '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659',
  testDuration: 30, // seconds
  gasLimit: 100000,  // Increased gas limit to avoid "intrinsic gas too low" errors
  concurrentTxs: 5
};

async function runLoadTest() {
  console.log('=== Simple Arbitrum Nitro Load Test ===');
  console.log(`RPC URL: ${config.rpcUrl}`);
  console.log(`Test Duration: ${config.testDuration} seconds`);
  console.log(`Concurrent Transactions: ${config.concurrentTxs}`);
  console.log('=======================================');
  
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  
  const initialBlockNumber = await provider.getBlockNumber();
  console.log(`Initial block number: ${initialBlockNumber}`);
  
  const testWallets = [];
  for (let i = 0; i < 5; i++) {
    testWallets.push(ethers.Wallet.createRandom().connect(provider));
  }
  
  console.log('Funding test wallets...');
  let nonce = await provider.getTransactionCount(wallet.address);
  console.log(`Starting nonce: ${nonce}`);
  
  for (const testWallet of testWallets) {
    try {
      const tx = await wallet.sendTransaction({
        to: testWallet.address,
        value: ethers.utils.parseEther('0.1'),
        gasLimit: config.gasLimit,
        nonce: nonce++
      });
      await tx.wait();
      console.log(`Funded wallet ${testWallet.address}`);
    } catch (error) {
      console.error(`Error funding wallet: ${error.message}`);
    }
  }
  
  console.log('\nStarting load test...');
  const startTime = Date.now();
  const endTime = startTime + (config.testDuration * 1000);
  
  const results = {
    successfulTxs: 0,
    failedTxs: 0,
    gasUsed: 0,
    confirmationTimes: []
  };
  
  const pendingTxs = [];
  
  while (Date.now() < endTime) {
    while (pendingTxs.filter(tx => !tx.completed).length < config.concurrentTxs && Date.now() < endTime) {
      const toWallet = testWallets[Math.floor(Math.random() * testWallets.length)];
      const txStartTime = Date.now();
      
      const txPromise = wallet.sendTransaction({
        to: toWallet.address,
        value: ethers.utils.parseEther('0.001'),
        gasLimit: config.gasLimit,
        nonce: nonce++
      }).then(async (tx) => {
        try {
          const receipt = await tx.wait();
          const txEndTime = Date.now();
          
          results.successfulTxs++;
          results.gasUsed += receipt.gasUsed.toNumber();
          results.confirmationTimes.push(txEndTime - txStartTime);
          
          if (results.successfulTxs % 10 === 0) {
            console.log(`Completed ${results.successfulTxs} transactions`);
          }
          
          return { success: true, receipt };
        } catch (error) {
          results.failedTxs++;
          console.error(`Transaction failed: ${error.message}`);
          return { success: false, error };
        }
      }).catch(error => {
        results.failedTxs++;
        console.error(`Transaction error: ${error.message}`);
        return { success: false, error };
      });
      
      pendingTxs.push({ promise: txPromise, completed: false });
    }
    
    for (let i = 0; i < pendingTxs.length; i++) {
      if (!pendingTxs[i].completed) {
        const isCompleted = await Promise.race([
          pendingTxs[i].promise.then(() => true),
          new Promise(resolve => setTimeout(() => resolve(false), 0))
        ]);
        
        if (isCompleted) {
          pendingTxs[i].completed = true;
        }
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Test duration reached. Waiting for remaining transactions to complete...');
  await Promise.all(pendingTxs.map(tx => tx.promise));
  
  const finalBlockNumber = await provider.getBlockNumber();
  const actualDuration = (Date.now() - startTime) / 1000;
  
  console.log('\n=== Load Test Results ===');
  console.log(`Test Duration: ${actualDuration.toFixed(2)} seconds`);
  console.log(`Successful Transactions: ${results.successfulTxs}`);
  console.log(`Failed Transactions: ${results.failedTxs}`);
  console.log(`Transactions Per Second: ${(results.successfulTxs / actualDuration).toFixed(2)}`);
  
  if (results.confirmationTimes.length > 0) {
    const avgConfirmationTime = results.confirmationTimes.reduce((a, b) => a + b, 0) / results.confirmationTimes.length;
    const minConfirmationTime = Math.min(...results.confirmationTimes);
    const maxConfirmationTime = Math.max(...results.confirmationTimes);
    
    console.log(`Average Confirmation Time: ${avgConfirmationTime.toFixed(2)} ms`);
    console.log(`Min Confirmation Time: ${minConfirmationTime} ms`);
    console.log(`Max Confirmation Time: ${maxConfirmationTime} ms`);
  }
  
  console.log(`Average Gas Used Per Transaction: ${results.successfulTxs > 0 ? (results.gasUsed / results.successfulTxs).toFixed(2) : 0}`);
  console.log(`Blocks Produced: ${finalBlockNumber - initialBlockNumber}`);
  console.log('========================');
  
  return {
    successfulTxs: results.successfulTxs,
    failedTxs: results.failedTxs,
    tps: results.successfulTxs / actualDuration,
    avgConfirmationTime: results.confirmationTimes.length > 0 ? 
      results.confirmationTimes.reduce((a, b) => a + b, 0) / results.confirmationTimes.length : 0,
    blocksProduced: finalBlockNumber - initialBlockNumber,
    actualDuration
  };
}

runLoadTest()
  .then(results => {
    console.log('Load test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Load test failed:', error);
    process.exit(1);
  });
