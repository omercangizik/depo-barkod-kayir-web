import { Router } from "express";
import multer from "multer";
import {
  create,
  exportFile,
  getByBarcode,
  importFile,
  list,
  options,
  previewImport,
  stats,
  update,
} from "../controllers/productController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { MAX_UPLOAD_BYTES } from "../config/constants.js";
import { AppError } from "../utils/errors.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const ok = name.endsWith(".xlsx");
    if (!ok) {
      cb(new AppError("Yalnızca XLSX dosyası yükleyebilirsiniz"));
      return;
    }
    cb(null, true);
  },
});

export const productsRouter = Router();

productsRouter.get("/", asyncHandler(list));
productsRouter.get("/stats", asyncHandler(stats));
productsRouter.get("/options", asyncHandler(options));
productsRouter.get("/export", asyncHandler(exportFile));
productsRouter.post("/import/preview", upload.single("file"), asyncHandler(previewImport));
productsRouter.post("/import", upload.single("file"), asyncHandler(importFile));
productsRouter.get("/barcode/:barcode", asyncHandler(getByBarcode));
productsRouter.post("/", asyncHandler(create));
productsRouter.put("/barcode/:barcode", asyncHandler(update));
