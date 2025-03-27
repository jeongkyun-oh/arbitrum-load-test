const { ethers } = require('ethers');

async function runMinimalTest() {
  console.log('=== Minimal Arbitrum Nitro Test ===');
  
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8547');
  const wallet = new ethers.Wallet('0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659', provider);
  
  console.log(`Connected to node as ${wallet.address}`);
  
  const blockNumber = await provider.getBlockNumber();
  const balance = await provider.getBalance(wallet.address);
  
  console.log(`Current block number: ${blockNumber}`);
  console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  const network = await provider.getNetwork();
  console.log(`Network: ${network.name} (chainId: ${network.chainId})`);
  
  const gasPrice = await provider.getGasPrice();
  console.log(`Current gas price: ${ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
  
  const estimatedGas = await provider.estimateGas({
    to: ethers.constants.AddressZero,
    value: ethers.utils.parseEther('0.0001')
  }).catch(e => {
    console.log('Error estimating gas:', e.message);
    return ethers.BigNumber.from(21000);
  });
  
  console.log(`Estimated gas for simple transfer: ${estimatedGas.toString()}`);
  
  try {
    const extremeGasLimit = 10000000; // 10 million gas
    console.log(`Attempting transaction with ${extremeGasLimit} gas limit...`);
    
    const tx = await wallet.sendTransaction({
      to: ethers.constants.AddressZero, // Send to zero address
      value: ethers.utils.parseEther('0.0001'),
      gasLimit: extremeGasLimit
    });
    
    console.log(`Transaction sent: ${tx.hash}`);
    
    console.log('Waiting for confirmation...');
    const receipt = await tx.wait();
    
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    return {
      success: true,
      txHash: tx.hash,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('Transaction failed:', error.message);
    
    if (error.error && error.error.message) {
      console.error('Error details:', error.error.message);
    }
    
    if (error.transaction) {
      console.log('Failed transaction details:');
      console.log(`- Gas limit: ${error.transaction.gasLimit.toString()}`);
      console.log(`- To: ${error.transaction.to}`);
      console.log(`- Value: ${ethers.utils.formatEther(error.transaction.value)} ETH`);
      console.log(`- Nonce: ${error.transaction.nonce}`);
    }
    
    return { success: false, error: error.message };
  }
}

runMinimalTest()
  .then(results => {
    console.log('\n=== Test Results ===');
    console.log(`Success: ${results.success}`);
    if (results.success) {
      console.log(`Transaction hash: ${results.txHash}`);
      console.log(`Gas used: ${results.gasUsed}`);
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
