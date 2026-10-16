# MVP - Smart Vagas - Gerenciador de Estacionamentos com Aluguel de Vagas

**Versão:** 1.1 | **Data:** 02/10/2026 | **Base:** v1.0 (02/10/2026) + revisão técnica

**Decisões fechadas:**

- Modelo Mensalista + Avulso
- Perfis `dono`, `operador`, `motorista` (não existe "gerente": é o dono)
- Pagamento de reserva: Pix dinâmico via gateway, **na conta do próprio dono**, com confirmação automática por webhook. Fallback: dono marca como pago. Sem upload de comprovante.
- Stack: Next.js 16 + Prisma 7 + Postgres + Better Auth. Supabase/Neon apenas como Postgres gerenciado em produção.
- Entrega em 2 fases: **Fase 1 = gestão do dono**, **Fase 2 = reservas + Pix**
- Paleta definida (§7.3)

**Premissas a validar com o dono piloto** (não bloqueiam código, bloqueiam go-live):

| # | Pergunta | Se a resposta for "não" |
|---|---|---|
| P1 | As vagas são numeradas e o motorista estaciona sozinho? | Com manobrista/carro preso, o controle vira por capacidade: muda mapa, vaga sugerida e reserva. |
| P2 | Imprime ticket hoje? | Sem impressora a saída é pela placa (já é o fluxo padrão). |
| P3 | Formas de pagamento aceitas (dinheiro, Pix, maquininha)? | Ajusta o enum `FormaPagamento`. |
| P4 | Moto paga diferente de carro? | v1.1 assume tabela de preço única. |
| P5 | Hospedagem de produção (§7.2) | - |

## 1. Visão e Problema - Foco no DONO

**Dono alvo:** pessoa física / pequeno empresário com 1 estacionamento no centro de Sorocaba (alta rotatividade, comércio, pouca vaga na rua).
**Dor:** controle em papel/caderno/WhatsApp, não sabe o lucro real, perde vaga com mensalista inadimplente, não sabe quem está dentro, operador lento no pico.
**Proposta:** gestão simples para o dono (mapa, entrada/saída, mensalistas, equipe, custo vs ganho). **Diferencial:** liberar algumas vagas para reserva online paga antecipadamente.
**Sucesso do MVP =** 1 dono no centro de Sorocaba operando 30 dias 100% no sistema, sabendo o lucro do mês em 1 clique.

## 2. Escopo

### Fase 1 - Gestão do dono (Must)

- Cadastro de estacionamento, setores e vagas (número, tipo `comum/pcd/idoso/moto/eletrica`, `coberta` sim/não)
- Por vaga: `ativa` (+ motivo do bloqueio) e `reservavel` ON/OFF
- Mapa de ocupação: livre / ocupada / reservada / bloqueada + selo de reservável. Na Fase 1, "reservada" = vaga fixa de mensalista que não está dentro.
- Entrada e saída **por placa em um único campo** (< 15 s)
- Quem está dentro + histórico por placa/período + alerta de permanência
- Lançamento retroativo (plano B offline, opção A)
- Tabela de preços e configurações editáveis pelo dono
- Planos mensais com janela de dias/horário + mensalistas cadastrados pelo dono + baixa de mensalidade
- Equipe (salário + encargos) + custos + lançamento da folha do mês + painel Receita - Custo = Lucro + CSV
- Caixa por turno
- Usuários dono/operador + `audit_logs`

### Fase 2 - Diferencial reserva

- Portal do motorista: cadastro/login, veículos, minhas reservas, histórico
- Busca de disponibilidade, reserva com Pix dinâmico via gateway, expiração em 15 min, cancelamento com retenção
- Anti-overbooking com exclusion constraint no Postgres
- (Could) mensalidade via Pix do gateway, reaproveitando a integração

### OUT (V2+)

Cartão online, split, reembolso automático, marketplace, app nativo, LPR, cancela/QR, NF-e, repasse, multi-filial, PWA offline (opções B e C), lista de espera automática, preço dinâmico.

### Removido na v1.1

PIN de 4 dígitos · bloqueio por no-show (RN-03) · upload de comprovante · motorista assinando plano sozinho · fechamento configurável diário/semanal/mensal · taxa de cancelamento paga via chave Pix.

## 3. Personas

