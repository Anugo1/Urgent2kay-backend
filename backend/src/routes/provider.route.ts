// src/routes/provider.routes.ts
import { Router } from "express";
import { getAllProviders } from "../controllers/provider.controller";

const router = Router();

router.get("/providers", getAllProviders);

export default router;
