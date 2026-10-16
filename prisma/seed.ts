// Dados de demonstração: 4 estacionamentos (Sorocaba e São Paulo), eventos, convênios e um motorista.
// Só desenvolvimento: apaga tudo antes de criar.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { aplicarConvenio } from "../src/features/convenios/regras";
import { calcularValorEstadia, type TabelaPreco } from "../src/features/estadias/preco";
import { PrismaClient } from "../src/generated/prisma/client";
import type { FormaPagamento, Papel, TipoVaga } from "../src/generated/prisma/enums";
import { diaCivil, diaParaData, lerHorarioLocal, somarDias, somarMeses } from "../src/lib/tempo";

function exigir(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Defina ${nome} no .env (veja .env.example).`);
  return valor;
}

if (process.env.NODE_ENV === "production") throw new Error("O seed é só para desenvolvimento.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: exigir("DATABASE_URL") }),
});

const FUSO = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";
const agora = new Date();
const hoje = diaCivil(agora, FUSO);
const minutosAtras = (minutos: number) => new Date(agora.getTime() - minutos * 60_000);
/** "daqui a N dias, às HH:MM" no fuso do estacionamento. */
function quando(dias: number, hora: string): Date {
  const data = lerHorarioLocal(`${somarDias(hoje, dias)}T${hora}`, FUSO);
  if (!data) throw new Error(`Horário inválido: ${hora}`);
  return data;
}

// Valores de exemplo: o dono ajusta em Configurações (RF-03).
const TABELA: TabelaPreco = {
  toleranciaMin: 15,
  primeiraHoraCentavos: 1000,
  horaAdicionalCentavos: 500,
  diariaCentavos: 4000,
};

async function limpar() {
  await prisma.$executeRaw`TRUNCATE TABLE notificacoes, alertas_vaga, reservas, eventos, audit_logs, estadias,
    convenios, pagamentos_mensalidade, assinaturas, veiculos, motoristas, planos, custos, funcionarios, turnos,
    vagas, setores, configuracoes, sessions, accounts, verifications, rate_limits, users, estacionamentos CASCADE`;
}

async function criarUsuario(
  estacionamentoId: string,
  email: string,
  nome: string,
  papel: Papel,
  senha: string,
) {
  const id = randomUUID();
  await prisma.user.create({
    data: {
      id,
      email,
      name: nome,
      papel,
      emailVerified: true,
      estacionamentoId,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(senha),
        },
      },
    },
  });
  return id;
}

type Setor = { nome: string; prefixo: string; total: number; coberta: boolean; tipo?: TipoVaga };

async function criarVagas(
  estacionamentoId: string,
  setores: Setor[],
  especiais: Record<string, TipoVaga>,
  reservaveis: Set<string>,
  bloqueadas: Record<string, string> = {},
) {
  const idPorNumero = new Map<string, string>();
  for (const setor of setores) {
    const { id: setorId } = await prisma.setor.create({
      data: { estacionamentoId, nome: setor.nome },
    });
    const vagas = await prisma.vaga.createManyAndReturn({
      data: Array.from({ length: setor.total }, (_, i) => {
        const numero = `${setor.prefixo}-${String(i + 1).padStart(2, "0")}`;
        return {
          estacionamentoId,
          setorId,
          numero,
          coberta: setor.coberta,
          tipo: especiais[numero] ?? setor.tipo ?? ("comum" as const),
          reservavel: reservaveis.has(numero),
          ativa: !(numero in bloqueadas),
          motivoBloqueio: bloqueadas[numero] ?? null,
        };
      }),
      select: { id: true, numero: true },
    });
    for (const vaga of vagas) idPorNumero.set(vaga.numero, vaga.id);
  }
  return (numero: string) => {
    const id = idPorNumero.get(numero);
    if (!id) throw new Error(`Vaga ${numero} não existe no seed.`);
    return id;
  };
}

// ---------- 1. Estacionamento Central (o do dono e do operador de demonstração) ----------

const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];
const PLANOS = [
  {
    nome: "Mensal Integral",
    valorCentavos: 25000,
    diasSemana: TODOS_OS_DIAS,
    inicioMin: null,
    fimMin: null,
  },
  {
    nome: "Noturno",
    valorCentavos: 12000,
    diasSemana: TODOS_OS_DIAS,
    inicioMin: 18 * 60,
    fimMin: 8 * 60,
  },
  { nome: "Fim de semana", valorCentavos: 9000, diasSemana: [6, 0], inicioMin: null, fimMin: null },
];

const MENSALISTAS = [
  {
    nome: "Marcos Lima",
    placa: "FQX2B47",
    modelo: "Corolla preto",
    plano: "Mensal Integral",
    vagaFixa: "A-05",
    venceEm: somarDias(hoje, 12),
    dentroHaMin: 190,
  },
  {
    nome: "Beatriz Nunes",
    placa: "GHT5E32",
    modelo: "HB20 branco",
    plano: "Mensal Integral",
    vagaFixa: "A-07",
    venceEm: somarMeses(hoje, 1),
    dentroHaMin: null,
  },
  {
    nome: "Juliana Prado",
    placa: "EJK4821",
    modelo: "Kwid vermelho",
    plano: "Noturno",
    vagaFixa: null,
    venceEm: somarDias(hoje, -3),
    dentroHaMin: null,
  },
  {
    nome: "Rogério Santos",
    placa: "DPL7C19",
    modelo: "Strada prata",
    plano: "Mensal Integral",
    vagaFixa: "A-06",
    venceEm: somarDias(hoje, -20),
    dentroHaMin: null,
  },
];

// [placa, vaga, minutos dentro, modelo]
const AVULSOS_DENTRO: [string, string, number, string | null][] = [
  ["RTA1B23", "B-01", 25, "Onix prata"],
  ["QWE4D56", "B-02", 70, null],
  ["BRA2E19", "B-03", 160, "Gol branco"],
  ["MNO8F12", "B-04", 185, null],
  ["KLP3G45", "B-05", 255, "Compass cinza"],
  ["JHG6H78", "B-06", 300, null],
  ["ZXC9J01", "B-07", 45, "Mobi vermelho"],
  ["PLM5K34", "B-08", 10, null],
  ["DFG7L56", "G-01", 14 * 60, "Hilux preta"], // passa do alerta de 12h
  ["MTO1A23", "M-01", 95, "CG 160"],
];

// [placa, vaga, entrou há (min), ficou (min), convênio?]
const AVULSOS_SAIRAM: [string, string, number, number, string | null][] = [
  ["AAA1A11", "B-11", 600, 125, "Shopping Centro (demo)"],
  ["BBB2B22", "B-12", 560, 40, null],
  ["CCC3C33", "B-13", 520, 230, "Livraria da Praça (demo)"],
  ["DDD4D44", "B-14", 480, 12, null],
  ["EEE5E55", "B-15", 430, 75, "Shopping Centro (demo)"],
  ["FFF6F66", "B-16", 400, 180, null],
  ["GGG7G77", "B-17", 350, 61, null],
  ["HHH8H88", "B-18", 300, 95, "Shopping Centro (demo)"],
  ["III9I99", "B-19", 240, 150, null],
  ["JJJ1J11", "B-20", 200, 30, null],
  ["KKK2K22", "A-10", 150, 110, null],
  ["LLL3L33", "A-11", 120, 50, null],
];
const FORMAS: FormaPagamento[] = ["pix", "dinheiro", "pix", "cartao"];

async function criarCentral() {
  const { id: estacionamentoId } = await prisma.estacionamento.create({
    data: {
      nome: "Estacionamento Central (demo)",
      endereco: "Rua de Demonstração, 100 - Centro",
      cidade: "Sorocaba",
      telefone: "(15) 3200-0100",
      horario: "Seg-Sex 7h-22h · Sáb 7h-14h",
      descricao:
        "Coberto no setor A, a duas quadras da catedral. Vagas para moto e para caminhonete.",
      latitude: -23.5015,
      longitude: -47.4526,
      configuracao: { create: { ...TABELA, chavePix: "pix@estacionamento-demo.test" } },
    },
  });

  await criarUsuario(
    estacionamentoId,
    "dono@smartvagas.test",
    "Paulo (dono)",
    "dono",
    exigir("SEED_SENHA_DONO"),
  );
  const operadorId = await criarUsuario(
    estacionamentoId,
    "operador@smartvagas.test",
    "Carlos (operador)",
    "operador",
    exigir("SEED_SENHA_OPERADOR"),
  );

  await prisma.funcionario.createMany({
    data: [
      {
        estacionamentoId,
        nome: "Carlos Souza",
        funcao: "Operador",
        salarioCentavos: 220000,
        encargosCentavos: 88000,
        userId: operadorId,
      },
      {
        estacionamentoId,
        nome: "Ana Ribeiro",
        funcao: "Operadora",
        salarioCentavos: 200000,
        encargosCentavos: 80000,
      },
    ],
  });
  const mes = hoje.slice(0, 7);
  await prisma.custo.createMany({
    data: [
      {
        estacionamentoId,
        categoria: "aluguel",
        descricao: "Aluguel do terreno",
        valorCentavos: 600000,
        data: diaParaData(`${mes}-05`),
        criadoPorId: operadorId,
      },
      {
        estacionamentoId,
        categoria: "energia",
        descricao: "Conta de luz",
        valorCentavos: 45000,
        data: diaParaData(`${mes}-10`),
        criadoPorId: operadorId,
      },
    ],
  });

  const vaga = await criarVagas(
    estacionamentoId,
    [
      { nome: "A · Coberto", prefixo: "A", total: 20, coberta: true },
      { nome: "B · Descoberto", prefixo: "B", total: 26, coberta: false },
      { nome: "G · Veículos grandes", prefixo: "G", total: 4, coberta: false, tipo: "grande" },
      { nome: "M · Motos", prefixo: "M", total: 6, coberta: true, tipo: "moto" },
    ],
    { "A-01": "pcd", "A-02": "pcd", "A-03": "idoso", "A-04": "idoso", "A-20": "eletrica" },
    new Set(["B-21", "B-22", "B-23", "B-24", "B-25", "G-03", "G-04", "M-05", "M-06", "A-02"]),
    { "B-26": "Manutenção do piso" },
  );

  const planos = await prisma.plano.createManyAndReturn({
    data: PLANOS.map((plano) => ({ estacionamentoId, ...plano })),
    select: { id: true, nome: true, valorCentavos: true },
  });

  for (const m of MENSALISTAS) {
    const plano = planos.find((p) => p.nome === m.plano);
    if (!plano) throw new Error(`Plano ${m.plano} não existe no seed.`);
    const motorista = await prisma.motorista.create({
      data: {
        estacionamentoId,
        nome: m.nome,
        veiculos: { create: { placa: m.placa, modelo: m.modelo } },
      },
    });
    const assinatura = await prisma.assinatura.create({
      data: {
        motoristaId: motorista.id,
        planoId: plano.id,
        vagaFixaId: m.vagaFixa ? vaga(m.vagaFixa) : null,
        venceEm: diaParaData(m.venceEm),
      },
    });
    const pagoHoje = m.venceEm === somarMeses(hoje, 1);
    await prisma.pagamentoMensalidade.create({
      data: {
        estacionamentoId,
        assinaturaId: assinatura.id,
        valorCentavos: plano.valorCentavos,
        formaPagamento: "pix",
        pagoEm: pagoHoje ? minutosAtras(30) : diaParaData(somarMeses(m.venceEm, -1)),
        periodoAte: diaParaData(m.venceEm),
        registradoPorId: operadorId,
      },
    });
    if (m.dentroHaMin !== null && m.vagaFixa) {
      await prisma.estadia.create({
        data: {
          estacionamentoId,
          vagaId: vaga(m.vagaFixa),
          placa: m.placa,
          modelo: m.modelo,
          entradaEm: minutosAtras(m.dentroHaMin),
          assinaturaId: assinatura.id,
          entradaPorId: operadorId,
        },
      });
    }
  }

  // Convênios: o shopping paga a 1ª hora, a livraria 20% e a feira (já vencida) R$ 5.
  const convenios = await prisma.convenio.createManyAndReturn({
    data: [
      {
        estacionamentoId,
        nome: "Shopping Centro (demo)",
        tipo: "shopping",
        contato: "Renata (administração)",
        telefone: "(15) 3200-0200",
        tipoDesconto: "minutos",
        valorDesconto: 60,
        observacao: "Ticket carimbado em qualquer loja acima de R$ 50.",
      },
      {
        estacionamentoId,
        nome: "Livraria da Praça (demo)",
        tipo: "loja",
        contato: "Sr. Antônio",
        tipoDesconto: "percentual",
        valorDesconto: 20,
      },
      {
        estacionamentoId,
        nome: "Feira do Livro 2026 (demo)",
        tipo: "evento",
        tipoDesconto: "valor",
        valorDesconto: 500,
        validoAte: diaParaData(somarDias(hoje, -10)),
      },
      {
        estacionamentoId,
        nome: "Clínica Bem-Estar (demo)",
        tipo: "empresa",
        tipoDesconto: "minutos",
        valorDesconto: 30,
        ativo: false,
      },
    ],
    select: { id: true, nome: true, tipoDesconto: true, valorDesconto: true },
  });

  await prisma.estadia.createMany({
    data: AVULSOS_DENTRO.map(([placa, numero, minutos, modelo]) => ({
      estacionamentoId,
      vagaId: vaga(numero),
      placa,
      modelo,
      entradaEm: minutosAtras(minutos),
      entradaPorId: operadorId,
    })),
  });

  await prisma.estadia.createMany({
    data: AVULSOS_SAIRAM.map(([placa, numero, entrouHa, ficou, nomeConvenio], i) => {
      const cheio = calcularValorEstadia(ficou, TABELA);
      const convenio = nomeConvenio ? convenios.find((c) => c.nome === nomeConvenio)! : null;
      const { descontoCentavos, valorFinalCentavos } = convenio
        ? aplicarConvenio(cheio, ficou, convenio, TABELA)
        : { descontoCentavos: 0, valorFinalCentavos: cheio };
      return {
        estacionamentoId,
        vagaId: vaga(numero),
        placa,
        entradaEm: minutosAtras(entrouHa),
        saidaEm: minutosAtras(entrouHa - ficou),
        valorCentavos: valorFinalCentavos,
        formaPagamento: valorFinalCentavos > 0 ? FORMAS[i % FORMAS.length] : null,
        convenioId: convenio?.id ?? null,
        descontoCentavos,
        entradaPorId: operadorId,
        saidaPorId: operadorId,
      };
    }),
  });

  const eventos = await prisma.evento.createManyAndReturn({
    data: [
      {
        estacionamentoId,
        nome: "Noite do Rock na Praça (demo)",
        local: "Praça Coronel Fernando Prestes",
        categoria: "Show",
        descricao: "Três bandas locais, entrada gratuita.",
        inicioEm: quando(0, "20:00"),
        fimEm: quando(0, "23:59"),
      },
      {
        estacionamentoId,
        nome: "Feira de Artesanato (demo)",
        local: "Largo da Catedral",
        categoria: "Feira",
        inicioEm: quando(2, "09:00"),
        fimEm: quando(2, "17:00"),
      },
      {
        estacionamentoId,
        nome: "Peça: O Auto da Compadecida (demo)",
        local: "Teatro Municipal",
        categoria: "Teatro",
        inicioEm: quando(4, "20:00"),
        fimEm: quando(4, "22:30"),
      },
    ],
    select: { id: true, nome: true },
  });

  return { estacionamentoId, operadorId, vaga, eventos };
}

// ---------- 2. Os outros estacionamentos da busca ----------

async function criarOutro(dados: {
  nome: string;
  endereco: string;
  cidade: string;
  latitude: number;
  longitude: number;
  descricao: string;
  horario: string;
  tabela: TabelaPreco;
  setores: Setor[];
  reservaveis: string[];
  ocupar: number;
}) {
  const { id: estacionamentoId } = await prisma.estacionamento.create({
    data: {
      nome: dados.nome,
      endereco: dados.endereco,
      cidade: dados.cidade,
      latitude: dados.latitude,
      longitude: dados.longitude,
      descricao: dados.descricao,
      horario: dados.horario,
      configuracao: { create: { ...dados.tabela, chavePix: "pix@parceiro-demo.test" } },
    },
  });
  const donoId = await criarUsuario(
    estacionamentoId,
    `dono+${dados.nome.split(" ")[1].toLowerCase()}@smartvagas.test`,
    `Dono ${dados.nome.split(" ")[1]}`,
    "dono",
    exigir("SEED_SENHA_DONO"),
  );
  const vaga = await criarVagas(estacionamentoId, dados.setores, {}, new Set(dados.reservaveis));
  const todas = dados.setores.flatMap((s) =>
    Array.from({ length: s.total }, (_, i) => `${s.prefixo}-${String(i + 1).padStart(2, "0")}`),
  );
  await prisma.estadia.createMany({
    data: todas.slice(0, dados.ocupar).map((numero, i) => ({
      estacionamentoId,
      vagaId: vaga(numero),
      placa: `SVD${i % 10}${String.fromCharCode(65 + (i % 26))}${String(10 + i).slice(-2)}`,
      entradaEm: minutosAtras(20 + i * 13),
      entradaPorId: donoId,
    })),
  });
  return { estacionamentoId, vaga };
}

async function main() {
  await limpar();
  const central = await criarCentral();

  const arena = await criarOutro({
    nome: "Estacionamento Arena (demo)",
    endereco: "Av. dos Esportes, 1500 - Jardim Vergueiro",
    cidade: "Sorocaba",
    latitude: -23.4889,
    longitude: -47.4415,
    descricao: "Ao lado do ginásio. Abre mais cedo em dia de jogo e de show.",
    horario: "Todos os dias 6h-0h",
    tabela: {
      toleranciaMin: 10,
      primeiraHoraCentavos: 1200,
      horaAdicionalCentavos: 600,
      diariaCentavos: 4500,
    },
    setores: [
      { nome: "Pátio", prefixo: "P", total: 40, coberta: false },
      { nome: "Grandes", prefixo: "G", total: 6, coberta: false, tipo: "grande" },
      { nome: "Motos", prefixo: "M", total: 10, coberta: false, tipo: "moto" },
    ],
    reservaveis: [
      "P-31",
      "P-32",
      "P-33",
      "P-34",
      "P-35",
      "P-36",
      "P-37",
      "P-38",
      "P-39",
      "P-40",
      "G-05",
      "G-06",
      "M-09",
      "M-10",
    ],
    ocupar: 18,
  });
  await prisma.evento.createMany({
    data: [
      {
        estacionamentoId: arena.estacionamentoId,
        nome: "Clássico Regional de Futsal (demo)",
        local: "Ginásio Municipal",
        categoria: "Esporte",
        inicioEm: quando(1, "19:30"),
        fimEm: quando(1, "22:00"),
      },
      {
        estacionamentoId: arena.estacionamentoId,
        nome: "Festival de Food Trucks (demo)",
        local: "Esplanada da Arena",
        categoria: "Festa",
        inicioEm: quando(3, "17:00"),
        fimEm: quando(3, "23:00"),
      },
    ],
  });

  // Lotado agora: serve para ver o "Lotado agora" e o "Avise-me".
  const campolim = await criarOutro({
    nome: "Garagem Campolim (demo)",
    endereco: "Rua das Palmeiras, 42 - Campolim",
    cidade: "Sorocaba",
    latitude: -23.5302,
    longitude: -47.4689,
    descricao: "Garagem pequena e coberta, perto dos escritórios do Campolim.",
    horario: "Seg-Sex 7h-19h",
    tabela: {
      toleranciaMin: 15,
      primeiraHoraCentavos: 900,
      horaAdicionalCentavos: 400,
      diariaCentavos: 3500,
    },
    setores: [{ nome: "Subsolo", prefixo: "S", total: 12, coberta: true }],
    reservaveis: ["S-11", "S-12"],
    ocupar: 12,
  });

  await criarOutro({
    nome: "Estacionamento Paulista (demo)",
    endereco: "Alameda Exemplo, 900 - Bela Vista",
    cidade: "São Paulo",
    latitude: -23.5614,
    longitude: -46.6559,
    descricao: "A uma quadra do metrô. Aceita SUVs grandes no térreo.",
    horario: "24 horas",
    tabela: {
      toleranciaMin: 10,
      primeiraHoraCentavos: 2200,
      horaAdicionalCentavos: 1000,
      diariaCentavos: 7000,
    },
    setores: [
      { nome: "Térreo", prefixo: "T", total: 20, coberta: true },
      { nome: "Grandes", prefixo: "G", total: 4, coberta: true, tipo: "grande" },
    ],
    reservaveis: ["T-18", "T-19", "T-20", "G-04"],
    ocupar: 15,
  });

  // ---------- 3. Motorista de demonstração ----------
  const motoristaUserId = randomUUID();
  await prisma.user.create({
    data: {
      id: motoristaUserId,
      email: "motorista@smartvagas.test",
      name: "Fernanda Alves",
      papel: "motorista",
      emailVerified: true,
      estacionamentoId: central.estacionamentoId,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: motoristaUserId,
          providerId: "credential",
          password: await hashPassword(exigir("SEED_SENHA_MOTORISTA")),
        },
      },
    },
  });
  const cliente = await prisma.motorista.create({
    data: {
      estacionamentoId: central.estacionamentoId,
      nome: "Fernanda Alves",
      email: "motorista@smartvagas.test",
      userId: motoristaUserId,
      veiculos: {
        create: [
          { placa: "FER2A26", modelo: "Onix azul", tipo: "carro" },
          { placa: "RNG4R77", modelo: "Ranger prata", tipo: "grande" },
        ],
      },
    },
  });

  const evento = central.eventos[0];
  await prisma.reserva.create({
    data: {
      estacionamentoId: central.estacionamentoId,
      vagaId: central.vaga("B-21"),
      motoristaId: cliente.id,
      placa: "FER2A26",
      codigo: "K7M2QX",
      inicioEm: quando(0, "19:30"),
      fimEm: quando(0, "23:30"),
      valorCentavos: calcularValorEstadia(240, TABELA),
      status: "confirmada",
      expiraEm: minutosAtras(-15),
      pagaEm: minutosAtras(40),
      confirmadaPorId: central.operadorId,
      eventoId: evento.id,
    },
  });
  await prisma.reserva.create({
    data: {
      estacionamentoId: central.estacionamentoId,
      vagaId: central.vaga("G-03"),
      motoristaId: cliente.id,
      placa: "RNG4R77",
      codigo: "H4TP9W",
      inicioEm: quando(-3, "08:00"),
      fimEm: quando(-3, "12:00"),
      valorCentavos: calcularValorEstadia(240, TABELA),
      status: "concluida",
      expiraEm: quando(-4, "20:15"),
      pagaEm: quando(-4, "20:05"),
      confirmadaPorId: central.operadorId,
    },
  });

  await prisma.alertaVaga.create({
    data: { userId: motoristaUserId, estacionamentoId: campolim.estacionamentoId },
  });
  await prisma.notificacao.createMany({
    data: [
      {
        userId: motoristaUserId,
        tipo: "reserva_confirmada",
        titulo: "Vaga garantida",
        mensagem: `Pagamento da reserva K7M2QX confirmado. Vaga B-21 para ${evento.nome}.`,
        link: "/cliente/reservas",
        criadaEm: minutosAtras(40),
      },
      {
        userId: motoristaUserId,
        tipo: "vaga_liberada",
        titulo: "Abriu vaga!",
        mensagem: "Estacionamento Arena (demo) acabou de liberar uma vaga.",
        link: `/estacionamentos/${arena.estacionamentoId}`,
        criadaEm: minutosAtras(60 * 26),
        lidaEm: minutosAtras(60 * 25),
      },
    ],
  });

  console.log(
    "Seed ok: 4 estacionamentos (1 lotado), 5 eventos, 4 convênios, 1 motorista com 2 reservas.",
  );
  console.log("Logins: dono@, operador@ e motorista@smartvagas.test (senhas no .env).");
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
