/**
 * Prints all segment × market pairs (16) for manual QA with a live API key.
 * Run the app (`npm run dev`), set GEMINI_API_KEY, then click through each pair.
 */

const segments = ["Investor", "Trader", "Developer", "Asset Manager"];
const markets = ["GB", "ERCOT", "CAISO", "NEM"];

let n = 0;
for (const segment of segments) {
  for (const market of markets) {
    n += 1;
    console.log(`${n}. ${segment} × ${market}`);
  }
}
console.log(`\nTotal: ${n} combinations.`);