1. **Dono (Paulo, 52):** quer ver em 1 tela quantos carros estão dentro, quanto entrou hoje, quem está atrasado e se deu lucro no mês. Usa celular + PC do guichê.
2. **Operador:** entrada/saída em < 15 s no pico, sem errar vaga nem preço.
3. **Motorista (Fase 2):** quer garantir vaga reservando antes. Só vê vagas que o dono liberou.

## 4. Requisitos Funcionais

### Fase 1

- **RF-01** CRUD estacionamento (nome, endereço, horário). Lotação = contagem de vagas ativas (não é campo editável).
- **RF-02** CRUD setores e vagas; bloqueio = `ativa=false` + motivo.
- **RF-02b** `reservavel` e `ativa` por vaga (ver RN-07).
- **RF-03** Configurações do dono, sem redeploy: tolerância, 1ª hora, hora adicional, diária, alerta de permanência, carência de mensalidade. Fase 2 acrescenta regras de reserva, prazo de cancelamento, retenção, expiração do Pix e credencial do gateway.
- **RF-04** Entrada/saída por placa: o operador digita a placa.
  - Se a placa **está dentro**: mostra a saída com o valor calculado e a forma de pagamento (dinheiro/pix/cartão).
  - Se **está fora**: mostra a entrada com vaga sugerida (livre e ativa; prioriza não-reservável; mensalista com vaga fixa vai para a dele).
  - O valor é sempre calculado no servidor.
- **RF-04b** Quem está dentro (placa, vaga, entrada, tempo decorrido, alerta) + histórico com filtro por placa/período.
- **RF-04c** Lançamento retroativo: entrada/saída com horário informado manualmente, marcado `retroativo` e auditado.
- **RF-06** Planos (nome, valor, dias da semana, janela horária) + mensalistas (pessoa + veículos + plano + vaga fixa opcional) + baixa de mensalidade (avança o vencimento em 1 mês).
- **RF-07** Painel Hoje: vagas livres/ocupadas, entradas/saídas, receita por forma de pagamento, alertas.
- **RF-07b** Equipe: CRUD funcionários (nome, função, salário, encargos, ativo, usuário opcional). Só o dono vê valores.
- **RF-07c** Financeiro: custos (categoria, valor, data, descrição). O botão "Lançar folha do mês" gera um custo por funcionário ativo (snapshot: mudar salário depois não altera meses passados). Painel do mês: receita - custos = lucro, exportável em CSV.
- **RF-07d** Caixa por turno: o operador abre (troco inicial) e fecha informando o valor contado. Esperado = troco + recebimentos **em dinheiro** no turno. A diferença é registrada e o dono confere.
- **RF-08** O dono cria operadores (e-mail + senha). Sem cadastro público na Fase 1.

### Fase 2

- **RF-09** Cadastro/login do motorista + veículos.
- **RF-10** Busca de disponibilidade por período e tipo (apenas `ativa AND reservavel`).
- **RF-11** Reserva: o sistema escolhe a vaga e gera um código curto. A entrada é pela placa; o código é fallback se vier outro carro.
- **RF-11b** Pagamento: cria cobrança Pix dinâmica no gateway do dono → webhook (assinatura validada + reconsulta na API) → `confirmada`. Pendente expira em 15 min (configurável). Máximo de 1 reserva pendente por motorista. Fallback: o dono marca como paga.
- **RF-12** Minhas reservas + status da mensalidade (mensalista criado pelo dono é vinculado ao login por e-mail).
- **RF-13** Histórico de usos e gastos.
- **RF-14** Anti-overbooking: reserva × reserva por exclusion constraint; reserva × avulso pela RN-10.
- **RF-15** Reserva confirmada segura a vaga até o fim da janela. No-show não tem reembolso.

## 5. Regras de Negócio

