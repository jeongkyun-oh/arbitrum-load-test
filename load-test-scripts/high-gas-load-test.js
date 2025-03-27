const { ethers } = require('ethers');

const config = {
  rpcUrl: 'http://127.0.0.1:8547',
  privateKey: '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659',
  testDuration: 60, // seconds
  gasLimit: 2000000,  // High gas limit based on successful test
  concurrentTxs: 5,
  testWalletCount: 5
};

async function runLoadTest() {
  console.log('=== Arbitrum Nitro High Gas Load Test ===');
  console.log(`RPC URL: ${config.rpcUrl}`);
  console.log(`Test Duration: ${config.testDuration} seconds`);
  console.log(`Concurrent Transactions: ${config.concurrentTxs}`);
  console.log(`Gas Limit: ${config.gasLimit}`);
  console.log('=========================================');
  
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privateKey, provider);
  
  const initialBlockNumber = await provider.getBlockNumber();
  console.log(`Initial block number: ${initialBlockNumber}`);
  
  const testWallets = [];
  for (let i = 0; i < config.testWalletCount; i++) {
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
  
  console.log('\nDeploying test contract...');
  
  const SimpleStorageABI = [
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "x",
          "type": "uint256"
        }
      ],
      "name": "store",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "retrieve",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  
  const SimpleStorageBytecode = '0x608060405234801561001057600080fd5b5060f78061001f6000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80632e64cec11460415780636057361d146059578063f43fa80514607e575b600080fd5b60476096565b6040516052919060c2565b60405180910390f35b607c60643660046046604435602081019291829003018035915050505050565b005b60846096565b6040516052919060c2565b60005481565b600090815260200190815260200160002090506000905550565b60d781565b82815260208101928215609d579160200282015b82811115609d5782518255916020019190600101906082565b50905090565b602082016000905b815481529060010190602001808311609f57829003601f168201915b505091905056fea264697066735822122062f9a0f0a0b340a3b19e2c8f4e5c9c0a8c9eb5adf2292e5f6c0f3844e033e09064736f6c634300080c0033';
  
  const factory = new ethers.ContractFactory(SimpleStorageABI, SimpleStorageBytecode, wallet);
  let contract;
  
  try {
    contract = await factory.deploy({ 
      gasLimit: 5000000,
      nonce: nonce++
    });
    await contract.deployed();
    console.log(`Contract deployed at: ${contract.address}`);
  } catch (error) {
    console.error(`Error deploying contract: ${error.message}`);
  }
  
  console.log('\nStarting load test...');
  const startTime = Date.now();
  const endTime = startTime + (config.testDuration * 1000);
  
  const results = {
    ethTransfers: { success: 0, failed: 0, gasUsed: 0, confirmationTimes: [] },
    contractCalls: { success: 0, failed: 0, gasUsed: 0, confirmationTimes: [] },
    contractDeployments: { success: 0, failed: 0, gasUsed: 0, confirmationTimes: [] }
  };
  
  const pendingTxs = [];
  
  while (Date.now() < endTime) {
    while (pendingTxs.filter(tx => !tx.completed).length < config.concurrentTxs && Date.now() < endTime) {
      const txType = Math.floor(Math.random() * 3); // 0: ETH transfer, 1: Contract call, 2: Contract deployment
      const txStartTime = Date.now();
      
      let txPromise;
      
      if (txType === 0 || !contract) {
        const toWallet = testWallets[Math.floor(Math.random() * testWallets.length)];
        
        txPromise = wallet.sendTransaction({
          to: toWallet.address,
          value: ethers.utils.parseEther('0.001'),
          gasLimit: config.gasLimit,
          nonce: nonce++
        }).then(async (tx) => {
          try {
            const receipt = await tx.wait();
            const txEndTime = Date.now();
            
            results.ethTransfers.success++;
            results.ethTransfers.gasUsed += receipt.gasUsed.toNumber();
            results.ethTransfers.confirmationTimes.push(txEndTime - txStartTime);
            
            return { success: true, type: 'ethTransfer', receipt };
          } catch (error) {
            results.ethTransfers.failed++;
            console.error(`ETH transfer failed: ${error.message}`);
            return { success: false, type: 'ethTransfer', error };
          }
        }).catch(error => {
          results.ethTransfers.failed++;
          console.error(`ETH transfer error: ${error.message}`);
          return { success: false, type: 'ethTransfer', error };
        });
      } else if (txType === 1 && contract) {
        txPromise = contract.store(Math.floor(Math.random() * 1000), {
          gasLimit: config.gasLimit,
          nonce: nonce++
        }).then(async (tx) => {
          try {
            const receipt = await tx.wait();
            const txEndTime = Date.now();
            
            results.contractCalls.success++;
            results.contractCalls.gasUsed += receipt.gasUsed.toNumber();
            results.contractCalls.confirmationTimes.push(txEndTime - txStartTime);
            
            return { success: true, type: 'contractCall', receipt };
          } catch (error) {
            results.contractCalls.failed++;
            console.error(`Contract call failed: ${error.message}`);
            return { success: false, type: 'contractCall', error };
          }
        }).catch(error => {
          results.contractCalls.failed++;
          console.error(`Contract call error: ${error.message}`);
          return { success: false, type: 'contractCall', error };
        });
      } else {
        txPromise = factory.deploy({
          gasLimit: 5000000,
          nonce: nonce++
        }).then(async (newContract) => {
          try {
            await newContract.deployed();
            const txEndTime = Date.now();
            
            results.contractDeployments.success++;
            results.contractDeployments.gasUsed += newContract.deployTransaction.gasLimit.toNumber(); // Approximate
            results.contractDeployments.confirmationTimes.push(txEndTime - txStartTime);
            
            return { success: true, type: 'contractDeployment', contract: newContract };
          } catch (error) {
            results.contractDeployments.failed++;
            console.error(`Contract deployment failed: ${error.message}`);
            return { success: false, type: 'contractDeployment', error };
          }
        }).catch(error => {
          results.contractDeployments.failed++;
          console.error(`Contract deployment error: ${error.message}`);
          return { success: false, type: 'contractDeployment', error };
        });
      }
      
      pendingTxs.push({ promise: txPromise, completed: false });
      
      const totalTxs = results.ethTransfers.success + results.contractCalls.success + 
                      results.contractDeployments.success + results.ethTransfers.failed + 
                      results.contractCalls.failed + results.contractDeployments.failed;
      
      if (totalTxs % 10 === 0 && totalTxs > 0) {
        console.log(`Processed ${totalTxs} transactions (${results.ethTransfers.success + results.contractCalls.success + results.contractDeployments.success} successful)`);
      }
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
  
  const totalSuccessful = results.ethTransfers.success + results.contractCalls.success + results.contractDeployments.success;
  const totalFailed = results.ethTransfers.failed + results.contractCalls.failed + results.contractDeployments.failed;
  
  console.log(`Total Transactions: ${totalSuccessful + totalFailed}`);
  console.log(`Successful Transactions: ${totalSuccessful}`);
  console.log(`Failed Transactions: ${totalFailed}`);
  console.log(`Transactions Per Second: ${(totalSuccessful / actualDuration).toFixed(2)}`);
  
  console.log('\nETH Transfers:');
  console.log(`- Successful: ${results.ethTransfers.success}`);
  console.log(`- Failed: ${results.ethTransfers.failed}`);
  if (results.ethTransfers.confirmationTimes.length > 0) {
    const avgConfirmationTime = results.ethTransfers.confirmationTimes.reduce((a, b) => a + b, 0) / results.ethTransfers.confirmationTimes.length;
    console.log(`- Average Confirmation Time: ${avgConfirmationTime.toFixed(2)} ms`);
  }
  
  console.log('\nContract Calls:');
  console.log(`- Successful: ${results.contractCalls.success}`);
  console.log(`- Failed: ${results.contractCalls.failed}`);
  if (results.contractCalls.confirmationTimes.length > 0) {
    const avgConfirmationTime = results.contractCalls.confirmationTimes.reduce((a, b) => a + b, 0) / results.contractCalls.confirmationTimes.length;
    console.log(`- Average Confirmation Time: ${avgConfirmationTime.toFixed(2)} ms`);
  }
  
  console.log('\nContract Deployments:');
  console.log(`- Successful: ${results.contractDeployments.success}`);
  console.log(`- Failed: ${results.contractDeployments.failed}`);
  if (results.contractDeployments.confirmationTimes.length > 0) {
    const avgConfirmationTime = results.contractDeployments.confirmationTimes.reduce((a, b) => a + b, 0) / results.contractDeployments.confirmationTimes.length;
    console.log(`- Average Confirmation Time: ${avgConfirmationTime.toFixed(2)} ms`);
  }
  
  console.log(`\nBlocks Produced: ${finalBlockNumber - initialBlockNumber}`);
  console.log('========================');
  
  return {
    totalSuccessful,
    totalFailed,
    tps: totalSuccessful / actualDuration,
    ethTransfers: results.ethTransfers,
    contractCalls: results.contractCalls,
    contractDeployments: results.contractDeployments,
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
