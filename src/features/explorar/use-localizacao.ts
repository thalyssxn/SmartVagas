"use client";

import { useCallback, useEffect, useState } from "react";
import type { Coordenadas } from "@/lib/distancia";

export type Localizacao = Coordenadas & { origem: "gps" | "endereco"; rotulo: string };

const CHAVE = "smartvagas:localizacao";

function ler(): Localizacao | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as Localizacao) : null;
  } catch {
    return null;
  }
}

function gravar(valor: Localizacao | null) {
  try {
    if (valor) window.localStorage.setItem(CHAVE, JSON.stringify(valor));
    else window.localStorage.removeItem(CHAVE);
  } catch {
    // Navegação privada ou armazenamento bloqueado: segue só em memória.
  }
}

/**
 * Onde o motorista está: GPS do aparelho ou um endereço digitado.
 * Fica lembrado neste navegador para a busca e a agenda de eventos.
 */
export function useLocalizacao() {
  const [local, setLocal] = useState<Localizacao | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const salvo = ler();
    // Leitura única do armazenamento do navegador ao montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (salvo) setLocal(salvo);
  }, []);

  const definir = useCallback((valor: Localizacao | null) => {
    setLocal(valor);
    gravar(valor);
    setErro(null);
  }, []);

  const usarGps = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setErro("Este navegador não informa a localização. Digite um endereço.");
      return;
    }
    setBuscando(true);
    setErro(null);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        setBuscando(false);
        definir({
          latitude: posicao.coords.latitude,
          longitude: posicao.coords.longitude,
          origem: "gps",
          rotulo: "Sua localização atual",
        });
      },
      (falha) => {
        setBuscando(false);
        setErro(
          falha.code === falha.PERMISSION_DENIED
            ? "Você não permitiu o acesso à localização. Digite um endereço ou libere nas configurações do navegador."
            : "Não deu para descobrir sua localização agora. Digite um endereço.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 120_000 },
    );
  }, [definir]);

  /** Endereço → coordenadas pelo OpenStreetMap (Nominatim), direto do navegador do motorista. */
  const buscarEndereco = useCallback(
    async (texto: string) => {
      const consulta = texto.trim();
      if (consulta.length < 3) return;
      setBuscando(true);
      setErro(null);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(consulta)}`;
        const resposta = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
        const dados = (await resposta.json()) as {
          lat: string;
          lon: string;
          display_name: string;
        }[];
        if (!dados[0]) {
          setErro("Não encontramos esse endereço. Tente rua, número e cidade.");
          return;
        }
        definir({
          latitude: Number(dados[0].lat),
          longitude: Number(dados[0].lon),
          origem: "endereco",
          rotulo: dados[0].display_name.split(",").slice(0, 3).join(","),
        });
      } catch {
        setErro("Sem conexão com o serviço de mapas. Tente a localização do aparelho.");
      } finally {
        setBuscando(false);
      }
    },
    [definir],
  );

  return { local, buscando, erro, usarGps, buscarEndereco, limpar: () => definir(null) };
}
