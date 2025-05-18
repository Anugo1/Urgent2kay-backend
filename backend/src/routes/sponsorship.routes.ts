import { Router } from "express";
import { getUserSponsorships } from "../controllers/sponsorship.controller";
import { isAuthenticated} from "../middlewares/auth";

const router = Router();

router.get("/user", isAuthenticated, getUserSponsorships);

export default router;