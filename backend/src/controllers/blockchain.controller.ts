import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import blockchainService from '../services/blockchain.service';
import { ethers } from 'ethers';

const prisma = new PrismaClient();

export const createWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    // Return a message directing users to connect existing wallets
    res.status(400).json({ 
      error: 'Wallet creation is not supported', 
      message: 'Please use connectExistingWallet endpoint to connect your existing wallet address instead' 
    });
  } catch (error) {
    console.error('Error in createWallet:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const getWalletBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Get user wallet
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { userId }
    });

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    // Get token balance
    const balance = await blockchainService.getTokenBalance(wallet.address);

    res.status(200).json({ 
      address: wallet.address,
      balance
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({ error: 'Failed to get wallet balance' });
  }
};

export const connectExistingWallet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { walletAddress } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    if (!walletAddress) {
      res.status(400).json({ error: 'Wallet address is required' });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Connect existing wallet
    const wallet = await blockchainService.connectExistingWallet(userId, walletAddress);

    // Get wallet balances
    const ethBalance = await blockchainService.getEthBalance(walletAddress);
    const usdtBalance = await blockchainService.getTokenBalance(walletAddress, 'USDT');
    const u2kBalance = await blockchainService.getTokenBalance(walletAddress, 'U2K');

    // Get sponsor metrics if user is a benefactor
    const metrics = {
      pendingRequests: 0,
      completedRequests: 0,
      rejectedRequests: 0,
      totalRequests: 0,
      totalRewards: parseFloat(u2kBalance)
    };

    // Get blockchain metrics if user is a benefactor
    if (user.role === 'BENEFACTOR') {
      try {
        // Get blockchain bills from the blockchain
        const blockchainBillIds = await blockchainService.getSponsorBills(walletAddress);
        
        // Get the corresponding requests from our database
        const blockchainRequests = await prisma.blockchainRequest.findMany({
          where: {
            blockchainBillId: {
              in: blockchainBillIds
            }
          }
        });
        
        metrics.pendingRequests = blockchainRequests.filter(request => request.status === 'PENDING').length;
        metrics.completedRequests = blockchainRequests.filter(request => request.status === 'CONFIRMED').length;
        metrics.rejectedRequests = blockchainRequests.filter(request => request.status === 'REJECTED').length;
        metrics.totalRequests = metrics.pendingRequests + metrics.completedRequests + metrics.rejectedRequests;
      } catch (error) {
        console.error('Error fetching blockchain metrics:', error);
      }
    }

    res.status(200).json({
      success: true,
      wallet,
      balances: {
        ETH: ethBalance,
        USDT: usdtBalance,
        U2K: u2kBalance
      },
      metrics,
      message: 'Existing wallet connected successfully'
    });
  } catch (error: any) {
    console.error('Error connecting existing wallet:', error);
    res.status(500).json({ error: error.message || 'Failed to connect existing wallet' });
  }
};

export const createBillRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { billId } = req.params;
    const { beneficiaryAddress, sponsorAddress, paymentDestination, amount, description } = req.body;

    if (!billId || !beneficiaryAddress || !sponsorAddress || !paymentDestination || !amount) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Validate the bill exists
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        user: true,
        provider: true
      }
    });

    if (!bill) {
      res.status(404).json({ error: 'Bill not found' });
      return;
    }

    // For security, verify both addresses are valid
    if (!ethers.utils.isAddress(beneficiaryAddress) || !ethers.utils.isAddress(sponsorAddress)) {
      res.status(400).json({ error: 'Invalid wallet address provided' });
      return;
    }
    
    // Find the sponsor user by wallet address
    const sponsorWallet = await prisma.cryptoWallet.findUnique({
      where: { address: sponsorAddress },
      include: { user: true }
    });

    if (!sponsorWallet) {
      // Create a temporary wallet record if sponsor doesn't exist in our system yet
      console.log(`Sponsor wallet ${sponsorAddress} not found in database, proceeding without user connection`);
    }

    try {
      // Create bill request on blockchain
      const result = await blockchainService.createBillRequest(
        billId,
        beneficiaryAddress,
        sponsorAddress,
        paymentDestination,
        amount,
        description
      );

      // Remove notification creation

      res.status(201).json({ 
        success: true, 
        transactionHash: result.transactionHash,
        blockchainBillId: result.blockchainBillId,
        message: 'Bill request created successfully on blockchain'
      });
    } catch (error: any) {
      console.error('Error in blockchain operation:', error);
      res.status(500).json({ 
        error: 'Failed to create bill request',
        details: error.message || 'Unknown blockchain error' 
      });
    }
  } catch (error: any) {
    console.error('Error handling bill request:', error);
    res.status(500).json({ error: 'Failed to create bill request' });
  }
};

