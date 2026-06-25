import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-onurb.webp";
import novologoOD from "@/assets/novologoOD.png";
import { useSiteSettings } from "@/lib/siteSettings";

const Resumo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cfg = useSiteSettings();
  const { quantity, total, nome, celular } = (location.state as {
    quantity: number;
    total: string;
    nome: string;
    celular: string;
  }) || { quantity: 50, total: "5,00", nome: "", celular: "" };

  const [displayQuantity, setDisplayQuantity] = useState(quantity);

  useEffect(() => {
    let mounted = true;

    const loadDisplayQuantity = async () => {
      setDisplayQuantity(quantity);

      try {
        const { data } = await supabase
          .from("promotions")
          .select("cotas_dobro, timer_minutos, ativado_em")
          .eq("ativa", true)
          .eq("cotas_dobro", true);

        const now = new Date();
        const doubleActive = (data || []).some((promotion) => {
          if (promotion.timer_minutos && promotion.ativado_em) {
            const expiresAt = new Date(
              new Date(promotion.ativado_em).getTime() + promotion.timer_minutos * 60 * 1000
            );
            return now < expiresAt;
          }

          return true;
        });

        if (mounted) {
          setDisplayQuantity(doubleActive ? quantity * 2 : quantity);
        }
      } catch {
        if (mounted) {
          setDisplayQuantity(quantity);
        }
      }
    };

    loadDisplayQuantity();

    return () => {
      mounted = false;
    };
  }, [quantity]);

  const handleFinalize = () => {
    navigate("/pagamento", { state: { quantity, total, nome, celular } });
  };

  return (
    <>
      <style>
        {`
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
        `}
      </style>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground">
              <ArrowLeft size={20} />
            </button>
            <img src={logo} alt="Onurb Digital" className="h-10 w-10 object-contain" />
            <h1 className="text-lg font-bold text-primary">{cfg.siteTitle}</h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <div className="text-center space-y-1">
            <ShoppingCart size={32} className="text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Informações da Compra</h2>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nome:</span>
              <span className="text-foreground font-medium">{nome}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Celular:</span>
              <span className="text-foreground font-medium">{celular}</span>
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Campanha:</span>
              <span className="text-foreground font-medium">{cfg.campaignName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quantidade de Cotas:</span>
              <span className="text-foreground font-medium">{displayQuantity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valor por Cota:</span>
              <span className="text-foreground font-medium">R$ 0,03</span>
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between">
              <span className="text-foreground font-semibold">Total da Compra:</span>
              <span className="text-primary font-bold text-lg">R$ {total}</span>
            </div>
          </div>

          <button
            onClick={handleFinalize}
            style={{ animation: "cyanPulse 1.6s ease-in-out infinite" }}
            className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg hover:brightness-110 transition-all duration-300 shadow-[0_0_24px_rgba(34,211,238,0.45)]"
          >
            Realizar o Pagamento
          </button>
        </main>

       <footer className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center gap-1.5 text-center">
      <p className="text-xs text-muted-foreground">Desenvolvido por</p>
      <img
        src={novologoOD}
        alt="Onurb Digital"
        className="h-3 w-auto object-contain opacity-90"
      />
       </footer>
       </div>
     </>
   );
 };

export default Resumo;
