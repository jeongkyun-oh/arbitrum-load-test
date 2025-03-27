const { ethers } = require('ethers');
const config = require('./config');

const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
const wallet = new ethers.Wallet(config.devAccount.privateKey, provider);

let currentNonce = null;

const utils = {
  createWallets: async (count) => {
    const wallets = [];
    
    for (let i = 0; i < count; i++) {
      const randomWallet = ethers.Wallet.createRandom().connect(provider);
      wallets.push(randomWallet);
    }
    
    if (currentNonce === null) {
      currentNonce = await provider.getTransactionCount(wallet.address);
      console.log(`Initial nonce for ${wallet.address}: ${currentNonce}`);
    }
    
    for (const w of wallets) {
      try {
        const tx = await wallet.sendTransaction({
          to: w.address,
          value: ethers.utils.parseEther('1.0'),
          nonce: currentNonce++,
          gasLimit: 21000
        });
        await tx.wait();
        console.log(`Funded wallet ${w.address} with 1 ETH`);
      } catch (error) {
        console.error(`Error funding wallet ${w.address}:`, error.message);
      }
    }
    
    return wallets;
  },
  
  deploySimpleStorageContract: async (deployerWallet) => {
    const useWallet = deployerWallet || wallet;
    const factory = new ethers.ContractFactory(
      config.simpleStorageContractAbi,
      config.simpleStorageContractBytecode,
      useWallet
    );
    
    if (!deployerWallet || useWallet.address === wallet.address) {
      if (currentNonce === null) {
        currentNonce = await provider.getTransactionCount(wallet.address);
        console.log(`Initial nonce for ${wallet.address}: ${currentNonce}`);
      }
      
      const contract = await factory.deploy({
        nonce: currentNonce++,
        gasLimit: config.scenarios.contractDeployment.gasLimit
      });
      await contract.deployed();
      return contract;
    } else {
      const contract = await factory.deploy({
        gasLimit: config.scenarios.contractDeployment.gasLimit
      });
      await contract.deployed();
      return contract;
    }
  },
  
  sendEthTransfer: async (senderWallet, toAddress, value) => {
    if (senderWallet.address === wallet.address) {
      if (currentNonce === null) {
        currentNonce = await provider.getTransactionCount(senderWallet.address);
        console.log(`Initial nonce for ${senderWallet.address}: ${currentNonce}`);
      }
      
      const tx = await senderWallet.sendTransaction({
        to: toAddress,
        value: ethers.utils.parseEther(value.toString()),
        gasLimit: config.scenarios.ethTransfers.gasLimit,
        nonce: currentNonce++
      });
      
      return tx;
    } else {
      const tx = await senderWallet.sendTransaction({
        to: toAddress,
        value: ethers.utils.parseEther(value.toString()),
        gasLimit: config.scenarios.ethTransfers.gasLimit
      });
      
      return tx;
    }
  },
  
  callContractFunction: async (contract, functionName, args, options = {}) => {
    if (contract.signer && contract.signer.address === wallet.address) {
      if (currentNonce === null) {
        currentNonce = await provider.getTransactionCount(wallet.address);
        console.log(`Initial nonce for ${wallet.address}: ${currentNonce}`);
      }
      
      const txOptions = {
        ...options,
        nonce: currentNonce++
      };
      
      const tx = await contract[functionName](...args, txOptions);
      return tx;
    } else {
      const tx = await contract[functionName](...args, options);
      return tx;
    }
  },
  
  measureTxConfirmationTime: async (txPromise) => {
    const startTime = Date.now();
    const tx = await txPromise;
    const receipt = await tx.wait();
    const endTime = Date.now();
    
    return {
      txHash: tx.hash,
      confirmationTime: endTime - startTime,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  },
  
  runConcurrentTransactions: async (count, concurrency, txFunction) => {
    const results = [];
    const batches = Math.ceil(count / concurrency);
    
    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(concurrency, count - i * concurrency);
      const batchPromises = [];
      
      for (let j = 0; j < batchSize; j++) {
        batchPromises.push(utils.measureTxConfirmationTime(txFunction(i * concurrency + j)));
      }
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  },
  
  calculateStats: (results) => {
    const confirmationTimes = results.map(r => r.confirmationTime);
    const gasUsed = results.map(r => parseInt(r.gasUsed));
    
    return {
      totalTx: results.length,
      avgConfirmationTime: confirmationTimes.reduce((a, b) => a + b, 0) / confirmationTimes.length,
      minConfirmationTime: Math.min(...confirmationTimes),
      maxConfirmationTime: Math.max(...confirmationTimes),
      medianConfirmationTime: median(confirmationTimes),
      totalGasUsed: gasUsed.reduce((a, b) => a + b, 0),
      avgGasUsed: gasUsed.reduce((a, b) => a + b, 0) / gasUsed.length
    };
  },
  
  getNodeMetrics: async () => {
    try {
      const blockNumber = await provider.getBlockNumber();
      
      const latestBlock = await provider.getBlock(blockNumber);
      
      const clientVersion = await provider.send('web3_clientVersion', []);
      
      const pendingTxCount = await provider.send('eth_getBlockTransactionCountByNumber', ['pending']);
      
      return {
        blockNumber,
        latestBlockTimestamp: latestBlock.timestamp,
        latestBlockTransactions: latestBlock.transactions.length,
        clientVersion,
        pendingTransactions: parseInt(pendingTxCount, 16)
      };
    } catch (error) {
      console.error('Error getting node metrics:', error);
      return {};
    }
  }
};

function median(values) {
  if (values.length === 0) return 0;
  
  values.sort((a, b) => a - b);
  
  const half = Math.floor(values.length / 2);
  
  if (values.length % 2) {
    return values[half];
  }
  
  return (values[half - 1] + values[half]) / 2.0;
}

module.exports = utils;
