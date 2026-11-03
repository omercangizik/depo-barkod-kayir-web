import { ensureStructure, getSpreadsheetInfo, readAllProducts, readCategories } from "../services/sheetsService.js";

async function main() {
  const info = await getSpreadsheetInfo();
  console.log("Tablo:", info.title);
  console.log("Sayfalar:", info.sheets.join(", "));
  await ensureStructure();
  const products = await readAllProducts(true);
  const categories = await readCategories();
  console.log("Ürün sayısı:", products.length);
  console.log("Ana kategoriler:", categories.anaKategoriler.length);
  if (products[0]) console.log("Örnek ürün:", products[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
