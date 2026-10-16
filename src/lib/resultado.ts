// Padrão de retorno das actions (docs/MVP_v1.1.md §7.1): nunca stack trace para o cliente.
export type Resultado<T> =
  | { ok: true; dados: T }
  | { ok: false; erro: { codigo: string; mensagem: string } };

export function sucesso<T>(dados: T): Resultado<T> {
  return { ok: true, dados };
}

export function falha(codigo: string, mensagem: string): Resultado<never> {
  return { ok: false, erro: { codigo, mensagem } };
}

/** Erro esperado de regra de negócio; a mensagem vai direto para o toast. */
export class ErroDeNegocio extends Error {
  constructor(
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem);
  }
}
