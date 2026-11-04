import { createApp } from "./app.js";
import { env, hasGoogleCredentials } from "./config/env.js";
import { ensureStructure } from "./services/sheetsService.js";

const app = createApp();
app.listen(env.port, env.host, async () => {
  console.log(`Backend ${env.host}:${env.port}`);
  if (!hasGoogleCredentials()) {
    console.warn("Google servis hesabı tanımlı değil. backend/.env dosyasını doldurun.");
    return;
  }
  try {
    await ensureStructure();
    console.log("Google Sheets yapısı hazır.");
  } catch (err) {
    console.error("Google Sheets başlatılamadı:", err instanceof Error ? err.message : err);
  }
});
