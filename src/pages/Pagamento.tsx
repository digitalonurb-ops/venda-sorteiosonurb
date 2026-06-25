import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Loader2, QrCode, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo-onurb.webp";
import { useSiteSettings } from "@/lib/siteSettings";

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const Pagamento = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cfg = useSiteSettings();
  const { quantity, total, nome, celular } = (location.state as {
    quantity: number; total: string; nome: string; celular: string;
  }) || { quantity: 50, total: "5,00", nome: "", celular: "" };

  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrcode: string; copiaECola: string; txid: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<"pending" | "generating" | "paid" | "error" | "expired">("pending");
  const [generatedQuotas, setGeneratedQuotas] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS);
  const [displayQuantity, setDisplayQuantity] = useState(quantity);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pixCreatedAt = useRef<number>(0);

  const totalNumerico = (quantity * 0.03).toFixed(2);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  const startTimer = () => {
    pixCreatedAt.current = Date.now();
    setTimeLeft(TIMEOUT_MS);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - pixCreatedAt.current;
      const remaining = Math.max(0, TIMEOUT_MS - elapsed);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (pollRef.current) clearInterval(pollRef.current);
        setStatus("expired");
      }
    }, 1000);
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const gerarPix = async () => {
    setLoading(true);
    setStatus("pending");
    try {
      const { data, error } = await supabase.functions.invoke("pix-payment", {
        method: "POST",
        body: { valor: totalNumerico, nome, celular, quantidade: quantity },
        headers: { "x-action": "create" },
      });
      if (error) throw error;
      setPixData({ qrcode: data.qrcode, copiaECola: data.copiaECola, txid: data.txid });
      startTimer();
      pollPayment(data.txid);
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const pollPayment = (txid: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("pix-payment", {
          method: "POST",
          body: { txid },
          headers: { "x-action": "status" },
        });
        if (data?.status === "CONCLUIDA") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus("generating");
          if (data.quotas && data.quotas.length > 0) {
            setTimeout(() => {
              const sorted = [...data.quotas].sort((a: string, b: string) => a.localeCompare(b));
              setGeneratedQuotas(sorted);
              setStatus("paid");
            }, 3000);
          }
        }
      } catch { /* keep polling */ }
    }, 5000);
  };

  const copyPix = () => {
    if (pixData?.copiaECola) {
      navigator.clipboard.writeText(pixData.copiaECola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === "generating") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center space-y-6">
        <div className="relative"><div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" /></div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Gerando suas cotas...</h2>
          <p className="text-sm text-muted-foreground">Estamos gerando suas {displayQuantity.toLocaleString()} cotas aleatoriamente!</p>
        </div>
        <div className="flex gap-2">{[0, 1, 2].map((i) => (
          <div key={i} className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}</div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center space-y-6">
        <Clock size={48} className="text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Tempo expirado!</h2>
        <p className="text-sm text-muted-foreground">O prazo de 10 minutos para pagamento expirou. Gere um novo PIX para continuar.</p>
        <button onClick={() => { setPixData(null); setStatus("pending"); }} className="bg-primary text-primary-foreground font-bold py-3 px-8 rounded-lg">
          Gerar Novo PIX
        </button>
        <button onClick={() => navigate("/")} className="text-muted-foreground text-sm underline">Voltar ao início</button>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-3">
            <img src={logo} alt="Onurb Digital" className="h-10 w-10 object-contain" />
            <h1 className="text-lg font-bold text-primary">Onurb Garage | Campanhas</h1>
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
          <div className="text-center space-y-2">
            <CheckCircle size={48} className="text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Pagamento Confirmado!</h2>
            <p className="text-sm text-muted-foreground">Suas cotas da sorte foram geradas!</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Dados da Compra</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Nome:</span><span className="text-foreground font-medium">{nome}</span>
              <span className="text-muted-foreground">Celular:</span><span className="text-foreground font-medium">{celular}</span>
              <span className="text-muted-foreground">Cotas:</span><span className="text-foreground font-medium">{generatedQuotas.length.toLocaleString()}</span>
              <span className="text-muted-foreground">Valor:</span><span className="text-primary font-bold">R$ {total}</span>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Suas Cotas ({generatedQuotas.length.toLocaleString()})</h3>
            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-4 gap-1.5">
                {generatedQuotas.map((num) => (
                  <div key={num} className="bg-primary/10 border border-primary/20 rounded text-center py-1.5 text-xs font-mono font-semibold text-foreground">{num}</div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={() => navigate("/")} className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-lg">Voltar ao início</button>
        </main>
        <footer className="max-w-lg mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">ONURB SERVIÇOS DIGITAIS LTDA</p>
          <p className="text-xs text-muted-foreground">2024-2026</p>
        </footer>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes cyanPulse {
          0%, 100% { box-shadow: 0 0 0 rgba(34, 211, 238, 0), 0 0 18px rgba(34, 211, 238, 0.30); transform: scale(1); }
          50% { box-shadow: 0 0 0 6px rgba(34, 211, 238, 0.12), 0 0 30px rgba(34, 211, 238, 0.60); transform: scale(1.01); }
        }
      `}</style>

      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
          <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-muted-foreground"><ArrowLeft size={20} /></button>
            <img src={logo} alt="Onurb Digital" className="h-10 w-10 object-contain" />
            <h1 className="text-lg font-bold text-primary"> Seu Sorteio | Campanhas</h1>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">Pagamento via PIX</h2>
            <p className="text-sm text-muted-foreground">
              {displayQuantity.toLocaleString()} cotas · <span className="text-primary font-bold">R$ {total}</span>
            </p>
          </div>

          {!pixData ? (
            <button onClick={gerarPix} disabled={loading}
              style={!loading ? { animation: "cyanPulse 1.6s ease-in-out infinite" } : undefined}
              className={`w-full text-primary-foreground font-bold py-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                loading ? "bg-primary opacity-50 cursor-not-allowed shadow-none" : "bg-primary hover:brightness-110 shadow-[0_0_24px_rgba(34,211,238,0.45)]"
              }`}>
              {loading ? (<><Loader2 size={20} className="animate-spin" /> Gerando PIX...</>) : (<><QrCode size={20} /> Gerar PIX</>)}
            </button>
          ) : (
            <div className="space-y-4">
              <div className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-lg ${
                timeLeft <= 60000 ? "bg-destructive/20 text-destructive" : "bg-primary/10 text-primary"
              }`}>
                <Clock size={18} />
                <span>{formatTime(timeLeft)}</span>
                <span className="text-xs font-normal text-muted-foreground ml-1">para pagar</span>
              </div>

              <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                <img src={pixData.qrcode} alt="QR Code PIX" className="w-56 h-56 object-contain" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">PIX Copia e Cola:</p>
                <button onClick={copyPix} className="w-full bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 transition rounded-lg p-4 text-left">
                  <p className="text-black text-xs font-mono break-all leading-relaxed">{pixData.copiaECola}</p>
                </button>
                <div className="flex justify-center">
                  <button onClick={copyPix} className="bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 transition text-black text-xs font-semibold px-4 py-1.5 rounded-full">
                    {copied ? "✅Código Copiado!✅" : "Copiar o Código"}
                  </button>
                </div>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 text-center space-y-2">
                <Loader2 size={24} className="animate-spin text-primary mx-auto" />
                <p className="text-sm text-foreground font-medium">Aguardando pagamento...</p>
                <p className="text-xs text-muted-foreground">Suas cotas serão geradas após o pagamento!</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
              <p className="text-sm text-destructive font-medium">Erro ao gerar pagamento. Tente novamente.</p>
              <button onClick={gerarPix} className="mt-2 text-primary text-sm underline">Tentar Novamente</button>
            </div>
          )}
        </main>

        <footer className="max-w-lg mx-auto px-4 py-4 text-center">
          <p className="text-xs text-muted-foreground">Desenvolvido por</p>
          <p className="text-xs text-muted-foreground">ONURB DIGITAL</p>
        </footer>
      </div>
    </>
  );
};

export default Pagamento;
