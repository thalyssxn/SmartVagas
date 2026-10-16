import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { reaisSchema } from "@/lib/dinheiro";
import { ErroDeNegocio } from "@/lib/resultado";
import { TIPOS_VAGA } from "@/lib/veiculo";
import { registrarAuditoria } from "@/server/auditoria";
import { prisma } from "@/server/db";
import type { Contexto } from "@/server/sessao";

const inteiro = (min: number, max: number, nome: string) =>
  z.coerce
    .number({ message: `${nome}: informe um número.` })
    .int(`${nome}: use um número inteiro.`)
    .min(min, `${nome}: mínimo ${min}.`)
    .max(max, `${nome}: máximo ${max}.`);

export const configuracaoSchema = z.object({
  toleranciaMin: inteiro(0, 120, "Tolerância"),
  primeiraHora: reaisSchema,
  horaAdicional: reaisSchema,
  diaria: reaisSchema,
  alertaPermanenciaH: inteiro(1, 72, "Alerta de permanência"),
  carenciaMensalidadeDias: inteiro(0, 30, "Carência da mensalidade"),
  antecedenciaMinMin: inteiro(0, 1440, "Antecedência mínima"),
  antecedenciaMaxDias: inteiro(1, 60, "Antecedência máxima"),
  duracaoMaxH: inteiro(1, 24, "Duração máxima"),
  expiracaoPendenteMin: inteiro(5, 120, "Prazo para pagar"),
  cancelamentoPrazoH: inteiro(0, 72, "Prazo de cancelamento grátis"),
  retencaoPct: inteiro(0, 100, "Retenção"),
  bloqueioAvulsoH: inteiro(0, 24, "Janela da vaga reservada"),
  chegadaAntecipadaMin: inteiro(0, 180, "Chegada antecipada"),
  chavePix: z.string().trim().max(120).optional(),
});

const coordenada = (limite: number, nome: string) =>
  z
    .string()
    .trim()
    .optional()
    .transform((texto, ctx) => {
      if (!texto) return null;
      const valor = Number(texto.replace(",", "."));
      if (!Number.isFinite(valor) || Math.abs(valor) > limite) {
        ctx.addIssue({ code: "custom", message: `${nome} inválida.` });
        return z.NEVER;
      }
      return valor;
    });

export const estacionamentoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  endereco: z.string().trim().min(2, "Informe o endereço.").max(120),
  cidade: z.string().trim().max(60).optional(),
  telefone: z.string().trim().max(20).optional(),
  horario: z.string().trim().max(80).optional(),
  descricao: z.string().trim().max(240, "Descrição muito longa.").optional(),
  latitude: coordenada(90, "Latitude"),
  longitude: coordenada(180, "Longitude"),
  publicado: z.boolean().default(true),
});

export const novaVagaSchema = z.object({
  numero: z.string().trim().min(1, "Informe o número da vaga.").max(10),
  tipo: z.enum(TIPOS_VAGA),
  setor: z.string().trim().max(40).optional(),
  coberta: z.boolean(),
  reservavel: z.boolean(),
});

export const ajusteVagaSchema = z.object({
  vagaId: z.uuid(),
  ativa: z.boolean(),
  reservavel: z.boolean(),
  motivoBloqueio: z.string().trim().max(80).optional(),
});

export const operadorSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome.").max(80),
  email: z.email("E-mail inválido."),
  senha: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(100),
});

export async function atualizarConfiguracao(
  contexto: Contexto,
  entrada: z.input<typeof configuracaoSchema>,
) {
  const d = configuracaoSchema.parse(entrada);
  const dados = {
    toleranciaMin: d.toleranciaMin,
    primeiraHoraCentavos: d.primeiraHora,
    horaAdicionalCentavos: d.horaAdicional,
    diariaCentavos: d.diaria,
    alertaPermanenciaH: d.alertaPermanenciaH,
    carenciaMensalidadeDias: d.carenciaMensalidadeDias,
    antecedenciaMinMin: d.antecedenciaMinMin,
    antecedenciaMaxDias: d.antecedenciaMaxDias,
    duracaoMaxH: d.duracaoMaxH,
    expiracaoPendenteMin: d.expiracaoPendenteMin,
    cancelamentoPrazoH: d.cancelamentoPrazoH,
    retencaoPct: d.retencaoPct,
    bloqueioAvulsoH: d.bloqueioAvulsoH,
    chegadaAntecipadaMin: d.chegadaAntecipadaMin,
    chavePix: d.chavePix || null,
  };
  if (dados.diariaCentavos < dados.primeiraHoraCentavos) {
    throw new ErroDeNegocio("diaria_menor", "A diária não pode ser menor que a primeira hora.");
  }

  await prisma.$transaction(async (tx) => {
    const antes = await tx.configuracao.findUniqueOrThrow({
      where: { estacionamentoId: contexto.estacionamentoId },
    });
    await tx.configuracao.update({
      where: { estacionamentoId: contexto.estacionamentoId },
      data: dados,
    });
    // Trilha de quem mexeu em preço e regras: só o que de fato mudou.
    const mudancas = Object.fromEntries(
      Object.entries(dados)
        .filter(([campo, valor]) => antes[campo as keyof typeof antes] !== valor)
        .map(([campo, valor]) => [
          campo,
          { de: antes[campo as keyof typeof antes] as string | number | null, para: valor },
        ]),
    );
    if (Object.keys(mudancas).length > 0) {
      await registrarAuditoria(tx, contexto, {
        acao: "config.atualizada",
        entidade: "configuracao",
        dados: mudancas,
      });
    }
  });
}

