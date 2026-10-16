// `npm run dev`: sobe o Postgres local do `prisma dev` (se o .env apontar para ele) e o Next juntos.
// - No Windows o modo em segundo plano (`prisma dev start`) morre quando o terminal fecha,
//   e o login quebra com o banco fora do ar. Aqui os dois vivem e morrem juntos.
// - Se o terminal anterior foi fechado com o banco rodando, a trava dele fica presa por alguns
//   segundos ("Lock file is already being held"): esperamos e tentamos de novo.
import "dotenv/config";
import { spawn } from "node:child_process";
import net from "node:net";

const NOME_BANCO = "smart-vagas";
const ESPERA_PORTA_MS = 60_000;
const CONFIRMACAO_MS = 4_000;
const ESPERA_ENTRE_TENTATIVAS_MS = 15_000;
const TENTATIVAS = 4;

const url = new URL(process.env.DATABASE_URL ?? "postgres://localhost:5432");
const portaBanco = Number(url.port || 5432);
const usaPrismaDev = ["localhost", "127.0.0.1"].includes(url.hostname) && portaBanco !== 5432;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function portaAberta(porta) {
  return new Promise((resolve) => {
    const socket = net.connect({ port: porta, host: "127.0.0.1" });
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("error", () => resolve(false));
  });
}

const filhos = new Set();
function rodar(comando, opcoes = {}) {
  const filho = spawn(comando, { shell: true, stdio: "inherit", ...opcoes });
  filhos.add(filho);
  filho.on("exit", () => filhos.delete(filho));
  return filho;
}

function encerrarTudo(codigo = 0) {
  for (const filho of filhos) filho.kill();
  process.exit(codigo);
}
process.on("SIGINT", () => encerrarTudo(0));
process.on("SIGTERM", () => encerrarTudo(0));

/** Sobe o banco e só considera pronto se ele continuar de pé alguns segundos depois. */
async function tentarSubirBanco() {
  const banco = rodar(`npx prisma dev --name ${NOME_BANCO}`, { stdio: ["ignore", "ignore", "pipe"] });
  let saiu = false;
  let erro = "";
  banco.stderr.on("data", (parte) => (erro += parte));
  banco.on("exit", () => (saiu = true));

  const limite = Date.now() + ESPERA_PORTA_MS;
  while (!saiu && Date.now() < limite && !(await portaAberta(portaBanco))) await dormir(500);
  if (!saiu) await dormir(CONFIRMACAO_MS);

  if (!saiu && (await portaAberta(portaBanco))) {
    banco.on("exit", (codigo) =>
      console.error(`\n✖ O banco local parou (código ${codigo}). O site ficou sem dados: rode "npm run dev" de novo.`),
    );
    return { ok: true };
  }
  banco.kill();
  return { ok: false, travado: erro.includes("Lock file is already being held"), erro };
}

if (usaPrismaDev && (await portaAberta(portaBanco))) {
  console.log(`✔ Banco local já está rodando na porta ${portaBanco}.`);
} else if (usaPrismaDev) {
  console.log(`▶ Subindo o banco local (prisma dev "${NOME_BANCO}") na porta ${portaBanco}...`);
  let pronto = false;
  for (let tentativa = 1; tentativa <= TENTATIVAS && !pronto; tentativa++) {
    const resultado = await tentarSubirBanco();
    pronto = resultado.ok;
    if (pronto) break;
    if (tentativa === TENTATIVAS) {
      console.error(`✖ Não consegui subir o banco local.\n${resultado.erro.trim()}`);
      encerrarTudo(1);
    }
    const motivo = resultado.travado
      ? "a trava de uma execução anterior ainda não expirou"
      : "o banco caiu ao iniciar";
    console.log(`… ${motivo}; tentando de novo em ${ESPERA_ENTRE_TENTATIVAS_MS / 1000}s (${tentativa}/${TENTATIVAS - 1}).`);
    await dormir(ESPERA_ENTRE_TENTATIVAS_MS);
  }
  console.log("✔ Banco pronto.");
}

const site = rodar("npx next dev");
site.on("exit", (codigo) => encerrarTudo(codigo ?? 0));