/**
 * Create a blockchain bill directly, without requiring a separate bill record first
 */
export const createBlockchainBillDirect = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      sponsorId, // Use sponsorId instead of sponsorAddress
      paymentDestination, 
      amount, 
      description,
      userId, // Optional: connect to a user if available
      paymentType = 'NATIVE' // Optional: specify payment type (NATIVE for ETH or U2K_TOKEN)
    } = req.body;

    if (!sponsorId || !paymentDestination || !amount || !description) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    try {
      // First check if a valid user exists or create a test user
      let user;
      
      if (userId) {
        // If userId is provided, verify it exists
        user = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (!user) {
          res.status(400).json({ error: 'Provided userId does not exist' });
          return;
        }
      } else {
        // Find or create a test user for blockchain bills
        user = await prisma.user.findFirst();
        
        if (!user) {
          // Create a test user if none exists
          user = await prisma.user.create({
            data: {
              email: `blockchain-user-${Date.now()}@example.com`,
              name: 'Blockchain User',
              role: 'BENEFACTEE'
            }
          });
        }
      }

      // Get the beneficiary's wallet (automatically use the user's wallet)
      const beneficiaryWallet = await prisma.cryptoWallet.findUnique({
        where: { userId: user.id }
      });

      if (!beneficiaryWallet) {
        res.status(400).json({ error: 'Beneficiary does not have a wallet. Please connect one first.' });
        return;
      }

      // Get the sponsor's wallet using sponsorId
      const sponsorWallet = await prisma.cryptoWallet.findUnique({
        where: { userId: sponsorId }
      });

      if (!sponsorWallet) {
        res.status(400).json({ error: 'Sponsor does not have a wallet or does not exist.' });
        return;
      }

      // Validate amount format
      let parsedAmount: number;
      try {
        parsedAmount = parseFloat(amount.toString());
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
          throw new Error('Invalid amount');
        }
      } catch (error) {
        res.status(400).json({ error: 'Amount must be a positive number' });
        return;
      }

      // Create bill record in the database with valid userId
      const bill = await prisma.bill.create({
        data: {
          description,
          type: "BLOCKCHAIN",
          billName: "Blockchain Bill",
          amount: parsedAmount,
          status: "PENDING" as any,
          category: "BLOCKCHAIN",
          user: {
            connect: {
              id: user.id
            }
          }
        } as any
      });

      // Create bill request on blockchain
      const result = await blockchainService.createBillRequest(
        bill.id,
        beneficiaryWallet.address, // Use the beneficiary's wallet address
        sponsorWallet.address, // Use the sponsor's wallet address
        paymentDestination,
        parsedAmount,
        description
      );

      // Get the blockchain request that was created
      const blockchainRequest = await prisma.blockchainRequest.findUnique({
        where: { billId: bill.id }
      });

      // Update the payment type if specified
      if (blockchainRequest && paymentType === 'U2K_TOKEN') {
        await prisma.blockchainRequest.update({
          where: { id: blockchainRequest.id },
          data: { paymentType: 'U2K_TOKEN' }
        });
      }

      // Get the updated blockchain request
      const updatedRequest = await prisma.blockchainRequest.findUnique({
        where: { billId: bill.id }
      });

      res.status(201).json({ 
        success: true, 
        bill,
        blockchainRequest: updatedRequest,
        transactionHash: result.transactionHash,
        blockchainBillId: result.blockchainBillId,
        message: 'Blockchain bill created successfully'
      });
    } catch (error: any) {
      console.error('Error in blockchain operation:', error);
      res.status(500).json({ 
        error: 'Failed to create blockchain bill',
        details: error.message || 'Unknown blockchain error' 
      });
    }
  } catch (error: any) {
    console.error('Error creating blockchain bill:', error);
    res.status(500).json({ error: 'Failed to create blockchain bill' });
  }
};

