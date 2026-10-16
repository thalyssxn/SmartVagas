"use client";

import { coordenadasValidas, distanciaKm, formatarDistancia } from "@/lib/distancia";
import { useLocalizacao } from "../use-localizacao";

/** Distância até um ponto, usando a localização que o motorista já informou na busca. */
export function DistanciaAte({
  latitude,
  longitude,
}: {
  latitude: number | null;
  longitude: number | null;
}) {
  const { local } = useLocalizacao();
  if (!local || !coordenadasValidas(latitude, longitude)) return null;
  const km = distanciaKm(local, { latitude: latitude!, longitude: longitude! });
  return <span>{formatarDistancia(km)} de você</span>;
}
