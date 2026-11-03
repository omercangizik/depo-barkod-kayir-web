import dotenv from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const backendRoot = path.resolve(here, "../..");
dotenv.config({ path: path.resolve(backendRoot, ".env") });

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:5173",
  appPassword: process.env.APP_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "3456"),
  spreadsheetId:
    process.env.GOOGLE_SPREADSHEET_ID ??
    "10KCbcRYIWy3uKwlYiViCww8EqEyCUg70W5yVca3AkBU",
  googleEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
  googlePrivateKey: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  googleCredentialsPath: credentialsPath
    ? path.isAbsolute(credentialsPath)
      ? credentialsPath
      : path.resolve(backendRoot, credentialsPath)
    : "",
};

export function hasGoogleCredentials(): boolean {
  if (env.googleCredentialsPath && existsSync(env.googleCredentialsPath)) return true;
  return Boolean(env.googleEmail && env.googlePrivateKey);
}
