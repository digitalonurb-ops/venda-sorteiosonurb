import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logotopo.png";
import novologoOD from "@/assets/novologoOD.png";
import { useSiteSettings } from "@/lib/siteSettings";

const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const cfg = useSiteSettings();

  const { quantity, total } = (location.state as { quantity: number; total: string }) || {
    quantity: 50,
    total: "5,00",
  };

  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [lookupDone, setLookupDone] = useState(false);

  const isFormValid = nome.trim() !== "" && celular.replace(/\D/g, "").length >= 10;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setCelular(formatted);
    setLookupDone(false);
  };

  const handlePhoneBlur = useCallback(async () => {
    const digits = celular.replace(/\D/g, "");
    if (digits.length < 10 || lookupDone) return;
    setLookupDone(true);
    try {
      const { data } = await supabase.functions.invoke("admin-dashboard", {
        body: { username: "", password: "", action: "public-lookup-phone", celular: celular },
      });
      if (data?.nome) {
        setNome(data.nome);
      }
    } catch {
      /* ignore */
    }
  }, [celular, lookupDone]);

  const handleContinue = () => {
    if (!isFormValid) return;
    navigate("/resumo", { state: { quantity, total, nome, celular } });
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
            <h2 className="text-xl font-bold text-foreground">Dados do Participante</h2>
            <p className="text-sm text-muted-foreground">Preencha seus dados para continuar</p>
          </div>

          <div className="space-y-4">
            {/* Celular primeiro */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Celular</label>
              <div className="flex items-center gap-2 border border-border rounded-lg bg-card px-3 py-3">
                <Phone size={16} className="text-muted-foreground" />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="insira seu celular"
                  value={celular}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  className="flex-1 bg-transparent text-foreground text-sm outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Nome</label>
              <div className="flex items-center gap-2 border border-border rounded-lg bg-card px-3 py-3">
                <User size={16} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="insira seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="flex-1 bg-transparent text-foreground text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleContinue}
            disabled={!isFormValid}
            style={isFormValid ? { animation: "cyanPulse 1.6s ease-in-out infinite" } : undefined}
            className={`w-full font-bold py-3.5 rounded-lg transition-all duration-300 ${
              isFormValid
                ? "bg-primary text-primary-foreground shadow-[0_0_24px_rgba(34,211,238,0.45)] hover:brightness-110"
                : "bg-primary text-primary-foreground opacity-50 shadow-none cursor-not-allowed"
            }`}
          >
            Continuar
          </button>
        </main>

        <footer className="max-w-lg mx-auto px-4 py-6 flex flex-col items-center gap-1.5 text-center">
          <p className="text-xs text-muted-foreground">Desenvolvido por</p>
          <img src={novologoOD} alt="Onurb Digital" className="h-3 w-auto object-contain opacity-90" />
        </footer>
      </div>
    </>
  );
};

export default Checkout;
