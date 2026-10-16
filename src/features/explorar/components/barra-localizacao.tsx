"use client";

import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useLocalizacao } from "../use-localizacao";

/** Onde você está: GPS ou endereço. A distância de cada estacionamento sai daqui. */
export function BarraLocalizacao({ loc }: { loc: ReturnType<typeof useLocalizacao> }) {
  const [texto, setTexto] = useState("");

  return (
    <div className="textura-asfalto space-y-3 rounded-[var(--radius-superficie)] p-4 text-white sm:p-5">
      {loc.local ? (
        <div className="flex items-center gap-3">
          <span className="bg-faixa text-tinta grid size-10 shrink-0 place-items-center rounded-full">
            <MapPin className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-300">Distâncias a partir de</p>
            <p className="truncate font-semibold">{loc.local.rotulo}</p>
          </div>
          <button
            type="button"
            onClick={loc.limpar}
            className="grid size-10 place-items-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Trocar localização"
            title="Trocar localização"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      ) : (
        <>
          <p className="font-display text-2xl leading-tight font-bold">Onde você vai estacionar?</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form
              className="flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void loc.buscarEndereco(texto);
              }}
            >
              <Input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Digite um endereço, bairro ou cidade"
                aria-label="Endereço"
                className="text-tinta border-white/20 bg-white"
              />
              <Button
                type="submit"
                variant="destaque"
                disabled={loc.buscando || texto.trim().length < 3}
                aria-label="Buscar endereço"
              >
                {loc.buscando ? (
                  <Loader2 className="animate-spin" aria-hidden />
                ) : (
                  <Search aria-hidden />
                )}
              </Button>
            </form>
            <Button
              variant="secondary"
              onClick={loc.usarGps}
              disabled={loc.buscando}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
            >
              <Crosshair aria-hidden />
              Usar minha localização
            </Button>
          </div>
        </>
      )}
      {loc.erro && (
        <p role="alert" className="text-sm text-amber-200">
          {loc.erro}
        </p>
      )}
    </div>
  );
}
