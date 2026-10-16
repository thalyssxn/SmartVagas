// Skeleton do mapa: feedback em < 1 s enquanto o servidor responde.
export default function CarregandoPatio() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,24rem)_1fr]" aria-busy="true">
      <div className="h-14 animate-pulse rounded-lg bg-slate-200" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