- **RN-01** Tolerância: 15 min grátis (configurável).
- **RN-02** (Fase 2) Reserva: antecedência mínima 1 h, máxima 7 dias, duração máxima 12 h (todas configuráveis). Cancelamento até 2 h antes (configurável) → reembolso integral, feito manualmente pelo dono e registrado (`reembolso_pendente` → `reembolsada`). Depois disso → retenção de X% (padrão 100%, configurável).
- **RN-03** *Removida.* Com pagamento antecipado, o no-show já paga.
- **RN-04** Vaga fixa de mensalista é exclusiva dele e aparece como "reservada" quando ele não está. Mensalista rotativo não tem número garantido.
- **RN-05** Preço avulso, em centavos:
  - minutos ≤ tolerância → 0
  - cada bloco completo de 24 h cobra 1 diária
  - resto do último bloco: ≤ tolerância → 0; senão `min(diária, 1ª hora + ceil((resto - 60) / 60) × adicional)`
  - mensalista `em_dia` ou `atrasada`: cobra só os minutos fora da janela do plano (somados, mesma fórmula)
  - (Fase 2) reserva: período reservado já foi pago; o excedente é cobrado como avulso
- **RN-06** Mensalidade: vencimento no mesmo dia do mês seguinte ao período pago. Status calculado na leitura (sem cron):
  - `em_dia`: hoje ≤ vencimento
  - `atrasada`: até N dias após o vencimento (carência, padrão 5) → alerta na entrada, mantém vaga e plano
  - `suspensa`: após a carência → perde a vaga fixa, paga como avulso, não pode reservar
- **RN-07** Vaga não-reservável nunca aparece na busca. Desligar `reservavel` não cancela reservas existentes, só bloqueia novas.
- **RN-08** Financeiro em regime de caixa (vale a data do pagamento). Lucro = (estadias pagas + mensalidades + reservas pagas + retenções - reembolsos) - (custos do mês, incluindo a folha lançada). Sem conciliação bancária.
- **RN-09** Alertas: permanência > X h (padrão 12), mensalista atrasado/suspenso na entrada, (Fase 2) reserva prestes a expirar.
- **RN-10** *(novo, Fase 2)* Entrada avulsa não sugere vaga reservável com reserva começando nas próximas 3 h (configurável). O operador pode forçar, com aviso.
- **RN-11** *(novo)* Dinheiro sempre em centavos (inteiro). Horários gravados em UTC (`timestamptz`) e exibidos em `America/Sao_Paulo`.
- **RN-12** *(novo)* Placa nos formatos antigo e Mercosul, normalizada (maiúscula, sem hífen/espaço): `^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$`.
- **RN-13** *(novo)* No máximo uma estadia aberta por vaga e por placa, garantido por índice único parcial no banco.

## 6. Diferenciais

**Core:** gestão que o dono entende (carros dentro/fora + dinheiro entrando/saindo + equipe).

1. Reserva opcional: o dono escolhe quais vagas libera. Se desligar tudo, continua sendo um bom gerenciador.
2. Operação em 15 segundos: um campo de placa resolve entrada e saída.
3. Custo vs ganho em 1 clique, com encargos da folha incluídos (lucro honesto).
4. Pagamento antecipado da reserva desde o primeiro dia da Fase 2: sem no-show de graça.

## 7. Tecnologia

- **Next.js 16** (App Router, TypeScript strict). A UI usa Server Actions; `/api/v1` fica para health, webhook (Fase 2) e consumidores externos futuros.
- **Prisma 7 + Postgres 16** (driver adapter `pg`). SQL cru na migration quando o Prisma não gera (índices parciais, exclusion constraint).
- **Better Auth** (e-mail + senha, sessão em cookie, rate-limit embutido). Papel e estacionamento ficam no usuário.
- **Tailwind v4** + componentes no padrão shadcn/ui, `lucide-react`, `sonner` (toast).
- **Zod** em toda entrada; variáveis de ambiente validadas no boot.
- **Vitest** para regras de dinheiro; Playwright e2e de entrada/saída.
- **Removidos:** Supabase Auth/Storage (sem upload), `TZ` via env (agora `APP_TIMEZONE`), Dockerfile do app (até decidir a hospedagem).
- **Adiados até o go-live:** Resend, Sentry, pino.

**Modelo de dados (Fase 1):** `users/sessions/accounts/verifications` (Better Auth), `estacionamentos`, `configuracoes`, `setores`, `vagas`, `estadias`, `planos`, `motoristas`, `veiculos`, `assinaturas`, `pagamentos_mensalidade`, `funcionarios`, `custos`, `turnos`, `audit_logs`. A Fase 2 acrescenta `reservas` e `cobrancas` em migration nova.

### 7.1 Padrões de Código

