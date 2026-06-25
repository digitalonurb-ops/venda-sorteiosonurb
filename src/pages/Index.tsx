import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Minus,
  Plus,
  ShoppingCart,
  Star,
  CheckCircle,
  X,
  Phone,
  Loader2,
  ChevronDown,
  ChevronUp,
  Award,
  Megaphone,
  Clock,
  MoreVertical,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicData } from "@/hooks/usePublicData";
import ImageCarousel from "@/components/ImageCarousel";
import logo from "@/assets/logotopo.png";
import { normalizeSettings } from "@/lib/siteSettings";

const Index = () => {
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(200);
  const [showTitulos, setShowTitulos] = useState(false);
  const [showRegulamento, setShowRegulamento] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [meusOrders, setMeusOrders] = useState<any[] | null>(null);
  const { data: publicData, isLoading, isFetching } = usePublicData();
  const loading = isLoading && publicData === undefined;
  const hasLoaded = publicData !== undefined;
  const prizeQuotas = publicData?.prize_quotas ?? [];
  const activePromotions = publicData?.promotions ?? [];
  const siteSettings = publicData?.settings ?? {};
  const cfg = normalizeSettings(siteSettings);
  const quantityOptions = cfg.quantityOptions;
  const unitPrice = 0.03;
  const total = (quantity * unitPrice).toFixed(2).replace(".", ",");

const addPackage = (qty: number) => {
  setQuantity((prev) => Math.min(30000, prev + qty));
};

  const handleParticipate = () => {
    navigate("/checkout", { state: { quantity, total } });
  };

  const fmtPrize = (v: number) => {
    return Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="min-h-screen bg-background">
      <style>{`
  @keyframes neon-pulse {
    0%, 100% { box-shadow: 0 0 8px 2px #22d3ee, 0 0 20px 4px #22d3ee55; }
    50% { box-shadow: 0 0 18px 6px #22d3ee, 0 0 40px 10px #22d3ee33; }
  }

  @keyframes popular-pulse {
    0%, 100% {
      box-shadow: 0 0 0 rgba(250, 204, 21, 0), 0 0 10px rgba(250, 204, 21, 0.18);
      opacity: 0.95;
    }
    50% {
      box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.10), 0 0 16px rgba(250, 204, 21, 0.28);
      opacity: 1;
    }
  }

  @keyframes promo-pulse {
    0%, 100% {
      box-shadow: 0 0 8px 2px rgba(250, 204, 21, 0.4), 0 0 20px 4px rgba(250, 204, 21, 0.2);
      opacity: 0.95;
    }
    50% {
      box-shadow: 0 0 18px 6px rgba(250, 204, 21, 0.6), 0 0 40px 10px rgba(250, 204, 21, 0.3);
      opacity: 1;
    }
  }

  .neon-btn { animation: neon-pulse 2s ease-in-out infinite; }
  .popular-badge { animation: popular-pulse 1.8s ease-in-out infinite; }
  .promo-banner { box-shadow: none; }
`}</style>

      {/* Header */}
<header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
  <div className="max-w-lg mx-auto px-4 py-2 flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <img src={logo} alt="Onurb Digital" className="h-10 w-10 object-contain" />
      <h1 className="text-lg font-bold text-primary">{cfg.siteTitle}</h1>
    </div>
    <button
      onClick={() => navigate("/campanhas")}
      className="text-muted-foreground hover:text-foreground transition p-1"
    >
      <MoreVertical size={20} />
    </button>
  </div>
</header>

      <main className="max-w-lg mx-auto px-3 py-3 space-y-3">
        <ImageCarousel banner={siteSettings.banner} images={cfg.bannerImages} />

        {/* Progress Bar */}
{!hasLoaded ? (
  <Skeleton className="w-full h-6 rounded-lg" />
) : siteSettings.progress_bar?.ativa ? (
          <div className="relative w-full h-6 rounded-lg overflow-hidden"
            style={{ background: "#0f2a1a" }}>
            <div
              className="h-full rounded-lg transition-all duration-700 lightsaber-effect"
              style={{
                width: `${siteSettings.progress_bar.porcentagem}%`,
                background: "linear-gradient(90deg, #14532d 0%, #16a34a 60%, #4ade80 100%)",
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white drop-shadow">
              {siteSettings.progress_bar.porcentagem}%
            </span>
          </div>
        ) : null}

        {/* Meus títulos */}
        <button
          onClick={() => setShowTitulos(true)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-card border border-border rounded-lg text-foreground text-sm font-medium hover:bg-secondary transition"
        >
          <ShoppingCart size={16} />
          Minhas Compras
        </button>

        {/* Modal Meus Títulos */}
        {showTitulos && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground font-semibold">Minhas Compras</h3>
                <button onClick={() => setShowTitulos(false)} className="text-muted-foreground">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Insira o número de celular</p>
              <div className="flex items-center gap-2 border border-border rounded-lg bg-background px-3 py-2">
                <Phone size={16} className="text-muted-foreground" />
<input
  type="tel"
  inputMode="numeric"
  placeholder="(00) 00000-0000"
  value={telefone}
  onChange={(e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    let formatted = "";
    if (digits.length <= 2) formatted = digits.length ? `(${digits}` : "";
    else if (digits.length <= 7) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    else formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    setTelefone(formatted);
  }}
  className="flex-1 bg-transparent text-foreground text-sm outline-none"
/>
              </div>
              <button
                onClick={async () => {
                  if (!telefone.trim()) return;
                  setBuscando(true);
                  try {
                    const { data } = await supabase.functions.invoke("pix-payment", {
                      method: "POST",
                      body: { celular: telefone },
                      headers: { "x-action": "meus-titulos" },
                    });
                    setMeusOrders(data?.orders || []);
                  } catch {
                    setMeusOrders([]);
                  } finally {
                    setBuscando(false);
                  }
                }}
                disabled={buscando || !telefone.trim()}
                className="w-full bg-primary text-primary-foreground font-semibold py-2.5 rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {buscando ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Buscando...
                  </>
                ) : (
                  "Buscar"
                )}
              </button>

              {meusOrders !== null && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {meusOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center">Nenhuma compra encontrada!</p>
                  ) : (
                    meusOrders.map((order: any) => (
                      <div key={order.id} className="bg-background border border-border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {order.quantidade} cotas · R$ {order.valor}
                          </span>
                          <span className="text-primary font-semibold">Compra encontrada!</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {order.quotas
                            ?.sort((a: any, b: any) => (a.numero || "").localeCompare(b.numero || ""))
                            .map((q: any) => (
                              <span
                                key={q.numero}
                                className="bg-primary/10 text-foreground text-[10px] font-mono text-center rounded py-0.5"
                              >
                                {q.numero}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

{/* Price */}
{false && (
  <div className="flex items-center justify-center gap-3">
    <span className="text-sm text-muted-foreground">Somente</span>
    <span className="bg-card border border-primary/30 text-primary font-bold text-lg px-4 py-1 rounded-lg">
      R$ 0,03
    </span>
  </div>
)}

        {/* Promo Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔥</span>
            <span className="text-sm font-semibold text-primary">Promoção</span>
            <span className="text-xs text-muted-foreground">Compre agora e pague mais barato!</span>
          </div>
            <div className="w-full flex items-center justify-center gap-3 bg-primary/10 border border-primary/30 rounded-lg px-4 py-1.5 pointer-events-none select-none">
            <span className="text-sm text-muted-foreground line-through">R$ 0,05</span>
            <span className="text-xs text-muted-foreground">por apenas</span>
            <span className="text-base font-bold text-primary">R$ 0,03</span>
              <span className="bg-primary/20 text-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">-40%</span>
          </div>
        </div>

        {/* Banner prêmios */}
        <div className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground pointer-events-none select-none">
          <Star size={20} />
          {cfg.prizeBanner}
        </div>

        {/* Quantity text */}
        <p className="text-center text-sm text-muted-foreground">Quanto mais cotas, maior sua chance de ganhar!</p>

        {/* Active Promotions Banner - YELLOW tone */}
{!hasLoaded ? (
  <div className="space-y-2">
    <Skeleton className="w-full h-12 rounded-lg" />
  </div>
) : activePromotions.length > 0 ? (
          <div className="space-y-2">
            {activePromotions.map((promo, i) => (
              <div
                key={i}
                className="laser-border promo-banner w-full rounded-lg px-4 py-3 text-center font-bold text-sm"
                style={{ backgroundColor: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Megaphone size={16} />
                  <span>{promo.titulo}</span>
                </div>
                <p className="text-xs font-medium mt-1 opacity-90">{promo.descricao}</p>
                {promo.timer_minutos && promo.ativado_em && (
                  <PromoCountdown ativadoEm={promo.ativado_em} timerMinutos={promo.timer_minutos} />
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Quantity Grid */}
        <div className="grid grid-cols-2 gap-2">
          {quantityOptions.map((opt) => (
            <button
              key={opt.qty}
              onClick={() => addPackage(opt.qty)}
              className="relative border border-border bg-card rounded-lg py-3 text-center transition hover:border-primary active:bg-primary/10"
            >
              {opt.popular && (
                <span className="popular-badge absolute -top-2 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shadow-[0_0_10px_rgba(250,204,21,0.20)]">
                  Mais popular
                </span>
              )}
              <span className="text-xl font-bold text-foreground">+{opt.qty}</span>
              <p className="text-[10px] text-muted-foreground mt-0.5">ADICIONAR</p>
            </button>
          ))}
        </div>

        {/* Quantity Input + Buy Button */}
        <div className="space-y-2">
          <div className="flex items-center border border-border rounded-lg bg-card overflow-hidden">
            <button
              onClick={() => setQuantity((q) => Math.max(200, q - 1))}
              className="px-4 py-3 text-muted-foreground hover:text-foreground transition"
            >
              <Minus size={18} />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.min(30000, Math.max(200, parseInt(e.target.value) || 200)))}
              className="flex-1 text-center bg-transparent text-foreground font-semibold text-lg border-none outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => setQuantity((q) => Math.min(30000, q + 1))}
              className="px-4 py-3 text-muted-foreground hover:text-foreground transition"
            >
              <Plus size={18} />
            </button>
          </div>
          <button
            onClick={handleParticipate}
            className="neon-btn w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3.5 rounded-lg hover:brightness-110 transition"
          >
            <CheckCircle size={18} />
            <div className="text-center">
              <p className="text-xs font-medium">QUERO PARTICIPAR</p>
              <p className="text-sm font-bold">R$ {total}</p>
            </div>
          </button>
        </div>

        {/* Prize Quotas Display */}
        {!hasLoaded ? (
  <div className="space-y-2">
    <Skeleton className="w-40 h-5 mx-auto rounded" />
    <Skeleton className="w-full h-16 rounded-lg" />
    <Skeleton className="w-full h-16 rounded-lg" />
  </div>
) : prizeQuotas.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <Award size={16} className="text-accent" />
              <span className="text-sm font-bold text-accent">Cotas Premiadas</span>
            </div>
            {prizeQuotas.map((pq, i) => (
              <div key={i} className="bg-card border border-accent/30 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-accent/20 text-accent font-mono font-bold px-3 py-1 rounded text-sm">
                    {pq.numero}
                  </span>
                  <div>
                    <p className="text-xs text-foreground font-bold">Prêmio: R$ {fmtPrize(pq.premio_valor)}</p>
                    {pq.premio_descricao && <p className="text-[10px] text-muted-foreground">{pq.premio_descricao}</p>}
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    pq.vendida ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"
                  }`}
                >
                  {pq.vendida ? "Vendida" : "Disponível"}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRegulamento((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3"
          >
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">Descrição/Regulamento</span>
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-cyan-400 text-black">
              {showRegulamento ? (
                <>
                  <ChevronUp size={12} /> Fechar
                </>
              ) : (
                <>
                  <ChevronDown size={12} /> Ler Regulamento
                </>
              )}
            </span>
          </button>

          {showRegulamento && (
            <div className="px-4 pb-4 border-t border-border pt-3">
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{cfg.regulamento}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const PromoCountdown = ({ ativadoEm, timerMinutos }: { ativadoEm: string; timerMinutos: number }) => {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const update = () => {
      const expiresAt = new Date(ativadoEm).getTime() + timerMinutos * 60 * 1000;
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setRemaining("");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [ativadoEm, timerMinutos]);
  if (!remaining) return null;
  return (
    <p className="text-xs mt-1 flex items-center justify-center gap-1 opacity-80">
      <Clock size={12} /> Acaba em: {remaining}
    </p>
  );
};

export default Index;