export const payBillWithNative = async (req: Request, res: Response): Promise<void> => {
  try {
    const { blockchainRequestId } = req.params;
    const { sponsorAddress, sponsorSignature, amount } = req.body;
    
    // We're now accepting a signature from the connected wallet instead of directly taking private key
    if (!blockchainRequestId || !sponsorSignature || !sponsorAddress || !amount) {
      res.status(400).json({ error: 'Missing required fields: blockchainRequestId, sponsorAddress, sponsorSignature, and amount are all required' });
      return;
    }

    // Get blockchain request
    const blockchainRequest = await prisma.blockchainRequest.findUnique({
      where: { id: blockchainRequestId },
      include: {
        bill: true
      }
    });

    if (!blockchainRequest) {
      res.status(404).json({ error: 'Blockchain request not found' });
      return;
    }
    
    if (!blockchainRequest.blockchainBillId) {
      res.status(400).json({ error: 'Blockchain bill ID not found. The bill may not have been properly created on the blockchain.' });
      return;
    }
    
    console.log(`Using blockchain bill ID: ${blockchainRequest.blockchainBillId}`);
    
    // Ensure we're using a numeric ID for the blockchain call
    // This is crucial as the blockchain contract expects a numeric ID, not a UUID
    let numericBillId: string;
    
    try {
      // Try to use the stored blockchainBillId directly
      numericBillId = blockchainRequest.blockchainBillId;
      
      // Verify it's actually a number
      if (isNaN(Number(numericBillId))) {
        console.warn(`Invalid numeric ID: ${numericBillId}, using fallback ID 1`);
        numericBillId = "1"; // Fallback to ID 1 for testing
      }
    } catch (error) {
      console.warn(`Error processing blockchain bill ID: ${error}, using fallback ID 1`);
      numericBillId = "1"; // Fallback to ID 1 for testing
    }
    
    // Pay bill with native tokens using the numeric blockchain bill ID
    // Now using sponsor address and signature instead of private key
    const transactionHash = await blockchainService.processBillPaymentWithNative(
      numericBillId,
      sponsorAddress,
      sponsorSignature,
      amount
    );

    // Update database status
    await prisma.blockchainRequest.update({
      where: { id: blockchainRequestId },
      data: { 
        status: 'CONFIRMED',
        transactionHash
      }
    });

    // Update bill status
    await prisma.bill.update({
      where: { id: blockchainRequest.bill.id },
      data: { 
        status: "REJECTED" as any 
      }
    });

    // Update sponsor's U2K token balance by getting the actual blockchain balance
    try {
      // Find the database wallet record matching this address
      const dbWallet = await prisma.cryptoWallet.findUnique({
        where: { address: sponsorAddress }
      });
      
      if (dbWallet) {
        // Get the actual blockchain token balance
        const actualTokenBalance = await blockchainService.getTokenBalance(sponsorAddress);
        const balanceAsFloat = parseFloat(actualTokenBalance);
        
        // Update the database to match the blockchain
        await prisma.cryptoWallet.update({
          where: { id: dbWallet.id },
          data: { 
            u2kBalance: balanceAsFloat
          }
        });
        
        console.log(`Updated sponsor wallet with actual balance: ${balanceAsFloat} U2K tokens`);
      } else {
        console.warn(`Could not find wallet record for address: ${sponsorAddress}`);
      }
    } catch (rewardError) {
      // Log but don't fail the transaction if reward fails
      console.error('Error syncing sponsor token balance:', rewardError);
    }

    res.status(200).json({ 
      success: true, 
      transactionHash,
      message: 'Bill paid successfully with native tokens'
    });
  } catch (error) {
    console.error('Error paying bill with native tokens:', error);
    res.status(500).json({ error: 'Failed to pay bill with native tokens' });
  }
};