- KISS + YAGNI primeiro, SOLID pragmático. Nenhuma abstração antes de 2 ou 3 usos reais.
- **Domínio em português** (estadia, vaga, mensalista, diária); infraestrutura em inglês. Texto de interface em português.
- Estrutura: `src/app` (rotas), `src/features/<dominio>` (regras, queries, actions, componentes do domínio), `src/server` (db, auth, sessão, auditoria), `src/lib` (utilitários puros), `src/components/ui`. Máximo de ~200 linhas por arquivo.
- Regras de negócio ficam no banco (configurações); env só para infraestrutura e segredos.
- Actions retornam `{ ok: true, dados } | { ok: false, erro: { codigo, mensagem } }` + toast. Nunca stack trace para o cliente.
- TypeScript strict, sem `any`, ESLint + Prettier, Conventional Commits.
- Testes que valem ouro: preço (RN-05), cobertura do plano, status da mensalidade, placa, caixa; e2e de entrada/saída. Meta: 60%+ nas regras.

### 7.2 Ambiente e hospedagem

- **Dev:** `docker compose up -d` (Postgres 16) **ou** `npx prisma dev` (Postgres local sem Docker).
- **Prod (decidir antes do go-live):**
  - Gerenciado: Vercel Pro + Supabase/Neon pago ≈ US$ 45/mês, backup incluso, zero ops.
  - VPS com Docker: ~R$ 50/mês, mas backup e atualizações ficam por nossa conta.
  - Free tiers só servem para dev: Vercel Hobby é para uso não comercial; Supabase Free pausa por inatividade e não tem backup diário.
- **Env:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `APP_TIMEZONE`. Segredos só em `.env` / secrets do deploy.

### 7.3 Design System

Princípio: **vermelho só significa problema**, nunca "ocupada". Isso também resolve o daltonismo vermelho/verde. Status sempre com ícone + texto, nunca só cor.

| Token | Fundo | Texto | Ícone |
|---|---|---|---|
| Livre | `#F0FDF4` + borda `#16A34A` | `#14532D` | ✓ |
| Ocupada | `#334155` | branco | carro |
| Reservada | `#F59E0B` | `#451A03` | relógio |
| Bloqueada | `#E2E8F0` + hachura | `#475569` | cadeado |
| Alerta | `#DC2626` | branco | ! |
| Primária (ações) | `#1E40AF` | branco | - |

Livre é claro de propósito: o operador procura as vagas ocupadas e reservadas, e uma parede de verde sólido esconde isso. Todas as combinações passam no contraste mínimo de 4,5:1 (WCAG AA). A placa do carro aparece sempre no formato Mercosul (faixa azul `#003399`), porque é como o operador reconhece o veículo. Vaga reservável ganha um selo "R" no canto.

Regras: mobile-first, alvo de toque ≥ 44 px, fonte Inter, 1 ação principal por tela, só tema claro (legibilidade no sol), feedback < 1 s (toast, valor grande). Componentes únicos: Button, Input, CardVaga, BadgeStatus, Tabela.

### 7.4 Versionamento

- SemVer. `VERSION` na raiz espelhado no `package.json` (o CI confere). Tag `vX.Y.Z` a cada release.
- `GET /api/v1/health` → `{ version, env, commit, db }`. Versão no rodapé do painel.
- Migrations Prisma nunca são editadas depois de aplicadas; sempre migration nova.
- `CHANGELOG.md` no formato Keep a Changelog. Sem bloqueio de merge por bump de versão (dev solo).

## 8. Segurança + LGPD

- HTTPS, hash de senha pelo Better Auth (scrypt), sessão com expiração, rate-limit no login.
- **RBAC checado no servidor em toda action:**
  - `dono`: tudo.
  - `operador`: entrada/saída, quem está dentro, abrir/fechar o próprio caixa, baixa de mensalidade (auditada). Não vê salário, custos nem lucro; não edita preço, plano, vaga nem funcionário.
  - `motorista` (Fase 2): só os próprios dados.
- Webhook (Fase 2): assinatura + reconsulta da cobrança; idempotência pelo id da cobrança.
- Auditoria: entradas/saídas, lançamentos retroativos, baixas, mudanças de preço/configuração, fechamento de caixa.
- **LGPD:**
  - Base legal da placa = execução de contrato (operação). Não se pede consentimento no guichê; consentimento só para marketing (não há no MVP).
  - Placa de avulso anonimizada após 90 dias. A estadia e o valor ficam: são registro financeiro.
  - Dados de mensalista/motorista ficam enquanto houver contrato/conta. Exportar/excluir sob pedido.
