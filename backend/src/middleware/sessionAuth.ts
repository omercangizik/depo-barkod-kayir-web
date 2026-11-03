import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const SESSION_COOKIE = "depo_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map<string, number>();

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_MS,
  };
}

function readSession(req: Request): string {
  const cookieHeader = req.headers.cookie ?? "";
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === SESSION_COOKIE) return value.join("=");
  }
  return "";
}

export function isValidAppPassword(candidate: unknown): boolean {
  if (typeof candidate !== "string" || candidate.length > 256 || !env.appPassword) return false;
  const expectedHash = createHash("sha256").update(env.appPassword).digest();
  const candidateHash = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expectedHash, candidateHash);
}

export function createSession(res: Response) {
  for (const [token, expiresAt] of sessions) {
    if (expiresAt <= Date.now()) sessions.delete(token);
  }
  const token = randomBytes(32).toString("base64url");
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export function destroySession(req: Request, res: Response) {
  const token = readSession(req);
  if (token) sessions.delete(token);
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions();
  res.clearCookie(SESSION_COOKIE, clearOptions);
}

export function hasActiveSession(req: Request): boolean {
  const token = readSession(req);
  const expiresAt = sessions.get(token);
  if (!expiresAt || expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return false;
  }
  return true;
}

export function requireSession(req: Request, res: Response, next: NextFunction) {
  if (!hasActiveSession(req)) {
    res.status(401).json({
      success: false,
      error: { message: "Oturumunuz sona erdi. Lütfen yeniden giriş yapın.", code: "UNAUTHORIZED" },
    });
    return;
  }
  next();
}
