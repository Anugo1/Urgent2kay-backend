import express, { Router } from 'express';
import * as blockchainController from '../controllers/blockchain.controller';

const router: Router = express.Router();

// Wallet-related routes
router.post('/wallets/:userId', blockchainController.createWallet);
router.get('/wallets/:userId/balance', blockchainController.getWalletBalance);
router.post('/wallets/:userId/connect', blockchainController.connectExistingWallet);

// Get sponsors route
router.get('/sponsors', blockchainController.getSponsors);

// Sync wallet balances with blockchain data
router.post('/wallets/sync', blockchainController.syncWalletBalances);

// Direct blockchain bill creation route
router.post('/blockchain-bills', blockchainController.createBlockchainBillDirect);
router.get('/blockchain-bills', blockchainController.getBlockchainBills);
router.get('/blockchain-bills/user/:userId', blockchainController.getUserBlockchainBills);

// Bill request routes
router.post('/bills/:billId/request', blockchainController.createBillRequest);
router.post('/blockchain-requests/:blockchainRequestId/pay-native', blockchainController.payBillWithNative);
router.post('/blockchain-requests/:blockchainRequestId/pay-u2k', blockchainController.payBillWithU2K);
router.post('/blockchain-requests/:blockchainRequestId/reject', blockchainController.rejectBill);

// Blockchain info routes
router.get('/blockchain-bills/:blockchainBillId', blockchainController.getBillDetails);

// Sponsor and beneficiary bills
router.get('/sponsors/:userId/bills', blockchainController.getSponsorBillsByUserId);
router.get('/sponsor-bills/:address', blockchainController.getSponsorBills);
router.get('/beneficiary-bills/:address', blockchainController.getBeneficiaryBills);
router.get('/sponsors/:sponsorAddress/metrics', blockchainController.getSponsorMetrics);

// Notification routes
router.get('/notifications', blockchainController.getBlockchainNotifications);
router.put('/notifications/:notificationId/read', blockchainController.markNotificationAsRead);

export default router; 