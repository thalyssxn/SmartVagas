import { MolduraSite } from "@/components/site/moldura-site";

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return <MolduraSite>{children}</MolduraSite>;
}
