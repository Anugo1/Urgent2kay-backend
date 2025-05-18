// src/controllers/bill.controller.ts
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { Provider, BillStatus } from "@prisma/client"; // Import Provider type and BillStatus enum
import { CreateBillDto } from '../dto/Bill/bill.dto'

export const createBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized user" });
      return;
    }

    const dto: CreateBillDto = req.body;
    let requestId: string | undefined = undefined;

    // Optional: Validate and authorize requestId if provided
    if (dto.requestId) {
      const request = await prisma.request.findUnique({
        where: { id: dto.requestId },
      });

      if (!request) {
        res.status(404).json({ message: 'Request (bundle) not found' });
        return;
      }

      if (request.requesterId !== userId) {
        res.status(403).json({ message: 'You do not own this request' });
        return;
      }

      requestId = dto.requestId;
      console.log("Incoming requestId:", requestId);
    }

    // Use raw SQL to bypass type checking
    await prisma.$executeRaw`
      INSERT INTO "Bill" ("billName", "description", "type", "note", "amount", "priority", "dueDate", "userId", "providerId", "requestId")
      VALUES (
        ${dto.billName},
        ${dto.description || ""},
        ${dto.type},
        ${dto.note || null},
        ${dto.amount},
        ${dto.priority || 'MEDIUM'},
        ${dto.dueDate ? new Date(dto.dueDate) : null},
        ${userId},
        ${dto.providerId || null},
        ${requestId || null}
      )
    `;

    // Get the latest bill created by this user (as an approximation)
    const bills = await prisma.bill.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 1,
      include: { provider: true }
    });

    const bill = bills[0];

    res.status(201).json({ message: "Bill created successfully", bill });
  } catch (error) {
    console.error("Create Bill Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add blockchain bill creation functionality
export const createBlockchainBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized user" });
      return;
    }

    const { 
      amount, 
      description, 
      sponsorAddress, 
      recipientAddress, 
      category,
      status = 'PENDING',
      paymentMethod = 'BLOCKCHAIN'
    } = req.body;

    if (!amount || !description) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Determine the proper category based on payment method
    let billCategory = category || 'UTILITIES';
    
    // If blockchain-related addresses are provided, mark it as a blockchain payment
    if (sponsorAddress && recipientAddress) {
      billCategory = 'BLOCKCHAIN_PAYMENT';
      console.log(`Creating blockchain-related bill for user ${userId}`);
    }

    // Create bill in the database - using the standard pattern in this codebase
    const bill = await prisma.bill.create({
      data: {
        billName: `Blockchain Bill ${Date.now()}`,
        type: 'BLOCKCHAIN',
        description,
        amount: parseFloat(amount.toString()),
        status: status as BillStatus,
        category: billCategory,
        paymentMethod,
        user: {
          connect: {
            id: userId
          }
        }
      } as any // Type assertion needed due to Prisma type definition mismatch with schema
    });

    console.log(`Created blockchain bill with ID ${bill.id} with category ${billCategory}`);

    res.status(201).json(bill);
  } catch (error: any) {
    console.error('Error creating blockchain bill:', error);
    res.status(500).json({ 
      error: 'Failed to create blockchain bill',
      details: error.message || 'Unknown error' 
    });
  }
};

// GET /bills — get all bills for logged-in user
export const getAllBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    // Get query parameters for filtering
    const { 
      category, 
      paymentMethod,
      status 
    } = req.query;
    
    let where: any = { userId };
    
    // Filter by category if provided
    if (category) {
      where.category = category as string;
    }
    
    // Filter by payment method if provided
    if (paymentMethod) {
      where.paymentMethod = paymentMethod as string;
    }
    
    // Filter by status if provided
    if (status) {
      where.status = status as string;
    }
    
    // For blockchain related bills
    if (paymentMethod === 'BLOCKCHAIN' || category === 'BLOCKCHAIN_PAYMENT') {
      console.log('Getting blockchain-related bills');
    }
    
    const bills = await prisma.bill.findMany({  
      where,
      include: { 
        provider: true,
        blockchainRequest: true
      },  
      orderBy: { createdAt: "desc" },  
    });
    
    console.log(`Found ${bills.length} bills matching query criteria`);
    
    res.status(200).json({ bills });  
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
  
