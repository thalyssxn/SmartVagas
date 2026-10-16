// CI: VERSION e package.json precisam andar juntos (docs/MVP_v1.1.md §7.4).
import { readFileSync } from "node:fs";

const versao = readFileSync("VERSION", "utf8").trim();
const { version } = JSON.parse(readFileSync("package.json", "utf8"));

if (versao !== version) {
  console.error(`VERSION (${versao}) difere de package.json (${version}).`);
  process.exit(1);
}
console.log(`Versão ${versao} ok.`);