export const payBillWithU2K = async (req: Request, res: Response): Promise<void> => {
  try {
    const { blockchainRequestId } = req.params;
    const { sponsorAddress, sponsorSignature } = req.body;

    if (!blockchainRequestId || !sponsorSignature || !sponsorAddress) {
      res.status(400).json({ error: 'Missing required fields: blockchainRequestId, sponsorAddress, and sponsorSignature are all required' });
      return;
    }

    // Get blockchain request
    const blockchainRequest = await prisma.blockchainRequest.findUnique({
      where: { id: blockchainRequestId },
      include: {
        bill: true
      }
    });

    if (!blockchainRequest) {
      res.status(404).json({ error: 'Blockchain request not found' });
      return;
    }

    if (!blockchainRequest.blockchainBillId) {
      res.status(400).json({ error: 'Blockchain bill ID not found. The bill may not have been properly created on the blockchain.' });
      return;
    }
    
    console.log(`Using blockchain bill ID: ${blockchainRequest.blockchainBillId}`);

    // Ensure we're using a numeric ID for the blockchain call
    // This is crucial as the blockchain contract expects a numeric ID, not a UUID
    let numericBillId: string;
    
    try {
      // Try to use the stored blockchainBillId directly
      numericBillId = blockchainRequest.blockchainBillId;
      
      // Verify it's actually a number
      if (isNaN(Number(numericBillId))) {
        console.warn(`Invalid numeric ID: ${numericBillId}, using fallback ID 1`);
        numericBillId = "1"; // Fallback to ID 1 for testing
      }
    } catch (error) {
      console.warn(`Error processing blockchain bill ID: ${error}, using fallback ID 1`);
      numericBillId = "1"; // Fallback to ID 1 for testing
    }

    // Pay bill with U2K tokens using the numeric blockchain bill ID
    const transactionHash = await blockchainService.processBillPaymentWithU2K(
      numericBillId,
      sponsorAddress,
      sponsorSignature
    );

    // Update database status
    await prisma.blockchainRequest.update({
      where: { id: blockchainRequestId },
      data: { 
        status: 'CONFIRMED',
        transactionHash,
        paymentType: 'U2K_TOKEN'
      }
    });

    // Update bill status
    await prisma.bill.update({
      where: { id: blockchainRequest.bill.id },
      data: { 
        status: "REJECTED" as any 
      }
    });

    // Update sponsor's U2K token balance by getting the actual blockchain balance
    try {
      // Find the database wallet record matching this address
      const dbWallet = await prisma.cryptoWallet.findUnique({
        where: { address: sponsorAddress }
      });
      
      if (dbWallet) {
        // Get the actual blockchain token balance
        const actualTokenBalance = await blockchainService.getTokenBalance(sponsorAddress);
        const balanceAsFloat = parseFloat(actualTokenBalance);
        
        // Update the database to match the blockchain
        await prisma.cryptoWallet.update({
          where: { id: dbWallet.id },
          data: { 
            u2kBalance: balanceAsFloat
          }
        });
        
        console.log(`Updated sponsor wallet with actual balance: ${balanceAsFloat} U2K tokens`);
      } else {
        console.warn(`Could not find wallet record for address: ${sponsorAddress}`);
      }
    } catch (rewardError) {
      // Log but don't fail the transaction if reward fails
      console.error('Error syncing sponsor token balance:', rewardError);
    }

    res.status(200).json({ 
      success: true, 
      transactionHash,
      message: 'Bill paid successfully with U2K tokens'
    });
  } catch (error) {
    console.error('Error paying bill with U2K tokens:', error);
    res.status(500).json({ error: 'Failed to pay bill with U2K tokens' });
  }
};

