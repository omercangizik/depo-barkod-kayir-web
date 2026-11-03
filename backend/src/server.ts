import { createApp } from "./app.js";
import { env, hasGoogleCredentials } from "./config/env.js";
import { ensureStructure } from "./services/sheetsService.js";

const app = createApp();

if (env.nodeEnv === "production" && env.appPassword.length < 4) {
  throw new Error("Canlı ortamda APP_PASSWORD en az 4 karakter olmalıdır.");
}
if (env.nodeEnv === "production" && (!process.env.FRONTEND_ORIGIN || env.frontendOrigin === "*")) {
  throw new Error("Canlı ortamda FRONTEND_ORIGIN için uygulamanızın tam HTTPS adresini tanımlayın.");
}

app.listen(env.port, async () => {
  console.log(`Backend http://localhost:${env.port}`);
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
