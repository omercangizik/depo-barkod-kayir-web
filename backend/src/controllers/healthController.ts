import type { Request, Response } from "express";
import { hasGoogleCredentials } from "../config/env.js";
import { getSpreadsheetInfo } from "../services/sheetsService.js";

export async function health(_req: Request, res: Response) {
  const credentials = hasGoogleCredentials();
  if (!credentials) {
    res.status(503).json({
      success: false,
      data: {
        api: true,
        sheets: false,
      },
      error: {
        message: "Google Sheets bağlantısı kullanılamıyor.",
        code: "SHEETS_CONFIG",
      },
    });
    return;
  }
  try {
    // Health checks must never mutate the spreadsheet or initialize its structure.
    await getSpreadsheetInfo();
    res.json({
      success: true,
      data: {
        api: true,
        sheets: true,
      },
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      data: { api: true, sheets: false },
      error: { message: "Google Sheets bağlantısı kurulamadı.", code: "SHEETS_ERROR" },
    });
  }
}
