module.exports = {
  rpcUrl: 'http://127.0.0.1:8547',
  
  devAccount: {
    address: '0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E',
    privateKey: '0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659'
  },
  
  scenarios: {
    ethTransfers: {
      count: 100,           // Number of transactions to send
      concurrency: 10,      // Number of concurrent transactions
      value: '0.001',       // ETH value to send in each transaction
      gasLimit: 21000       // Gas limit for ETH transfers
    },
    
    contractDeployment: {
      count: 10,            // Number of contracts to deploy
      concurrency: 5,       // Number of concurrent deployments
      gasLimit: 2000000     // Gas limit for contract deployments
    },
    
    contractCalls: {
      count: 100,           // Number of function calls
      concurrency: 10,      // Number of concurrent calls
      gasLimit: 100000      // Gas limit for function calls
    },
    
    mixedWorkload: {
      duration: 60,         // Duration in seconds
      tps: 50               // Target transactions per second
    }
  },
  
  simpleStorageContractBytecode: '0x608060405234801561001057600080fd5b5060f78061001f6000396000f3fe6080604052348015600f57600080fd5b5060043610603c5760003560e01c80632e64cec11460415780636057361d146059578063f43fa80514607e575b600080fd5b60476096565b6040516052919060c2565b60405180910390f35b607c60643660046046604435602081019291829003018035915050505050565b005b60846096565b6040516052919060c2565b60005481565b600090815260200190815260200160002090506000905550565b60d781565b82815260208101928215609d579160200282015b82811115609d5782518255916020019190600101906082565b50905090565b602082016000905b815481529060010190602001808311609f57829003601f168201915b505091905056fea264697066735822122062f9a0f0a0b340a3b19e2c8f4e5c9c0a8c9eb5adf2292e5f6c0f3844e033e09064736f6c634300080c0033',
  
  simpleStorageContractAbi: [
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
  ]
};
