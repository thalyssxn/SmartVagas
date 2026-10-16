import { MolduraSite } from "@/components/site/moldura-site";
import { contarAvisosNaoLidos, gerarAvisosDeTempo } from "@/features/avisos/servico";
import { exigirCliente } from "@/server/sessao";

export default async function LayoutCliente({ children }: { children: React.ReactNode }) {
  const cliente = await exigirCliente("/cliente");
  // Sem cron: reserva perto do fim vira aviso quando o motorista abre o app.
  await gerarAvisosDeTempo(cliente.usuarioId, new Date());
  const avisos = await contarAvisosNaoLidos(cliente.usuarioId);

  return (
    <MolduraSite largura="max-w-3xl" usuario={{ tipo: "motorista", nome: cliente.nome, avisos }}>
      {children}
    </MolduraSite>
  );
}
