import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { z } from "zod";
import { appendInventoryCheck } from "../services/sheetsService.js";

const saveSchema = z.object({
  anaKategoriFiltresi: z.string().max(200).default(""),
  konumFiltresi: z.string().max(200).default(""),
  items: z.array(z.object({
    barkodNo: z.string().trim().min(1).max(100),
    urunAdi: z.string().max(500).default(""),
    anaKategori: z.string().max(200).default(""),
    rafKonum: z.string().max(200).default(""),
    kontrolEdildi: z.boolean(),
  })).min(1).max(5000),
});

export async function saveInventoryCheck(req: Request, res: Response) {
  const body = saveSchema.parse(req.body);
  const data = await appendInventoryCheck({ ...body, sessionId: randomUUID() });
  res.status(201).json({ success: true, data });
}