export const rejectBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { blockchainRequestId } = req.params;
    const { sponsorAddress, sponsorSignature } = req.body;

    if (!blockchainRequestId || !sponsorAddress || !sponsorSignature) {
      res.status(400).json({ error: 'Missing required fields: blockchainRequestId, sponsorAddress, and sponsorSignature' });
      return;
    }

    // Get blockchain request
    const blockchainRequest = await prisma.blockchainRequest.findUnique({
      where: { id: blockchainRequestId },
      include: {
        bill: true
      }
    });

    if (!blockchainRequest) {
      res.status(404).json({ error: 'Blockchain request not found' });
      return;
    }

    if (!blockchainRequest.blockchainBillId) {
      res.status(400).json({ error: 'Blockchain bill ID not found. The bill may not have been properly created on the blockchain.' });
      return;
    }
    
    console.log(`Using blockchain bill ID: ${blockchainRequest.blockchainBillId}`);

    // Ensure we're using a numeric ID for the blockchain call
    // This is crucial as the blockchain contract expects a numeric ID, not a UUID
    let numericBillId: string;
    
    try {
      // Try to use the stored blockchainBillId directly
      numericBillId = blockchainRequest.blockchainBillId;
      
      // Verify it's actually a number
      if (isNaN(Number(numericBillId))) {
        console.warn(`Invalid numeric ID: ${numericBillId}, using fallback ID 1`);
        numericBillId = "1"; // Fallback to ID 1 for testing
      }
    } catch (error) {
      console.warn(`Error processing blockchain bill ID: ${error}, using fallback ID 1`);
      numericBillId = "1"; // Fallback to ID 1 for testing
    }

    // Reject bill using the numeric blockchain bill ID and signature
    const transactionHash = await blockchainService.rejectBillWithSignature(
      numericBillId,
      sponsorAddress,
      sponsorSignature
    );

    // Update database status
    await prisma.blockchainRequest.update({
      where: { id: blockchainRequestId },
      data: { 
        status: 'REJECTED',
        transactionHash
      }
    });

    // Update the bill status to reflect rejection
    await prisma.bill.update({
      where: { id: blockchainRequest.bill.id },
      data: { 
        status: "REJECTED" as any 
      }
    });

    res.status(200).json({ 
      success: true, 
      transactionHash,
      message: 'Bill rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting bill:', error);
    res.status(500).json({ error: 'Failed to reject bill' });
  }
};

export const getBillDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { blockchainBillId } = req.params;

    if (!blockchainBillId) {
      res.status(400).json({ error: 'Blockchain bill ID is required' });
      return;
    }

    // Get bill details from blockchain
    const bill = await blockchainService.getBillDetails(blockchainBillId);

    res.status(200).json(bill);
  } catch (error) {
    console.error('Error getting bill details:', error);
    res.status(500).json({ error: 'Failed to get bill details' });
  }
};

export const getBeneficiaryBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    if (!address) {
      res.status(400).json({ error: 'Beneficiary address is required' });
      return;
    }

    // Get beneficiary bills from blockchain
    const bills = await blockchainService.getBeneficiaryBills(address);

    res.status(200).json({ bills });
  } catch (error) {
    console.error('Error getting beneficiary bills:', error);
    res.status(500).json({ error: 'Failed to get beneficiary bills' });
  }
};

