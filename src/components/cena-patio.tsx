import { cn } from "@/lib/utils";

// Vagas vistas de cima: linhas brancas pintadas, carros ocupando algumas,
// e UMA vaga contornada de amarelo esperando o motorista (a reserva).
const LARGURA = 64;
const ALTURA = 112;
const COLUNAS = 7;

const CORES_CARRO = ["#5b6676", "#8b96a6", "#3b4656", "#c7ced8", "#6f4f3a", "#4a5c7a"];

// [fileira, coluna, índice de cor] dos carros estacionados.
const CARROS: [number, number, number][] = [
  [0, 0, 0],
  [0, 1, 3],
  [0, 3, 1],
  [0, 5, 2],
  [0, 6, 4],
  [1, 0, 5],
  [1, 2, 1],
  [1, 3, 0],
  [1, 4, 3],
  [1, 6, 2],
];
const RESERVADA: [number, number] = [0, 4];

function Carro({ x, y, cor, virado }: { x: number; y: number; cor: string; virado: boolean }) {
  const w = 40;
  const h = 78;
  const cx = x + (LARGURA - w) / 2;
  const cy = y + (ALTURA - h) / 2;
  const vidroFrente = virado ? cy + h - 26 : cy + 12;
  return (
    <g>
      <rect x={cx + 2} y={cy + 3} width={w} height={h} rx="11" fill="black" opacity="0.28" />
      <rect x={cx} y={cy} width={w} height={h} rx="11" fill={cor} />
      <rect
        x={cx + 5}
        y={vidroFrente}
        width={w - 10}
        height="14"
        rx="4"
        fill="#0e141c"
        opacity="0.75"
      />
      <rect
        x={cx + 6}
        y={cy + h / 2 - 9}
        width={w - 12}
        height="18"
        rx="4"
        fill="white"
        opacity="0.12"
      />
    </g>
  );
}

export function CenaPatio({
  className,
  rotulo = "Sua vaga",
}: {
  className?: string;
  rotulo?: string;
}) {
  const larguraTotal = COLUNAS * LARGURA + 20;
  const corredor = 70;
  const alturaTotal = ALTURA * 2 + corredor + 20;
  const fileiraY = (f: number) => 10 + f * (ALTURA + corredor);
  const [rf, rc] = RESERVADA;

  return (
    <svg
      viewBox={`0 0 ${larguraTotal} ${alturaTotal}`}
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label="Pátio visto de cima, com uma vaga reservada marcada em amarelo"
    >
      {[0, 1].map((f) => (
        <g key={f}>
          {Array.from({ length: COLUNAS + 1 }, (_, c) => (
            <rect
              key={c}
              x={10 + c * LARGURA - 1.5}
              y={fileiraY(f)}
              width="3"
              height={ALTURA}
              fill="white"
              opacity="0.55"
            />
          ))}
          <rect
            x="10"
            y={f === 0 ? fileiraY(f) : fileiraY(f) + ALTURA - 3}
            width={COLUNAS * LARGURA}
            height="3"
            fill="white"
            opacity="0.55"
          />
        </g>
      ))}

      {/* Faixa central tracejada do corredor. */}
      {Array.from({ length: 12 }, (_, i) => (
        <rect
          key={i}
          x={14 + i * 38}
          y={fileiraY(1) - corredor / 2 - 2}
          width="22"
          height="4"
          rx="1"
          fill="#f2c230"
        />
      ))}

      {CARROS.map(([f, c, cor]) => (
        <Carro
          key={`${f}-${c}`}
          x={10 + c * LARGURA}
          y={fileiraY(f)}
          cor={CORES_CARRO[cor]}
          virado={f === 1}
        />
      ))}

      {/* A vaga reservada. */}
      <g>
        <rect
          x={10 + rc * LARGURA + 6}
          y={fileiraY(rf) + 6}
          width={LARGURA - 12}
          height={ALTURA - 12}
          rx="6"
          fill="#f2c230"
          fillOpacity="0.16"
          stroke="#f2c230"
          strokeWidth="3"
          strokeDasharray="8 6"
        />
        <text
          x={10 + rc * LARGURA + LARGURA / 2}
          y={fileiraY(rf) + ALTURA / 2 + 10}
          textAnchor="middle"
          fontFamily="Barlow Condensed, sans-serif"
          fontWeight="800"
          fontSize="30"
          fill="#f2c230"
        >
          P
        </text>
        <text
          x={10 + rc * LARGURA + LARGURA / 2}
          y={fileiraY(rf) + ALTURA - 16}
          textAnchor="middle"
          fontFamily="Barlow, sans-serif"
          fontWeight="700"
          fontSize="10"
          fill="#f2c230"
        >
          {rotulo}
        </text>
      </g>
    </svg>
  );
}