- Backup diário + teste de restore antes do go-live.

## 9. MoSCoW + Aceite

- **Must (Fase 1):** mapa, entrada/saída < 15 s, quem está dentro + histórico, mensalistas + status, equipe + custos + lucro do mês, caixa por turno.
- **Must (Fase 2):** vaga reservável ON/OFF + reserva paga via Pix + anti-overbooking.
- **Should:** lançamento retroativo, CSV do financeiro.
- **Could:** mensalidade via Pix do gateway, lista de espera manual.
- **Won't (V2):** cartão online, app nativo, LPR, multi-filial.

**Aceite do MVP:** dono fecha o mês no sistema (receita - custos = lucro); 30 dias com 100% das entradas no sistema; (Fase 2) 10 reservas pagas sem overbooking; entrada/saída média < 15 s.

## 10. Métricas e Próximos Passos

**Métricas:** % ocupação, % reservas convertidas em estadia, inadimplência mensal, tempo médio de entrada/saída, diferença média de caixa.
**Roadmap V2:** cartão online + reembolso automático, preço dinâmico, lista de espera automática, LPR/portão.

## Apêndice - O que mudou da v1.0

| Tema | v1.0 | v1.1 | Motivo |
|---|---|---|---|
| Pagamento da reserva | 3 versões (no local / Pix manual / gateway) | Pix dinâmico via gateway na conta do dono | Expiração automática e zero trabalho no guichê exigem confirmação automática; evita comprovante falso |
| Expiração da reserva pendente | 60 min | 15 min + 1 pendente por motorista | Pix cai em segundos; 60 min permitia travar todas as vagas |
| Auth / banco | Supabase Auth + Prisma + Postgres no Docker | Better Auth + Prisma + Postgres puro | Prisma ignora RLS; dev precisa ser igual a prod |
| Valores de negócio | Parte em env (`TOLERANCIA_MIN`, `DIARIA_TETO`) | Só no banco | "Editável pelo dono sem redeploy" |
| Papéis | Admin / Dono / Gerente / Operador | dono / operador / motorista | Gerente era o próprio dono |
| Diária (RN-05) | Teto único | 1 diária por bloco de 24 h | Carro de 3 dias pagava 1 diária |
| Mensalidade | Carência 0 (RN-06b) e 5 dias (RN-06) ao mesmo tempo | em_dia → atrasada (5 dias) → suspensa | Contradição |
| Planos | Sem janela horária | Dias da semana + horário | Noturno/FDS não funcionavam |
| Caixa | Esperado = todas as receitas; período configurável | Esperado = só dinheiro; por turno | Pix e cartão não ficam na gaveta |
| Folha | Salário lido ao vivo | Snapshot mensal + encargos | Aumento mudava o lucro de meses passados; lucro inflado |
| Cancelamento | 1 dia antes, taxa via chave Pix | Prazo em horas, retenção sobre o já pago | Pagamento é antecipado; reserva no mesmo dia nunca cancelava grátis |
| No-show | Bloqueio 7 dias + libera vaga após 30 min | Sem bloqueio; vaga segura até o fim | Motorista já pagou |
| PIN | 4 dígitos no guichê | Removido (placa identifica) | Meta de 15 s |
| Overbooking | Só reserva × reserva | + reserva × avulso (RN-10) | Avulso não tem hora de saída |
| LGPD | Apagar placa em 90 dias, consentimento no cadastro | Anonimizar placa, manter estadia; base legal = contrato | Estadia é registro financeiro; avulso não dá consentimento |
| Offline | Fora do MVP | Opção A (retroativo) na Fase 1 | Custa quase nada e evita voltar ao caderno |
| Pastas | `src/{routes,pages,...}` | `src/app` + `src/features` | Convenção do App Router |
| Dockerfile / tags de imagem | Obrigatório | Só compose do Postgres até decidir hospedagem | Sem uso se o deploy for Vercel |
| CI | Bloqueia merge sem bump | Confere `VERSION` = `package.json` | Burocracia para dev solo |
