import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createSession, destroySession, hasActiveSession, isValidAppPassword } from "../middleware/sessionAuth.js";

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: "Çok fazla hatalı giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.", code: "LOGIN_RATE_LIMIT" },
  },
});

authRouter.get("/session", (req, res) => {
  res.json({ success: true, data: { authenticated: hasActiveSession(req) } });
});

authRouter.post("/login", loginLimiter, (req, res) => {
  if (!isValidAppPassword(req.body?.password)) {
    res.status(401).json({
      success: false,
      error: { message: "Şifre yanlış. Tekrar deneyin.", code: "INVALID_PASSWORD" },
    });
    return;
  }
  createSession(res);
  res.json({ success: true });
});

authRouter.post("/logout", (req, res) => {
  destroySession(req, res);
  res.json({ success: true });
});
