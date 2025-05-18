import { Request, Response } from "express";
import * as RequestService from "../services/request.service";
import {prisma} from "../lib/prisma"

export const handleCreateRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
          res.status(401).json({ success: false, message: "Unauthorized" });
          return;
        }


    const requesterId = req.user.id; 
    const dto = req.body;
    const newRequest = await RequestService.createRequest(dto, requesterId);
    res.status(201).json({ success: true, data: newRequest });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export const handleGetRequests = async (req: Request, res: Response) => {
  try {
    const filters = {
      requesterId: req.query.requesterId as string,
      supporterId: req.query.supporterId as string,
    };

    const requests = await RequestService.getRequests(filters);
    res.status(200).json({ success: true, data: requests });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const handleGetRequestById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const request = await RequestService.getRequestById(id);
    res.status(200).json({ success: true, data: request });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
};

export const handleUpdateRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const updated = await RequestService.updateRequest(id, req.body);
    res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const handleDeleteRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await RequestService.deleteRequest(id);
    res.status(200).json({ success: true, message: "Request deleted" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};


export const handleUpdateRequestStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const supporterId = req.user.id;
    const requestId = req.params.id;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }

    const updated = await RequestService.updateRequestStatus(requestId, supporterId, status);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
};


  export const handleGetAllRequests = async (req: Request, res: Response) => {
    try {
    const filters = req.query;
    const data = await RequestService.getAllRequests(filters);
    res.json({ success: true, data });
    } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
    }
    };


    export const getRequestDetails = async (req: Request, res: Response) => {
      const { id } = req.params;
      
      try {
      const request = await RequestService.fetchRequestWithBills(id);

      if (!request) {
        res.status(404).json({ message: "Request not found" });
        return 
      }
      
      res.json(request);
      } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
      }
      };

      export const getRequestPublicDetails = async (req: Request, res: Response): Promise<void> => {
        const { publicLinkId } = req.params;
        
        try {
        const request = await prisma.request.findUnique({
        where: { publicLinkId },
        include: {
        requester: { select: { id: true, name: true } },
        bills: {
        include: {
        provider: true,
        transactions: true,
        },
        },
        },
        });
        
        
        if (!request) {
          res.status(404).json({ message: "Request not found" });
          return;
        }
        
        res.json(request);
        } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
        }
        };