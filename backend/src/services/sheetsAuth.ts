import { existsSync } from "node:fs";
import { google } from "googleapis";
import { env, hasGoogleCredentials } from "../config/env.js";
import { SheetsError } from "../utils/errors.js";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

export function getSheetsClient() {
  if (!hasGoogleCredentials()) {
    throw new SheetsError(
      "Google servis hesabı bilgileri eksik. backend/.env dosyasını doldurun.",
    );
  }

  if (env.googleCredentialsPath) {
    if (!existsSync(env.googleCredentialsPath)) {
      throw new SheetsError(
        `Google kimlik dosyası bulunamadı: ${env.googleCredentialsPath}`,
      );
    }
    const auth = new google.auth.GoogleAuth({
      keyFile: env.googleCredentialsPath,
      scopes: SCOPES,
    });
    return google.sheets({ version: "v4", auth });
  }

  const auth = new google.auth.JWT({
    email: env.googleEmail,
    key: env.googlePrivateKey,
    scopes: SCOPES,
  });
  return google.sheets({ version: "v4", auth });
}
