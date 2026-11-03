import type { Request, Response } from "express";
import { z } from "zod";
import { appendSubcategory, readCategories } from "../services/sheetsService.js";

export async function list(_req: Request, res: Response) {
  const data = await readCategories();
  res.json({ success: true, data });
}

const createSchema = z.object({
  anaKategori: z.string().min(1),
  altKategori: z.string().min(1),
});

export async function createSubcategory(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  await appendSubcategory(body.anaKategori, body.altKategori);
  const data = await readCategories();
  res.status(201).json({ success: true, data });
}
