import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart, Trophy } from "lucide-react";
import imgleve from "@/assets/imgleve.webp";
import logo from "@/assets/logo-onurb.webp";
import imgNivus from "@/assets/nivushl.jpg";

interface CampanhaAnterior {
  id: number;
  nome: string;
  descricao: string;
  imagem: string;
  data: string;
  cotaGanhadora: string;
  nomeGanhador: string;
}

const campanhaAtiva = {
  nome: "20.000,00 no seu PIX!",
  descricao: "Essa é pra acabar rápido!",
  imagem: imgleve,
  data: "Em andamento",
};

const campanhasAnteriores: CampanhaAnterior[] = [
 {
     id: 1,
     nome: "Nivus Highline Zero KM",
     descricao: "",
     imagem: imgNivus,
     data: "04/04/2026 às 20:30",
     cotaGanhadora: "022911",
     nomeGanhador: "Mateus Vilarindo",
   },
];

const Campanhas = () => {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        @keyframes cyanPulse {
          0%, 100% {
            box-shadow: 0 0 0 rgba(34, 211, 238, 0), 0 0 18px rgba(34, 211, 238, 0.30);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(34, 211, 238, 0.12), 0 0 30px rgba(34, 211, 238, 0.60);
            transform: scale(1.01);
          }
        }
      `}</style>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground">
              <ArrowLeft size={20} />
            </button>
            <img src={logo} alt="Onurb Digital" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-base font-bold text-primary leading-tight">⚡ Campanhas</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Escolha sua sorte</p>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-5 space-y-5">

          {/* Campanha Ativa */}
<div
  className="rounded-xl overflow-hidden border border-primary/30 bg-card cursor-pointer active:opacity-90 transition-opacity"
  onClick={() => navigate("/")}
>
  <div className="relative">
    <img
      src={campanhaAtiva.imagem}
      alt={campanhaAtiva.nome}
      className="w-full aspect-video object-cover"
    />
    <span className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
      ATIVA
    </span>
  </div>
  <div className="p-4 space-y-3">
    <div>
      <p className="font-bold text-foreground">{campanhaAtiva.nome}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{campanhaAtiva.descricao}</p>
    </div>
    <div className="flex items-center justify-between">
      <span
        style={{ animation: "cyanPulse 1.6s ease-in-out infinite" }}
        className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-bold px-4 py-2 rounded-lg shadow-[0_0_16px_rgba(34,211,238,0.4)]"
      >
        <ShoppingCart size={14} />
        Adquira Já!
      </span>
      <span className="text-xs text-muted-foreground">{campanhaAtiva.data}</span>
    </div>
  </div>
</div>

          {/* Campanhas Anteriores */}
          {campanhasAnteriores.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Campanhas anteriores
              </p>
              {campanhasAnteriores.map((c) => (
                <div key={c.id} className="flex gap-3 bg-card border border-border rounded-xl p-3">
                  <img
                    src={c.imagem}
                    alt={c.nome}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-bold text-foreground text-sm leading-tight">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.descricao}</p>
                    <span className="inline-flex items-center bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      Concluído
                    </span>
<div
  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg mt-0.5"
  style={{ backgroundColor: "#facc15", color: "#000000" }}
>
  <Trophy size={10} />
  Cota {c.cotaGanhadora} — {c.nomeGanhador}
</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 pt-0.5">
                    {c.data}
                  </span>
                </div>
              ))}
            </div>
          )}

          {campanhasAnteriores.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">Nenhuma campanha anterior ainda.</p>
            </div>
          )}
        </main>

        <footer className="max-w-lg mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">ONURB SERVIÇOS DIGITAIS LTDA</p>
          <p className="text-xs text-muted-foreground">2024-2026</p>
        </footer>
      </div>
    </>
  );
};

export default Campanhas;