// Update getSponsorBills to use blockchain service directly
export const getSponsorBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    if (!address) {
      res.status(400).json({ error: 'Wallet address is required' });
      return;
    }

    // Find user by wallet address
    const wallet = await prisma.cryptoWallet.findUnique({
      where: { address },
      include: { user: true }
    });

    if (!wallet) {
      res.status(404).json({ error: 'Wallet not found' });
      return;
    }

    // Get bills directly from blockchain
    const blockchainBillIds = await blockchainService.getSponsorBills(address);
    
    // Get all blockchain requests that match these IDs
    const allBills = await prisma.blockchainRequest.findMany({
      where: {
        blockchainBillId: {
          in: blockchainBillIds
        }
      },
      include: {
        bill: {
          include: {
            user: true
          }
        }
      }
    });
    
    // Filter by status
    const pendingBills = allBills.filter(bill => bill.status === 'PENDING');
    const completedBills = allBills.filter(bill => bill.status === 'CONFIRMED');
    const rejectedBills = allBills.filter(bill => bill.status === 'REJECTED');

    // Get wallet balances
    const ethBalance = await blockchainService.getEthBalance(address);
    const usdtBalance = await blockchainService.getTokenBalance(address, 'USDT');
    const u2kBalance = await blockchainService.getTokenBalance(address, 'U2K');
    
    // Calculate total requests
    const totalRequests = pendingBills.length + completedBills.length + rejectedBills.length;
    
    res.status(200).json({
      pendingBills,
      completedBills,
      rejectedBills,
      metrics: {
        pendingRequests: pendingBills.length,
        completedRequests: completedBills.length,
        rejectedRequests: rejectedBills.length,
        totalRequests,
        totalRewards: parseFloat(u2kBalance)
      },
      balances: {
        ETH: ethBalance,
        USDT: usdtBalance,
        U2K: u2kBalance
      }
    });
  } catch (error) {
    console.error('Error getting sponsor bills:', error);
    res.status(500).json({ error: 'Failed to get sponsor bills' });
  }
};

/**
 * Get bills for a sponsor by userId
 */
export const getSponsorBillsByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: 'Sponsor userId is required' });
      return;
    }

    // Get the sponsor's wallet
    const sponsorWallet = await prisma.cryptoWallet.findUnique({
      where: { userId }
    });

    if (!sponsorWallet) {
      res.status(404).json({ error: 'Sponsor wallet not found' });
      return;
    }

    // Get blockchain bills for this sponsor from the blockchain
    const billIds = await blockchainService.getSponsorBills(sponsorWallet.address);
    
    // Now get the detailed bills from our database
    const blockchainRequests = await prisma.blockchainRequest.findMany({
      where: {
        blockchainBillId: {
          in: billIds
        }
      },
      include: {
        bill: {
          include: {
            user: true
          }
        }
      }
    });

    res.status(200).json({ 
      sponsorAddress: sponsorWallet.address,
      billIds,
      bills: blockchainRequests
    });
  } catch (error) {
    console.error('Error getting sponsor bills:', error);
    res.status(500).json({ error: 'Failed to get sponsor bills' });
  }
};

/**
 * Get all blockchain bills from the database
 */
export const getBlockchainBills = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all blockchain requests from the database
    const blockchainRequests = await prisma.blockchainRequest.findMany({
      include: {
        bill: true
      }
    });

    res.status(200).json({ blockchainRequests });
  } catch (error) {
    console.error('Error getting blockchain bills:', error);
    res.status(500).json({ error: 'Failed to get blockchain bills' });
  }
};

/**
 * Get blockchain bills for a specific user
 */
export const getUserBlockchainBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Get user's bills that have blockchain requests
    const bills = await prisma.bill.findMany({
      where: {
        userId,
        category: 'BLOCKCHAIN',
        blockchainRequest: {
          isNot: null
        }
      },
      include: {
        blockchainRequest: true
      }
    });

    res.status(200).json({ bills });
  } catch (error) {
    console.error('Error getting user blockchain bills:', error);
    res.status(500).json({ error: 'Failed to get user blockchain bills' });
  }
};

