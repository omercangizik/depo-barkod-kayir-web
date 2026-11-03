import { Router } from "express";
import { createSubcategory, list } from "../controllers/categoryController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const categoriesRouter = Router();
categoriesRouter.get("/", asyncHandler(list));
categoriesRouter.post("/", asyncHandler(createSubcategory));
