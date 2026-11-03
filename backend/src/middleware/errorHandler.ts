import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Dosya 10 MB sınırını aşıyor"
        : "Dosya yüklenemedi";
    res.status(400).json({
      success: false,
      error: { message, code: "UPLOAD_ERROR" },
    });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(", ");
    res.status(400).json({
      success: false,
      error: { message, code: "VALIDATION_ERROR" },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      error: { message: err.message, code: err.code },
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    error: { message: "Sunucuda beklenmeyen bir hata oluştu.", code: "INTERNAL_ERROR" },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { message: "İstenen kaynak bulunamadı", code: "NOT_FOUND" },
  });
}