export async function atualizarEstacionamento(
  contexto: Contexto,
  entrada: z.input<typeof estacionamentoSchema>,
) {
  const d = estacionamentoSchema.parse(entrada);
  if ((d.latitude === null) !== (d.longitude === null)) {
    throw new ErroDeNegocio(
      "coordenadas",
      "Informe latitude e longitude juntas (ou deixe as duas vazias).",
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.estacionamento.update({
      where: { id: contexto.estacionamentoId },
      data: {
        nome: d.nome,
        endereco: d.endereco,
        cidade: d.cidade || null,
        telefone: d.telefone || null,
        horario: d.horario || null,
        descricao: d.descricao || null,
        latitude: d.latitude,
        longitude: d.longitude,
        publicado: d.publicado,
      },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "estacionamento.atualizado",
      entidade: "estacionamento",
      entidadeId: contexto.estacionamentoId,
      dados: { publicado: d.publicado, cidade: d.cidade ?? null },
    });
  });
}

export async function criarVaga(contexto: Contexto, entrada: z.input<typeof novaVagaSchema>) {
  const d = novaVagaSchema.parse(entrada);
  const { estacionamentoId } = contexto;
  const existente = await prisma.vaga.findFirst({
    where: { estacionamentoId, numero: d.numero },
    select: { id: true },
  });
  if (existente) throw new ErroDeNegocio("vaga_duplicada", `Já existe a vaga ${d.numero}.`);

  return prisma.$transaction(async (tx) => {
    const setor = d.setor
      ? await tx.setor.upsert({
          where: { estacionamentoId_nome: { estacionamentoId, nome: d.setor } },
          create: { estacionamentoId, nome: d.setor },
          update: {},
          select: { id: true },
        })
      : null;
    const vaga = await tx.vaga.create({
      data: {
        estacionamentoId,
        setorId: setor?.id ?? null,
        numero: d.numero,
        tipo: d.tipo,
        coberta: d.coberta,
        reservavel: d.reservavel,
      },
      select: { id: true },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "vaga.criada",
      entidade: "vaga",
      entidadeId: vaga.id,
      dados: { numero: d.numero },
    });
    return vaga;
  });
}

/** RF-02/02b: bloquear (com motivo) e liberar para reserva. Desligar a reserva não cancela as já feitas (RN-07). */
export async function ajustarVaga(contexto: Contexto, entrada: z.input<typeof ajusteVagaSchema>) {
  const d = ajusteVagaSchema.parse(entrada);
  if (!d.ativa && !d.motivoBloqueio)
    throw new ErroDeNegocio("motivo", "Informe o motivo do bloqueio.");

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.vaga.updateMany({
      where: { id: d.vagaId, estacionamentoId: contexto.estacionamentoId },
      data: {
        ativa: d.ativa,
        reservavel: d.reservavel,
        motivoBloqueio: d.ativa ? null : d.motivoBloqueio,
      },
    });
    if (count === 0) throw new ErroDeNegocio("vaga_inexistente", "Vaga não encontrada.");
    await registrarAuditoria(tx, contexto, {
      acao: "vaga.ajustada",
      entidade: "vaga",
      entidadeId: d.vagaId,
      dados: { ativa: d.ativa, reservavel: d.reservavel, motivo: d.motivoBloqueio ?? null },
    });
  });
}

/** Vaga com histórico não se apaga (some da auditoria); o caminho é bloquear. */
export async function excluirVaga(contexto: Contexto, vagaId: string) {
  const vaga = await prisma.vaga.findFirst({
    where: { id: vagaId, estacionamentoId: contexto.estacionamentoId },
    select: {
      numero: true,
      _count: { select: { estadias: true, reservas: true, assinaturasFixas: true } },
    },
  });
  if (!vaga) throw new ErroDeNegocio("vaga_inexistente", "Vaga não encontrada.");
  const { estadias, reservas, assinaturasFixas } = vaga._count;
  if (estadias + reservas + assinaturasFixas > 0) {
    throw new ErroDeNegocio(
      "vaga_com_historico",
      `A vaga ${vaga.numero} tem histórico. Bloqueie em vez de excluir.`,
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.vaga.delete({ where: { id: vagaId } });
    await registrarAuditoria(tx, contexto, {
      acao: "vaga.excluida",
      entidade: "vaga",
      entidadeId: vagaId,
      dados: { numero: vaga.numero },
    });
  });
}

/** RF-08: o dono cria operadores. Mesmo caminho do seed: usuário + conta de e-mail/senha. */
export async function criarOperador(contexto: Contexto, entrada: z.input<typeof operadorSchema>) {
  const d = operadorSchema.parse(entrada);
  const email = d.email.toLowerCase();
  const existente = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existente) throw new ErroDeNegocio("email_em_uso", "Esse e-mail já tem cadastro.");

  const id = randomUUID();
  const senhaHash = await hashPassword(d.senha);
  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id,
        name: d.nome,
        email,
        emailVerified: true,
        papel: "operador",
        estacionamentoId: contexto.estacionamentoId,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: id,
            providerId: "credential",
            password: senhaHash,
          },
        },
      },
    });
    await registrarAuditoria(tx, contexto, {
      acao: "operador.criado",
      entidade: "user",
      entidadeId: id,
      dados: { email },
    });
  });
}
