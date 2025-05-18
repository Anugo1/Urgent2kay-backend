import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';
import { 
  BLOCKCHAIN_CONFIG, 
  U2K_TOKEN_ABI, 
  BILL_PAYMENT_SYSTEM_ABI,
  ERC20_ABI
} from '../config/blockchain';

const prisma = new PrismaClient();

export class BlockchainService {
  public provider: ethers.providers.JsonRpcProvider;
  public billPaymentContract: ethers.Contract;
  private wallet: ethers.Wallet;
  private tokenContract: ethers.Contract;
  private usdtContract?: ethers.Contract;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(BLOCKCHAIN_CONFIG.RPC_URL);
    
    if (!BLOCKCHAIN_CONFIG.PRIVATE_KEY) {
      throw new Error('Blockchain private key not configured');
    }

    this.wallet = new ethers.Wallet(BLOCKCHAIN_CONFIG.PRIVATE_KEY, this.provider);
    
    if (!BLOCKCHAIN_CONFIG.TOKEN_CONTRACT_ADDRESS) {
      throw new Error('Token contract address not configured');
    }
    
    if (!BLOCKCHAIN_CONFIG.BILL_PAYMENT_CONTRACT_ADDRESS) {
      throw new Error('Bill payment contract address not configured');
    }

    this.tokenContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.TOKEN_CONTRACT_ADDRESS,
      U2K_TOKEN_ABI,
      this.wallet
    );

    // Initialize USDT contract if available
    if (BLOCKCHAIN_CONFIG.USDT_CONTRACT_ADDRESS) {
      this.usdtContract = new ethers.Contract(
        BLOCKCHAIN_CONFIG.USDT_CONTRACT_ADDRESS,
        ERC20_ABI,
        this.wallet
      );
    }

    this.billPaymentContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.BILL_PAYMENT_CONTRACT_ADDRESS,
      BILL_PAYMENT_SYSTEM_ABI,
      this.wallet
    );
  }

  /**
   * Create a new CryptoWallet is deprecated - Only support connecting existing wallets
   */
  async createUserWallet(userId: string): Promise<any> {
    throw new Error('Wallet creation is not supported. Please use connectExistingWallet instead.');
  }

  /**
   * Connect an existing wallet to a user
   */
  async connectExistingWallet(userId: string, walletAddress: string): Promise<any> {
    // Check if the user already has a wallet
    const existingUserWallet = await prisma.cryptoWallet.findUnique({
      where: { userId }
    });

    if (existingUserWallet) {
      throw new Error('User already has a wallet connected');
    }

    // Check if the wallet address is already in use
    const existingWallet = await prisma.cryptoWallet.findUnique({
      where: { address: walletAddress }
    });

    if (existingWallet) {
      throw new Error('Wallet address is already connected to another user');
    }

    // Verify the wallet address is valid
    if (!ethers.utils.isAddress(walletAddress)) {
      throw new Error('Invalid Ethereum wallet address');
    }

    // Store the wallet in the database
    const wallet = await prisma.cryptoWallet.create({
      data: {
        userId,
        address: walletAddress,
      }
    });

    return wallet;
  }

  /**
   * Get native ETH balance for an address
   */
  async getEthBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error(`Error getting ETH balance for ${address}:`, error);
      return "0";
    }
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(address: string, tokenType = 'U2K'): Promise<string> {
    try {
      let balance;
      if (tokenType === 'USDT' && this.usdtContract) {
        balance = await this.usdtContract.balanceOf(address);
        return ethers.utils.formatUnits(balance, 6); // USDT typically has 6 decimals
      } else {
        // Default to U2K token
        balance = await this.tokenContract.balanceOf(address);
        return ethers.utils.formatUnits(balance, 18); // U2K token has 18 decimals
      }
    } catch (error) {
      console.error(`Error getting ${tokenType} balance for ${address}:`, error);
      return "0";
    }
  }

  /**
   * Synchronize all wallet balances with actual blockchain data
   */
  async syncWalletBalances(): Promise<void> {
    try {
      // Get all wallets from the database
      const wallets = await prisma.cryptoWallet.findMany();
      console.log(`Found ${wallets.length} wallets to synchronize`);
      
      // Update each wallet with its actual blockchain balance
      for (const wallet of wallets) {
        try {
          // Get the actual token balance from blockchain
          const actualBalance = await this.getTokenBalance(wallet.address);
          const balanceAsFloat = parseFloat(actualBalance);
          
          // Update the database record
          await prisma.cryptoWallet.update({
            where: { id: wallet.id },
            data: { u2kBalance: balanceAsFloat }
          });
          
          console.log(`Updated wallet ${wallet.address} with balance: ${balanceAsFloat} U2K`);
        } catch (error) {
          console.error(`Error syncing wallet ${wallet.address}:`, error);
          // Continue with other wallets even if one fails
          continue;
        }
      }
      
      console.log('Wallet balance synchronization completed');
    } catch (error) {
      console.error('Error synchronizing wallet balances:', error);
      throw error;
    }
  }

  /**
   * Create a bill payment request on the blockchain
   */
  async createBillRequest(
    billId: string,
    beneficiaryAddress: string,
    sponsorAddress: string,
    paymentDestination: string,
    amount: number,
    description: string
  ): Promise<{transactionHash: string, blockchainBillId: string}> {
    try {
      // Convert amount to wei (assuming 18 decimals)
      const amountInWei = ethers.utils.parseUnits(amount.toString(), 18);

      console.log(`Creating bill request with parameters:
        Beneficiary: ${beneficiaryAddress}
        Sponsor: ${sponsorAddress}
        Payment Destination: ${paymentDestination}
        Amount: ${amount} (${amountInWei.toString()} wei)
        Description: ${description}
      `);

      // Create transaction on blockchain
      const tx = await this.billPaymentContract.createBill(
        sponsorAddress,
        paymentDestination,
        amountInWei,
        description
      );

      console.log(`Transaction sent: ${tx.hash}`);

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`Transaction mined in block: ${receipt.blockNumber}`);

      // Find the BillCreated event
      const billCreatedEvent = receipt.events?.find(
        (event: ethers.Event) => event.event === 'BillCreated'
      );

      if (!billCreatedEvent) {
        throw new Error('Bill creation event not found');
      }

      // Get the blockchain bill ID
      const blockchainBillId = billCreatedEvent.args.billId.toString();
      console.log(`Blockchain bill ID created: ${blockchainBillId}`);

      // Prepare data for the database
      const data: any = {
        billId,
        transactionHash: receipt.transactionHash,
        status: 'CONFIRMED',
        amount,
        cryptoAmount: Number(ethers.utils.formatUnits(amountInWei, 18)),
        paymentType: 'NATIVE'
      };
      
      // Add the blockchain bill ID to the data object
      data.blockchainBillId = blockchainBillId;

      // Store in our database
      await prisma.blockchainRequest.create({ data });

      // Return both the transaction hash and blockchain bill ID
      return {
        transactionHash: receipt.transactionHash,
        blockchainBillId
      };
    } catch (error) {
      console.error('Error creating bill on blockchain:', error);
      throw error;
    }
  }

  /**
   * Pay bill with native tokens (ETH)
   */
  async payBillWithNative(
    blockchainBillId: string,
    sponsorPrivateKey: string,
    amount: string
  ): Promise<string> {
    try {
      // Create a wallet for the sponsor using their private key
      const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, this.provider);
      
      // Connect the contract with the sponsor's wallet
      const connectedContract = this.billPaymentContract.connect(sponsorWallet);

      // Pay the bill with native tokens (ETH)
      const tx = await connectedContract.payBillWithNative(blockchainBillId, {
        value: ethers.utils.parseEther(amount)
      });

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      return receipt.transactionHash;
    } catch (error) {
      console.error('Error paying bill with native tokens:', error);
      throw error;
    }
  }

  /**
   * Pay bill with U2K tokens
   */
  async payBillWithU2K(
    blockchainBillId: string,
    sponsorPrivateKey: string
  ): Promise<string> {
    try {
      // Create a signer from the sponsor's private key
      const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, this.provider);
      
      // Get the contract connected with the sponsor's wallet
      const sponsorContract = this.billPaymentContract.connect(sponsorWallet);
      
      // Call the contract method to pay the bill with U2K tokens
      const tx = await sponsorContract.payBillWithTokens(blockchainBillId);
      
      const receipt = await tx.wait();
      
      // Get the block timestamp for the transaction
      const block = await this.provider.getBlock(receipt.blockNumber);
      const timestamp = block.timestamp;
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error paying bill with U2K tokens:', error);
      throw error;
    }
  }

  /**
   * Reject a bill on the blockchain
   */
  async rejectBill(
    blockchainBillId: string,
    sponsorPrivateKey: string
  ): Promise<string> {
    try {
      // Create a wallet for the sponsor using their private key
      const sponsorWallet = new ethers.Wallet(sponsorPrivateKey, this.provider);
      
      // Connect the contract with the sponsor's wallet
      const connectedContract = this.billPaymentContract.connect(sponsorWallet);

      // Reject the bill
      const tx = await connectedContract.rejectBill(blockchainBillId);

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      return receipt.transactionHash;
    } catch (error) {
      console.error('Error rejecting bill:', error);
      throw error;
    }
  }

  /**
   * Reject a bill on the blockchain using a signature from the connected wallet
   */
  async rejectBillWithSignature(
    blockchainBillId: string,
    sponsorAddress: string,
    sponsorSignature: string
  ): Promise<string> {
    try {
      // Verify the signature is valid for this transaction
      const message = ethers.utils.solidityKeccak256(
        ['string', 'address'],
        [blockchainBillId, sponsorAddress]
      );
      
      const messageHash = ethers.utils.arrayify(message);
      const recoveredAddress = ethers.utils.verifyMessage(messageHash, sponsorSignature);
      
      if (recoveredAddress.toLowerCase() !== sponsorAddress.toLowerCase()) {
        throw new Error('Invalid signature for sponsor address');
      }
      
      // Use the server wallet to submit the transaction on behalf of the user
      const tx = await this.billPaymentContract.rejectBillOnBehalf(
        blockchainBillId,
        sponsorAddress,
        sponsorSignature
      );
      
      const receipt = await tx.wait();
      
      // Find the blockchain request for this bill
      const request = await prisma.blockchainRequest.findFirst({
        where: { blockchainBillId }
      });
      
      // Store this transaction in our database
      // Find a wallet record for our service wallet
      const serviceWallet = await prisma.cryptoWallet.findFirst({
        where: { address: this.wallet.address }
      });
      
      if (serviceWallet && request) {
        await prisma.blockchainTransaction.create({
          data: {
            transactionHash: receipt.transactionHash,
            from: this.wallet.address,
            to: BLOCKCHAIN_CONFIG.BILL_PAYMENT_CONTRACT_ADDRESS,
            amount: 0, // No ETH was sent
            status: 'REJECTED',
            cryptoWalletId: serviceWallet.id,
            blockchainRequestId: request.id
          }
        });
        
        // Update the blockchain request status
        await prisma.blockchainRequest.update({
          where: { id: request.id },
          data: { status: 'REJECTED' }
        });
      }
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error rejecting bill with signature:', error);
      throw error;
    }
  }

  /**
   * Get bill details from the blockchain
   */
  async getBillDetails(blockchainBillId: string): Promise<any> {
    try {
      const bill = await this.billPaymentContract.getBill(blockchainBillId);
      return {
        id: bill.id.toString(),
        beneficiary: bill.beneficiary,
        paymentDestination: bill.paymentDestination,
        sponsor: bill.sponsor,
        amount: ethers.utils.formatUnits(bill.amount, 18),
        description: bill.description,
        status: ['PENDING', 'PAID', 'REJECTED'][bill.status], // Map numeric status to string
        createdAt: new Date(bill.createdAt.toNumber() * 1000),
        paidAt: bill.paidAt.toNumber() > 0 ? new Date(bill.paidAt.toNumber() * 1000) : null
      };
    } catch (error) {
      console.error('Error getting bill details:', error);
      throw error;
    }
  }

  /**
   * Get bills for a beneficiary
   */
  async getBeneficiaryBills(beneficiaryAddress: string): Promise<string[]> {
    try {
      const bills = await this.billPaymentContract.getBeneficiaryBills(beneficiaryAddress);
      return bills.map((id: ethers.BigNumber) => id.toString());
    } catch (error) {
      console.error('Error getting beneficiary bills:', error);
      throw error;
    }
  }

  /**
   * Get bills for a sponsor
   */
  async getSponsorBills(sponsorAddress: string): Promise<string[]> {
    try {
      const bills = await this.billPaymentContract.getSponsorBills(sponsorAddress);
      return bills.map((id: ethers.BigNumber) => id.toString());
    } catch (error) {
      console.error('Error getting sponsor bills:', error);
      throw error;
    }
  }

  /**
   * Process a bill payment using a signature from the connected wallet
   * This approach allows users to sign transactions with their wallet without exposing private keys
   */
  async processBillPaymentWithNative(
    blockchainBillId: string,
    sponsorAddress: string,
    sponsorSignature: string,
    amount: string
  ): Promise<string> {
    try {
      // Verify the signature is valid for this transaction
      const message = ethers.utils.solidityKeccak256(
        ['string', 'uint256', 'address'],
        [blockchainBillId, ethers.utils.parseEther(amount), sponsorAddress]
      );
      
      const messageHash = ethers.utils.arrayify(message);
      const recoveredAddress = ethers.utils.verifyMessage(messageHash, sponsorSignature);
      
      if (recoveredAddress.toLowerCase() !== sponsorAddress.toLowerCase()) {
        throw new Error('Invalid signature for sponsor address');
      }
      
      // Use the server wallet to submit the transaction on behalf of the user
      // This ensures the transaction can be processed without requiring gas from the user
      const tx = await this.billPaymentContract.payBillWithEthOnBehalf(
        blockchainBillId,
        sponsorAddress,
        sponsorSignature,
        { value: ethers.utils.parseEther(amount) }
      );
      
      const receipt = await tx.wait();
      
      // Find the blockchain request for this bill
      const request = await prisma.blockchainRequest.findFirst({
        where: { blockchainBillId }
      });
      
      // Store this transaction in our database
      // Find a wallet record for our service wallet
      const serviceWallet = await prisma.cryptoWallet.findFirst({
        where: { address: this.wallet.address }
      });
      
      if (serviceWallet && request) {
        await prisma.blockchainTransaction.create({
          data: {
            transactionHash: receipt.transactionHash,
            from: this.wallet.address,
            to: BLOCKCHAIN_CONFIG.BILL_PAYMENT_CONTRACT_ADDRESS,
            amount: parseFloat(amount),
            status: 'CONFIRMED',
            cryptoWalletId: serviceWallet.id,
            blockchainRequestId: request.id
          }
        });
      }
      
      if (request) {
        await prisma.blockchainRequest.update({
          where: { id: request.id },
          data: { status: 'CONFIRMED' }
        });
        
        // Also update the bill status if we have a reference
        if (request.billId) {
          await prisma.bill.update({
            where: { id: request.billId },
            data: { status: 'PAID' }
          });
        }
      }
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error processing bill payment with signature:', error);
      throw error;
    }
  }

  /**
   * Process a bill payment with U2K tokens using a signature from the connected wallet
   */
  async processBillPaymentWithU2K(
    blockchainBillId: string,
    sponsorAddress: string,
    sponsorSignature: string
  ): Promise<string> {
    try {
      // Verify the signature is valid for this transaction
      const message = ethers.utils.solidityKeccak256(
        ['string', 'address'],
        [blockchainBillId, sponsorAddress]
      );
      
      const messageHash = ethers.utils.arrayify(message);
      const recoveredAddress = ethers.utils.verifyMessage(messageHash, sponsorSignature);
      
      if (recoveredAddress.toLowerCase() !== sponsorAddress.toLowerCase()) {
        throw new Error('Invalid signature for sponsor address');
      }
      
      // Use the server wallet to submit the transaction on behalf of the user
      const tx = await this.billPaymentContract.payBillWithTokensOnBehalf(
        blockchainBillId,
        sponsorAddress,
        sponsorSignature
      );
      
      const receipt = await tx.wait();
      
      // Find the blockchain request for this bill
      const request = await prisma.blockchainRequest.findFirst({
        where: { blockchainBillId }
      });
      
      // Store this transaction in our database
      // Find a wallet record for our service wallet
      const serviceWallet = await prisma.cryptoWallet.findFirst({
        where: { address: this.wallet.address }
      });
      
      if (serviceWallet && request) {
        await prisma.blockchainTransaction.create({
          data: {
            transactionHash: receipt.transactionHash,
            from: this.wallet.address,
            to: BLOCKCHAIN_CONFIG.BILL_PAYMENT_CONTRACT_ADDRESS,
            amount: 0, // No ETH was sent
            status: 'CONFIRMED',
            cryptoWalletId: serviceWallet.id,
            blockchainRequestId: request.id
          }
        });
      }
      
      if (request) {
        await prisma.blockchainRequest.update({
          where: { id: request.id },
          data: { status: 'CONFIRMED' }
        });
        
        // Also update the bill status if we have a reference
        if (request.billId) {
          await prisma.bill.update({
            where: { id: request.billId },
            data: { status: 'PAID' }
          });
        }
        
        // Credit U2K tokens as reward (this would normally happen in the smart contract)
        // Here we're just updating our database record
        const sponsorWallet = await prisma.cryptoWallet.findUnique({
          where: { address: sponsorAddress }
        });
        
        if (sponsorWallet) {
          // Get the current reward amount from blockchain
          const rewardAmount = await this.getTokenBalance(sponsorAddress);
          await prisma.cryptoWallet.update({
            where: { id: sponsorWallet.id },
            data: { 
              u2kBalance: parseFloat(rewardAmount)
            }
          });
        }
      }
      
      return receipt.transactionHash;
    } catch (error) {
      console.error('Error processing U2K token payment with signature:', error);
      throw error;
    }
  }
}

export default new BlockchainService(); 