const { ethers } = require('ethers');

async function runBasicTest() {
  console.log('=== Basic Arbitrum Nitro Test ===');
  
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8547');
  const wallet = new ethers.Wallet('0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659', provider);
  
  console.log(`Connected to node as ${wallet.address}`);
  
  const blockNumber = await provider.getBlockNumber();
  const balance = await provider.getBalance(wallet.address);
  
  console.log(`Current block number: ${blockNumber}`);
  console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  const testWallet = ethers.Wallet.createRandom().connect(provider);
  console.log(`Created test wallet: ${testWallet.address}`);
  
  try {
    console.log('Sending test transaction...');
    const tx = await wallet.sendTransaction({
      to: testWallet.address,
      value: ethers.utils.parseEther('0.01'),
      gasLimit: 500000  // Very high gas limit to avoid "intrinsic gas too low" errors
    });
    
    console.log(`Transaction sent: ${tx.hash}`);
    
    console.log('Waiting for confirmation...');
    const receipt = await tx.wait();
    
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
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
    const contract = await factory.deploy({ gasLimit: 2000000 });
    
    console.log(`Contract deployment transaction: ${contract.deployTransaction.hash}`);
    await contract.deployed();
    
    console.log(`Contract deployed at: ${contract.address}`);
    
    console.log('\nCalling contract function...');
    const storeTx = await contract.store(42, { gasLimit: 200000 });
    console.log(`Store transaction: ${storeTx.hash}`);
    
    const storeReceipt = await storeTx.wait();
    console.log(`Store function called in block ${storeReceipt.blockNumber}`);
    console.log(`Gas used: ${storeReceipt.gasUsed.toString()}`);
    
    const value = await contract.retrieve();
    console.log(`Retrieved value: ${value.toString()}`);
    
    const finalBlockNumber = await provider.getBlockNumber();
    console.log(`\nBlocks produced: ${finalBlockNumber - blockNumber}`);
    
    return {
      success: true,
      blocksProduced: finalBlockNumber - blockNumber,
      contractAddress: contract.address
    };
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error: error.message };
  }
}

runBasicTest()
  .then(results => {
    console.log('\n=== Test Results ===');
    console.log(`Success: ${results.success}`);
    if (results.success) {
      console.log(`Blocks produced: ${results.blocksProduced}`);
      console.log(`Contract address: ${results.contractAddress}`);
    } else {
      console.log(`Error: ${results.error}`);
    }
    console.log('===================');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
