import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
// Fontes locais (sem depender do Google Fonts no build): Barlow lembra a sinalização de rodovia.
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SmartVagas", template: "%s · SmartVagas" },
  description:
    "Encontre e reserve vaga perto de você, e gerencie o estacionamento do pátio ao lucro do mês.",
};

export const viewport: Viewport = { themeColor: "#1b222d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
