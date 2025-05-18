# 2KAY Directed Bill Payment System - Blockchain Integration Guide

This document provides guidance for frontend developers on how to integrate with the blockchain features of the 2KAY Directed Bill Payment System.

## Table of Contents
- [Blockchain Configuration](#blockchain-configuration)
- [API Endpoints](#api-endpoints)
- [User Flows](#user-flows)
- [Integration Guide for Frontend Developers](#integration-guide-for-frontend-developers)
- [Example Implementation](#example-implementation)
- [Troubleshooting](#troubleshooting)

## Blockchain Configuration

The system uses the following blockchain configuration:

- **RPC URL**: `https://base-sepolia.g.alchemy.com/v2/E8dbOUE0UW0805txb2tZSsK7icYnHDm7/`
- **Chain ID**: `84532` (Base Sepolia Testnet)
- **U2K Token Contract Address**: `0x6CC3eD7c089a866f822Cc7182C30A07c75647eDA`
- **Bill Payment Contract Address**: `0xce9a1ADa0fdbAD99b2391Eba5fCC304B8321a0be`

### Contract ABIs

To interact with the contracts directly from the frontend, you'll need the contract ABIs which are defined in `src/config/blockchain.ts`:

<details>
<summary>U2K Token ABI</summary>

```json
[
  {"inputs":[{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
  {"inputs":[],"name":"REWARDS_ALLOCATION","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"TOTAL_SUPPLY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"billPaymentContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"rewardAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"sponsor","type":"address"}],"name":"rewardSponsor","outputs":[{"internalType":"bool","name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_billPaymentContract","type":"address"}],"name":"setBillPaymentContract","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_rewardAmount","type":"uint256"}],"name":"setRewardAmount","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}
]
```
</details>

<details>
<summary>Bill Payment System ABI</summary>

```json
[
  {"inputs":[{"internalType":"address","name":"_u2kToken","type":"address"},{"internalType":"address","name":"_owner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"billId","type":"uint256"},{"indexed":true,"internalType":"address","name":"beneficiary","type":"address"},{"indexed":true,"internalType":"address","name":"sponsor","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"BillCreated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"billId","type":"uint256"},{"indexed":true,"internalType":"address","name":"sponsor","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"BillPaid","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"billId","type":"uint256"},{"indexed":true,"internalType":"address","name":"sponsor","type":"address"}],"name":"BillRejected","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sponsor","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"TokensRewarded","type":"event"},
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"beneficiaryBills","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"billCounter","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"bills","outputs":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"beneficiary","type":"address"},{"internalType":"address","name":"paymentDestination","type":"address"},{"internalType":"address","name":"sponsor","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"description","type":"string"},{"internalType":"enum BillPaymentSystem.BillStatus","name":"status","type":"uint8"},{"internalType":"uint256","name":"createdAt","type":"uint256"},{"internalType":"uint256","name":"paidAt","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_sponsor","type":"address"},{"internalType":"address","name":"_paymentDestination","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"string","name":"_description","type":"string"}],"name":"createBill","outputs":[{"internalType":"uint256","name":"billId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"_beneficiary","type":"address"}],"name":"getBeneficiaryBills","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_billId","type":"uint256"}],"name":"getBill","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"beneficiary","type":"address"},{"internalType":"address","name":"paymentDestination","type":"address"},{"internalType":"address","name":"sponsor","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"description","type":"string"},{"internalType":"enum BillPaymentSystem.BillStatus","name":"status","type":"uint8"},{"internalType":"uint256","name":"createdAt","type":"uint256"},{"internalType":"uint256","name":"paidAt","type":"uint256"}],"internalType":"struct BillPaymentSystem.Bill","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_sponsor","type":"address"}],"name":"getSponsorBills","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_sponsor","type":"address"}],"name":"getSponsorTokenBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_billId","type":"uint256"}],"name":"payBillWithNative","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_billId","type":"uint256"}],"name":"payBillWithU2K","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"_billId","type":"uint256"}],"name":"rejectBill","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"sponsorBills","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"sponsorTokenBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"u2kToken","outputs":[{"internalType":"contract U2KToken","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"_u2kToken","type":"address"}],"name":"updateTokenContract","outputs":[],"stateMutability":"nonpayable","type":"function"}
]
```
</details>

## API Endpoints

The following API endpoints are available for blockchain integration:

### Wallet Management

- **Connect Existing Wallet**
  - `POST /blockchain/wallets/:userId/connect`
  - Request body: `{ "walletAddress": "0x..." }`
  - Response: Wallet details with balances and metrics

- **Get Wallet Balance**
  - `GET /blockchain/wallets/:userId/balance`
  - Response: `{ "address": "0x...", "balance": "10.5" }`

### Bill Management

- **Create Blockchain Bill**
  - `POST /blockchain/blockchain-bills`
  - Request body:
    ```json
    {
      "sponsorId": "user-id",
      "paymentDestination": "0x...",
      "amount": 10.5,
      "description": "Bill payment for service",
      "userId": "optional-user-id",
      "paymentType": "NATIVE" // or "U2K_TOKEN"
    }
    ```
  - Response: Bill creation confirmation with transaction hash

- **Get Blockchain Bills**
  - `GET /blockchain/blockchain-bills`
  - Response: List of all blockchain bills

- **Get User Blockchain Bills**
  - `GET /blockchain/blockchain-bills/user/:userId`
  - Response: List of user's blockchain bills

- **Get Bill Details**
  - `GET /blockchain/blockchain-bills/:blockchainBillId`
  - Response: Detailed information about a specific bill

### Bill Requests

- **Create Bill Request**
  - `POST /blockchain/bills/:billId/request`
  - Request body:
    ```json
    {
      "beneficiaryAddress": "0x...",
      "sponsorAddress": "0x...",
      "paymentDestination": "0x...",
      "amount": 10.5,
      "description": "Bill payment request"
    }
    ```
  - Response: Request creation confirmation with transaction hash

- **Pay Bill With Native Token (ETH)**
  - `POST /blockchain/blockchain-requests/:blockchainRequestId/pay-native`
  - Request body: 
    ```json
    {
      "sponsorAddress": "0x...",
      "sponsorSignature": "0x...", // Signature from wallet
      "amount": "0.1" // Amount in ETH
    }
    ```
  - Response: Payment confirmation with transaction hash

- **Pay Bill With U2K Token**
  - `POST /blockchain/blockchain-requests/:blockchainRequestId/pay-u2k`
  - Request body:
    ```json
    {
      "sponsorAddress": "0x...",
      "sponsorSignature": "0x..." // Signature from wallet
    }
    ```
  - Response: Payment confirmation with transaction hash

- **Reject Bill**
  - `POST /blockchain/blockchain-requests/:blockchainRequestId/reject`
  - Request body:
    ```json
    {
      "sponsorAddress": "0x...",
      "sponsorSignature": "0x..." // Signature from wallet
    }
    ```
  - Response: Rejection confirmation with transaction hash

### Sponsor Management

- **Get Sponsors**
  - `GET /blockchain/sponsors`
  - Response: List of sponsors with their metrics

- **Get Sponsor Bills By User ID**
  - `GET /blockchain/sponsors/:userId/bills`
  - Response: List of bills associated with a sponsor user

- **Get Sponsor Bills By Address**
  - `GET /blockchain/sponsor-bills/:address`
  - Response: List of bills associated with a sponsor's address

- **Get Beneficiary Bills**
  - `GET /blockchain/beneficiary-bills/:address`
  - Response: List of bills associated with a beneficiary's address

- **Get Sponsor Metrics**
  - `GET /blockchain/sponsors/:sponsorAddress/metrics`
  - Response: Metrics for a specific sponsor

### System Management

- **Sync Wallet Balances**
  - `POST /blockchain/wallets/sync`
  - Response: Confirmation of balance sync

## User Flows

### Beneficiary (Benefactee) Flow

1. **Connect Wallet**
   - User navigates to the Web3 dashboard
   - User connects their EVM-compatible wallet (MetaMask, etc.)
   - System stores wallet address in the database for identification
   - API Endpoint: `POST /blockchain/wallets/:userId/connect`

2. **Create Bill Request**
   - User creates a new bill request with:
     - Benefactor's ID or wallet address
     - Amount requested (in ETH or USDT)
     - Payment destination address
     - Bill description
   - API Endpoint: `POST /blockchain/blockchain-bills` or `POST /blockchain/bills/:billId/request`

3. **Track Bill Status**
   - User views their bill requests and statuses
   - API Endpoints: 
     - `GET /blockchain/blockchain-bills/user/:userId`
     - `GET /blockchain/beneficiary-bills/:address`

4. **View Wallet Balance**
   - User can view their wallet balances (ETH, USDT, U2K)
   - API Endpoint: `GET /blockchain/wallets/:userId/balance`

### Benefactor (Sponsor) Flow

1. **Connect Wallet**
   - Sponsor connects their EVM-compatible wallet
   - System stores wallet address in database
   - API Endpoint: `POST /blockchain/wallets/:userId/connect`

2. **View Pending Requests**
   - Sponsor views pending bill requests directed to them
   - API Endpoints: 
     - `GET /blockchain/sponsors/:userId/bills` 
     - `GET /blockchain/sponsor-bills/:address`

3. **Review and Pay/Reject Bills**
   - Sponsor reviews bill details
   - Options to:
     - Pay bill with ETH: `POST /blockchain/blockchain-requests/:blockchainRequestId/pay-native`
     - Pay bill with U2K tokens: `POST /blockchain/blockchain-requests/:blockchainRequestId/pay-u2k`
     - Reject bill: `POST /blockchain/blockchain-requests/:blockchainRequestId/reject`
   - When paying, sponsor signs transaction with their connected wallet

4. **Receive Rewards**
   - After successful payment, sponsor receives U2K tokens as rewards
   - System automatically updates U2K balance in database
   - No separate API call needed - handled during payment process

5. **View Dashboard**
   - Sponsor views dashboard showing:
     - Pending bills
     - Completed bills with transaction hashes
     - Wallet balances (ETH, USDT, U2K)
   - API Endpoints:
     - `GET /blockchain/sponsors/:userId/bills`
     - `GET /blockchain/wallets/:userId/balance`
     - `GET /blockchain/sponsors/:sponsorAddress/metrics`

## Integration Guide for Frontend Developers

### Step 1: Connect to the Blockchain

First, you need to set up a web3 provider and connect to the blockchain:

```javascript
import { ethers } from "ethers";

// Check if MetaMask (or other wallet provider) is available
const connectBlockchain = async () => {
  if (window.ethereum) {
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      
      // Create Web3 Provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Check if user is on the correct network
      const network = await provider.getNetwork();
      if (network.chainId !== 84532) { // Base Sepolia Testnet
        alert("Please switch to Base Sepolia Testnet!");
        return null;
      }
      
      return {
        address: accounts[0],
        provider,
        signer: provider.getSigner()
      };
    } catch (error) {
      console.error("Error connecting to blockchain:", error);
      return null;
    }
  } else {
    alert("Please install MetaMask or another Ethereum wallet!");
    return null;
  }
};
```

### Step 2: Connect User Wallet to Backend

After connecting to the blockchain, connect the user's wallet to the backend:

```javascript
const connectWalletToBackend = async (userId, walletAddress) => {
  try {
    const response = await fetch(`/blockchain/wallets/${userId}/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${yourAuthToken}` // Include your auth token
      },
      body: JSON.stringify({ walletAddress }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log("Wallet connected successfully:", data.wallet);
      return data;
    } else {
      console.error("Error connecting wallet:", data.error);
      return null;
    }
  } catch (error) {
    console.error("Error connecting wallet to backend:", error);
    return null;
  }
};
```

### Step 3: Create a Blockchain Bill

To create a bill on the blockchain:

```javascript
const createBlockchainBill = async (sponsorId, paymentDestination, amount, description, userId) => {
  try {
    const response = await fetch("/blockchain/blockchain-bills", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${yourAuthToken}` // Include your auth token
      },
      body: JSON.stringify({
        sponsorId, // User ID of the sponsor, not wallet address
        paymentDestination, // Blockchain address
        amount,
        description,
        userId, // Optional: ID of the beneficiary user
        paymentType: "NATIVE" // or "U2K_TOKEN"
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log("Bill created successfully:", data);
      return data;
    } else {
      console.error("Error creating bill:", data.error);
      return null;
    }
  } catch (error) {
    console.error("Error creating blockchain bill:", error);
    return null;
  }
};
```

### Step 4: Pay a Bill

To pay a bill with native tokens (ETH):

```javascript
const payBillWithNative = async (blockchainRequestId, amount, signer) => {
  try {
    // Get the signer's address
    const address = await signer.getAddress();
    
    // Create a message to sign
    const message = `Pay bill ${blockchainRequestId} with ${amount} ETH`;
    
    // Sign the message
    const signature = await signer.signMessage(message);
    
    // Send to backend
    const response = await fetch(`/blockchain/blockchain-requests/${blockchainRequestId}/pay-native`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${yourAuthToken}` // Include your auth token
      },
      body: JSON.stringify({
        sponsorAddress: address,
        sponsorSignature: signature,
        amount
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log("Bill paid successfully:", data);
      return data;
    } else {
      console.error("Error paying bill:", data.error);
      return null;
    }
  } catch (error) {
    console.error("Error paying bill:", error);
    return null;
  }
};
```

To pay a bill with U2K tokens:

```javascript
const payBillWithU2K = async (blockchainRequestId, signer) => {
  try {
    // Get the signer's address
    const address = await signer.getAddress();
    
    // Create a message to sign
    const message = `Pay bill ${blockchainRequestId} with U2K tokens`;
    
    // Sign the message
    const signature = await signer.signMessage(message);
    
    // Send to backend
    const response = await fetch(`/blockchain/blockchain-requests/${blockchainRequestId}/pay-u2k`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${yourAuthToken}` // Include your auth token
      },
      body: JSON.stringify({
        sponsorAddress: address,
        sponsorSignature: signature
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log("Bill paid successfully with U2K:", data);
      return data;
    } else {
      console.error("Error paying bill with U2K:", data.error);
      return null;
    }
  } catch (error) {
    console.error("Error paying bill with U2K:", error);
    return null;
  }
};
```

### Step 5: Reject a Bill

To reject a bill:

```javascript
const rejectBill = async (blockchainRequestId, signer) => {
  try {
    // Get the signer's address
    const address = await signer.getAddress();
    
    // Create a message to sign
    const message = `Reject bill ${blockchainRequestId}`;
    
    // Sign the message
    const signature = await signer.signMessage(message);
    
    // Send to backend
    const response = await fetch(`/blockchain/blockchain-requests/${blockchainRequestId}/reject`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${yourAuthToken}` // Include your auth token
      },
      body: JSON.stringify({
        sponsorAddress: address,
        sponsorSignature: signature
      }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log("Bill rejected successfully:", data);
      return data;
    } else {
      console.error("Error rejecting bill:", data.error);
      return null;
    }
  } catch (error) {
    console.error("Error rejecting bill:", error);
    return null;
  }
};
```

## Example Implementation

Here's a React component example to connect a wallet and display balance:

```jsx
import React, { useState } from 'react';
import { ethers } from 'ethers';

const BlockchainWallet = ({ userId, authToken }) => {
  const [wallet, setWallet] = useState(null);
  const [balances, setBalances] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const connectWallet = async () => {
    setIsConnecting(true);
    
    try {
      // Check if MetaMask is installed
      if (!window.ethereum) {
        alert('Please install MetaMask to use blockchain features!');
        setIsConnecting(false);
        return;
      }
      
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      
      // Create provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      
      // Connect to backend
      const response = await fetch(`/blockchain/wallets/${userId}/connect`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ walletAddress: address })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWallet(data.wallet);
        setBalances(data.balances);
      } else {
        alert(`Error connecting wallet: ${data.error}`);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet. See console for details.');
    } finally {
      setIsConnecting(false);
    }
  };
  
  return (
    <div>
      <h2>Blockchain Wallet</h2>
      
      {!wallet ? (
        <button onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div>
          <p><strong>Wallet Address:</strong> {wallet.address}</p>
          {balances && (
            <div>
              <p><strong>ETH Balance:</strong> {balances.ETH}</p>
              <p><strong>U2K Balance:</strong> {balances.U2K}</p>
              {balances.USDT && <p><strong>USDT Balance:</strong> {balances.USDT}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockchainWallet;
```

## Troubleshooting

1. **Wrong Network**: Ensure you're connected to Base Sepolia Testnet (Chain ID: 84532).

2. **MetaMask Configuration**:
   - Add Base Sepolia to MetaMask with these details:
     - Network Name: Base Sepolia
     - RPC URL: https://base-sepolia.g.alchemy.com/v2/E8dbOUE0UW0805txb2tZSsK7icYnHDm7/
     - Chain ID: 84532
     - Symbol: ETH
     - Block Explorer: https://sepolia-explorer.base.org/

3. **Get Test ETH**: Visit the Base Sepolia faucet to get test ETH: https://www.base.org/developer/docs/guides/sepolia-faucet

4. **Add U2K Token to MetaMask**: 
   - Click 'Import tokens' in MetaMask
   - Enter token contract address: 0x6CC3eD7c089a866f822Cc7182C30A07c75647eDA
   - Symbol: U2K
   - Decimals: 18

5. **Authentication Issues**: Make sure you're including the correct authentication token in your API requests.

For additional support, please contact the backend development team. 