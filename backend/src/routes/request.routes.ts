import { Router } from "express";
import { handleCreateRequest, handleGetRequests, handleGetRequestById, 
    handleUpdateRequest, handleDeleteRequest,handleUpdateRequestStatus,
    handleGetAllRequests, getRequestDetails, getRequestPublicDetails} from "../controllers/request.controller";
import { isAuthenticated } from "../middlewares/auth"; 

const router = Router();

router.post("/", isAuthenticated , handleCreateRequest);
router.get("/", isAuthenticated, handleGetRequests);
router.get("/:id", isAuthenticated, handleGetRequestById);
router.put("/:id", isAuthenticated , handleUpdateRequest);
router.delete("/:id", isAuthenticated, handleDeleteRequest);
router.patch("/:id/status", isAuthenticated, handleUpdateRequestStatus);
router.get("/", isAuthenticated , handleGetAllRequests);
router.get('/:id/details', isAuthenticated , getRequestDetails);
router.get('/public/:publicLinkId', getRequestPublicDetails); 




export default router;
