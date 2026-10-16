/** Só caminhos internos ("/cliente/..."): evita usar o ?voltar= para mandar alguém a outro site. */
export function caminhoSeguro(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return undefined;
  return valor;
}
