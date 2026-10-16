import pacote from "../../package.json";

export const VERSAO = pacote.version;

export const COMMIT =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.GIT_COMMIT ?? "local";
