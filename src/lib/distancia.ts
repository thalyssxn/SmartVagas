export type Coordenadas = { latitude: number; longitude: number };

const RAIO_TERRA_KM = 6371;

function radianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

/** Distância em linha reta (fórmula de haversine), em km. */
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const dLat = radianos(b.latitude - a.latitude);
  const dLon = radianos(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radianos(a.latitude)) * Math.cos(radianos(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "350 m" até 1 km; depois "2,4 km" (e sem casa decimal a partir de 100 km). */
export function formatarDistancia(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 100) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

export function coordenadasValidas(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/** Link para o motorista traçar a rota no app de mapas que tiver no celular. */
export function linkComoChegar(destino: Coordenadas | null, endereco: string): string {
  const alvo = destino ? `${destino.latitude},${destino.longitude}` : endereco;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(alvo)}`;
}
