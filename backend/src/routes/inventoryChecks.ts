import { Router } from "express";
import { saveInventoryCheck } from "../controllers/inventoryCheckController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const inventoryChecksRouter = Router();
inventoryChecksRouter.post("/", asyncHandler(saveInventoryCheck));