/**
 * Sync all wallet balances with blockchain data
 */
export const syncWalletBalances = async (req: Request, res: Response): Promise<void> => {
  try {
    await blockchainService.syncWalletBalances();
    
    res.status(200).json({
      success: true,
      message: 'All wallet balances synchronized with blockchain data'
    });
  } catch (error) {
    console.error('Error syncing wallet balances:', error);
    res.status(500).json({ error: 'Failed to sync wallet balances' });
  }
};

/**
 * Get all sponsors (users with wallets)
 */
export const getSponsors = async (req: Request, res: Response): Promise<void> => {
  try {
    // Find all users that have a crypto wallet and are BENEFACTORS
    const sponsors = await prisma.user.findMany({
      where: {
        cryptoWallet: {
          isNot: null
        },
        role: 'BENEFACTOR'
      },
      include: {
        cryptoWallet: {
          select: {
            address: true,
            u2kBalance: true
          }
        }
      }
    });

    res.status(200).json({ sponsors });
  } catch (error) {
    console.error('Error getting sponsors:', error);
    res.status(500).json({ error: 'Failed to get sponsors' });
  }
};

// Replace notification functions with empty implementations
export const getBlockchainNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Return empty notifications array
    res.status(200).json({ notifications: [] });
  } catch (error) {
    console.error('Error getting blockchain notifications:', error);
    res.status(500).json({ error: 'Failed to get blockchain notifications' });
  }
};

export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Just return success
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

export const getSponsorMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sponsorAddress } = req.params;

    if (!sponsorAddress || !ethers.utils.isAddress(sponsorAddress)) {
      res.status(400).json({ error: 'Valid sponsor address is required' });
      return;
    }

    // Get the sponsor wallet from the database
    const sponsorWallet = await prisma.cryptoWallet.findUnique({
      where: { address: sponsorAddress },
      include: { user: true }
    });

    // Get wallet balances
    const ethBalance = await blockchainService.getEthBalance(sponsorAddress);
    const usdtBalance = await blockchainService.getTokenBalance(sponsorAddress, 'USDT');
    const u2kBalance = await blockchainService.getTokenBalance(sponsorAddress, 'U2K');

    // Get blockchain metrics 
    let pendingRequests = 0;
    let completedRequests = 0;
    let rejectedRequests = 0;

    try {
      // Get blockchain bills from the blockchain
      const blockchainBillIds = await blockchainService.getSponsorBills(sponsorAddress);
      
      // Get the corresponding requests from our database
      const blockchainRequests = await prisma.blockchainRequest.findMany({
        where: {
          blockchainBillId: {
            in: blockchainBillIds
          }
        }
      });
      
      pendingRequests = blockchainRequests.filter(request => request.status === 'PENDING').length;
      completedRequests = blockchainRequests.filter(request => request.status === 'CONFIRMED').length;
      rejectedRequests = blockchainRequests.filter(request => request.status === 'REJECTED').length;
    } catch (error) {
      console.error('Error fetching blockchain metrics:', error);
    }

    // Calculate total requests
    const totalRequests = pendingRequests + completedRequests + rejectedRequests;
    
    // Return the metrics and balances
    res.status(200).json({
      success: true,
      balances: {
        ETH: ethBalance,
        USDT: usdtBalance,
        U2K: u2kBalance
      },
      metrics: {
        pendingRequests,
        completedRequests,
        rejectedRequests,
        totalRequests,
        totalRewards: parseFloat(u2kBalance)
      }
    });
  } catch (error: any) {
    console.error('Error getting sponsor metrics:', error);
    res.status(500).json({ error: error.message || 'Failed to get sponsor metrics' });
  }
}; 