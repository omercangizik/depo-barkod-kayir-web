import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(frontendDir, "public");
const backendUrl = process.env.API_BACKEND_URL?.trim();

if (process.env.NETLIFY && !backendUrl) {
  throw new Error("Netlify canlı dağıtımı için API_BACKEND_URL ortam değişkeni gereklidir.");
}

const redirects = [];
if (backendUrl) {
  let parsed;
  try {
    parsed = new URL(backendUrl);
  } catch {
    throw new Error("API_BACKEND_URL geçerli bir HTTPS adresi olmalıdır.");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("API_BACKEND_URL yalnızca backend sunucusunun HTTPS origin adresi olmalıdır.");
  }
  redirects.push(`/api/* ${parsed.origin}/api/:splat 200!`);
}
redirects.push("/* /index.html 200");

await mkdir(publicDir, { recursive: true });
await writeFile(path.join(publicDir, "_redirects"), `${redirects.join("\n")}\n`, "utf8");