// GET /bills/:id — get a specific bill by ID
export const getBillById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {  
      res.status(401).json({ error: "Unauthorized" });  
      return;  
    }
    
    const bill = await prisma.bill.findUnique({  
      where: { id },  
      include: { 
        provider: true,
        blockchainRequest: true
      },  
    });
    
    if (!bill || bill.userId !== userId) {  
      res.status(404).json({ error: "Bill not found" });  
      return;  
    }
    
    res.status(200).json({ bill });  
  } catch (error) {
    console.error("Error fetching bill:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Update an existing bill
export const updateBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { billName, type, amount, description, note, dueDate, priority, providerId } = req.body;
    
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    // Get the existing bill to check ownership
    const existingBill = await prisma.bill.findUnique({ where: { id } });
    
    if (!existingBill || existingBill.userId !== userId) {
      res.status(404).json({ error: "Bill not found or unauthorized" });
      return;
    }
    
    // Optional: Validate new provider ID if changed
    if (providerId) {
      const provider = await prisma.provider.findUnique({ where: { id: providerId } });
      if (!provider) {
        res.status(404).json({ error: "Invalid provider ID" });
        return;
      }
    }
    
    // Use raw SQL to bypass type checking
    await prisma.$executeRaw`
      UPDATE "Bill"
      SET
        "billName" = ${billName || null},
        "description" = ${description || null},
        "type" = ${type || null},
        "amount" = ${amount ? parseFloat(amount) : null},
        "note" = ${note || null},
        "dueDate" = ${dueDate ? new Date(dueDate) : null},
        "priority" = ${priority || null},
        "providerId" = ${providerId || null}
      WHERE "id" = ${id}
    `;
    
    // Fetch the updated bill
    const updatedBill = await prisma.bill.findUnique({
      where: { id },
      include: { provider: true }
    });
    
    res.status(200).json({ message: "Bill updated successfully", bill: updatedBill });
  } catch (error) {
    console.error("Error updating bill:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
  
// Delete an existing bill
export const deleteBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const bill = await prisma.bill.findUnique({ where: { id } });
    
    if (!bill || bill.userId !== userId) {
      res.status(404).json({ error: "Bill not found or unauthorized" });
      return;
    }
    
    await prisma.bill.delete({ where: { id } });
    
    res.status(200).json({ message: "Bill deleted successfully" });
  } catch (error) {
    console.error("Error deleting bill:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sponsorBill = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { billId } = req.params;
    const { amount } = req.body;
    
    if (!userId) {
      res.status(401).json({ error: "Unauthorized user" });
      return;
    }
    
    if (!amount || isNaN(amount)) {
      res.status(400).json({ error: "Amount is required and must be a number" });
      return;
    }
    
    // Check if bill exists
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: { 
        transactions: true 
      }
    });
    
    if (!bill) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }

    // Create the transaction without trying to update the sponsors relationship
    // This avoids the type error as we're not trying to use the relationship directly
    const transaction = await prisma.transaction.create({
      data: {
        amount: parseFloat(amount),
        status: "SUCCESS",
        billId,
        reference: `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`
      }
    });

    // Sum all successful transactions for this bill
    const allTransactions = await prisma.transaction.findMany({
      where: {
        billId,
        status: "SUCCESS"
      }
    });

    const totalPaid = allTransactions.reduce((sum, txn) => sum + txn.amount, 0);
    
    // Check if bill is fully paid
    let newStatus = bill.status;
    if (totalPaid >= bill.amount) {
      newStatus = "PAID";
      
      // Update bill status to PAID
      await prisma.bill.update({
        where: { id: billId },
        data: { status: newStatus }
      });
    }

    res.status(200).json({ 
      message: "Bill payment successful", 
      transaction,
      totalPaid,
      billStatus: newStatus
    });
  } catch (error) {
    console.error("Error sponsoring bill:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};