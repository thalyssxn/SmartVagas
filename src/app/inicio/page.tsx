import { redirect } from "next/navigation";
import { obterSessao } from "@/server/sessao";

// Depois do login cada perfil cai na sua tela: motorista no portal, administrador no painel, operador no pátio.
export default async function Inicio() {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");
  const { papel } = sessao.user;
  redirect(papel === "motorista" ? "/cliente" : papel === "dono" ? "/hoje" : "/patio");
}
