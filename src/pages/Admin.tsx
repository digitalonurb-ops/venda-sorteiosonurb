import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, EyeOff, LogOut, Users, CreditCard, TrendingUp, ShoppingCart,
  DollarSign, Trash2, Edit, ChevronLeft, Plus, X, Award, Megaphone,
  ToggleLeft, ToggleRight, Lock, Unlock, Save, Clock, RefreshCw,
  BarChart3, Type, Palette, Search, PackageOpen,
} from "lucide-react";

// ─── Types ───
interface Order {
  id: string; nome: string; celular: string; quantidade: number;
  valor: string; status: string; txid: string | null; created_at: string;
}
interface Quota { id: string; numero: string; order_id: string; created_at: string; }
interface TopBuyer { nome: string; celular: string; total: number; count: number; }
interface DashboardData {
  totalQuotasSold: number; totalQuotasPending: number; totalQuotasAvailable: number;
  totalOrders: number; totalPaidOrders: number; revenueDay: number; revenueWeek: number;
  revenueMonth: number; revenueTotal: number; orders: Order[]; topBuyers: TopBuyer[];
}
interface PrizeQuota {
  id: string; numero: string; premio_valor: number; premio_descricao: string;
  status: string; vendida: boolean; st: boolean; ativa: boolean; created_at: string;
}
interface Promotion {
  id: string; titulo: string; descricao: string; ativa: boolean;
  timer_minutos: number | null; cotas_dobro: boolean; ativado_em: string | null;
  created_at: string;
}

const TOTAL_COTAS = 999999;

const Admin = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [revenueFilter, setRevenueFilter] = useState<"day" | "week" | "month" | "total">("total");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "cancelled">("all");
  const [activeTab, setActiveTab] = useState<"dashboard" | "prizes" | "promotions" | "settings" | "lookup">("dashboard");

  // Lookup quota
  const [lookupNumero, setLookupNumero] = useState("");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showCelular, setShowCelular] = useState<Record<number, boolean>>({});

  // Order detail
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderQuotas, setOrderQuotas] = useState<Quota[]>([]);
  const [editingOrder, setEditingOrder] = useState(false);
  const [editForm, setEditForm] = useState({ nome: "", celular: "", valor: "", quantidade: 0 });
  const [newQuotaNum, setNewQuotaNum] = useState("");
  const [quotaError, setQuotaError] = useState("");

  // Prize quotas
  const [prizeQuotas, setPrizeQuotas] = useState<PrizeQuota[]>([]);
  const [showPrizeForm, setShowPrizeForm] = useState(false);
  const [prizeForm, setPrizeForm] = useState({ numero: "", premio_valor: "", premio_descricao: "", st: true });

  // Promotions
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({ titulo: "", descricao: "", timer_minutos: "", cotas_dobro: false });

  // Site Settings
  const [progressBar, setProgressBar] = useState({ ativa: false, porcentagem: 50 });
  const [banner, setBanner] = useState({ ativa: false, texto: "Adquira Já!", cor: "#facc15", cor_texto: "#000000" });

  const creds = () => {
    const token = sessionStorage.getItem("admin_token");
    return token ? { token } : {};
  };

  const invoke = async (action: string, extra: Record<string, unknown> = {}) => {
    const { data: res, error: err } = await supabase.functions.invoke("admin-dashboard", {
      body: { ...creds(), action, ...extra },
    });
    if (err) throw err;
    if (res?.error) throw new Error(res.error);
    return res;
  };

  const handleLogin = async () => {
    setLoading(true); setError("");
    try {
      const { data: res, error: err } = await supabase.functions.invoke("admin-dashboard", {
        body: { email, username: email, password, action: "login" },
      });
      if (err || res?.error) {
        setError(res?.error || "E-mail ou senha incorretos.");
      } else if (res?.success && res?.token) {
        setIsLoggedIn(true);
        sessionStorage.setItem("admin_token", res.token);
        setEmail(""); setPassword("");
        loadDashboard();
      } else {
        setError("E-mail ou senha incorretos.");
      }
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    }
    setLoading(false);
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await invoke("dashboard");
      if (res) setData(res);
    } catch (e: any) {
      if (e.message === "kkkk tente denovo pateta!") {
        sessionStorage.clear(); setIsLoggedIn(false);
      }
    }
    setLoading(false);
  };

  const loadPrizeQuotas = async () => {
    try {
      const res = await invoke("list-prize-quotas");
      if (res?.prize_quotas) setPrizeQuotas(res.prize_quotas);
    } catch {}
  };

  const loadPromotions = async () => {
    try {
      const res = await invoke("list-promotions");
      if (res?.promotions) setPromotions(res.promotions);
    } catch {}
  };

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");
    if (token) {
      (async () => {
        setLoading(true);
        try {
          const { data: dashRes } = await supabase.functions.invoke("admin-dashboard", {
            body: { token, action: "dashboard" },
          });
          if (dashRes && !dashRes.error) {
            setIsLoggedIn(true);
            setData(dashRes);
          } else {
            sessionStorage.removeItem("admin_token"); setIsLoggedIn(false);
          }
        } catch {
          sessionStorage.removeItem("admin_token"); setIsLoggedIn(false);
        }
        setLoading(false);
      })();
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === "prizes") loadPrizeQuotas();
    if (activeTab === "promotions") loadPromotions();
    if (activeTab === "settings") loadSiteSettings();
  }, [activeTab, isLoggedIn]);

  const loadSiteSettings = async () => {
    try {
      const res = await invoke("get-site-settings");
      if (res?.settings) {
        if (res.settings.progress_bar) setProgressBar(res.settings.progress_bar);
        if (res.settings.banner) setBanner(res.settings.banner);
      }
    } catch {}
  };

  const saveSiteSetting = async (key: string, value: any) => {
    try {
      await invoke("update-site-setting", { key, value });
    } catch {}
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token"); setIsLoggedIn(false); setData(null);
    setEmail(""); setPassword("");
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getRevenue = () => {
    if (!data) return 0;
    return { day: data.revenueDay, week: data.revenueWeek, month: data.revenueMonth, total: data.revenueTotal }[revenueFilter];
  };

  const filteredOrders = data?.orders.filter((o) => statusFilter === "all" || o.status === statusFilter) || [];

  // ─── Cálculo de cotas no frontend ───
  const calcCotas = () => {
    if (!data) return { vendidas: 0, reservadas: 0, disponiveis: TOTAL_COTAS };
    const vendidas = data.totalQuotasSold || 0;
    const reservadas = data.orders
      .filter((o) => {
        if (o.status !== "pending") return false;
        const criado = new Date(o.created_at).getTime();
        return Date.now() - criado <= 10 * 60 * 1000;
      })
      .reduce((acc, o) => acc + o.quantidade, 0);
    const disponiveis = Math.max(0, TOTAL_COTAS - vendidas - reservadas);
    return { vendidas, reservadas, disponiveis };
  };

  // ─── Order Detail ───
  const openOrderDetail = async (order: Order) => {
    setSelectedOrder(order);
    setEditingOrder(false);
    setQuotaError("");
    const res = await invoke("order-details", { order_id: order.id });
    if (res?.quotas) setOrderQuotas(res.quotas);
    if (res?.order) setSelectedOrder(res.order);
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta compra?")) return;
    await invoke("delete-order", { order_id: id });
    setSelectedOrder(null);
    loadDashboard();
  };

  const saveOrder = async () => {
    if (!selectedOrder) return;
    await invoke("update-order", {
      order_id: selectedOrder.id,
      updates: { nome: editForm.nome, celular: editForm.celular, valor: editForm.valor, quantidade: editForm.quantidade },
    });
    setEditingOrder(false);
    const updated = { ...selectedOrder, ...editForm };
    setSelectedOrder(updated);
    loadDashboard();
  };

  const addQuota = async () => {
    if (!selectedOrder || !newQuotaNum.trim()) return;
    setQuotaError("");
    try {
      await invoke("add-quota", { order_id: selectedOrder.id, numero: newQuotaNum.trim() });
      setNewQuotaNum("");
      const res = await invoke("order-details", { order_id: selectedOrder.id });
      if (res?.quotas) setOrderQuotas(res.quotas);
      if (res?.order) setSelectedOrder(res.order);
      loadDashboard();
    } catch (e: any) {
      setQuotaError(e.message || "Erro ao adicionar cota");
    }
  };

  const deleteQuota = async (qid: string) => {
    if (!selectedOrder) return;
    await invoke("delete-quota", { quota_id: qid });
    setOrderQuotas((prev) => prev.filter((q) => q.id !== qid));
    loadDashboard();
  };

  // ─── Prize Quotas ───
  const createPrize = async () => {
    const valorStr = prizeForm.premio_valor.replace(",", ".");
    await invoke("create-prize-quota", {
      numero: prizeForm.numero,
      premio_valor: parseFloat(valorStr) || 0,
      premio_descricao: prizeForm.premio_descricao,
      st: prizeForm.st,
    });
    setShowPrizeForm(false);
    setPrizeForm({ numero: "", premio_valor: "", premio_descricao: "", st: true });
    loadPrizeQuotas();
  };

  const togglePrizeField = async (id: string, field: string, current: boolean) => {
    await invoke("update-prize-quota", { prize_id: id, updates: { [field]: !current } });
    loadPrizeQuotas();
  };

  const deletePrize = async (id: string) => {
    if (!confirm("Excluir cota premiada?")) return;
    await invoke("delete-prize-quota", { prize_id: id });
    loadPrizeQuotas();
  };

  // ─── Lookup Quota ───
  const handleLookupQuota = async () => {
    if (!lookupNumero.trim()) return;
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const res = await invoke("lookup-quota", { numero: lookupNumero.trim() });
      setLookupResult(res);
    } catch {
      setLookupResult({ found: false });
    }
    setLookupLoading(false);
  };

  // ─── Promotions ───
  const createPromo = async () => {
    await invoke("create-promotion", {
      titulo: promoForm.titulo,
      descricao: promoForm.descricao,
      timer_minutos: promoForm.timer_minutos ? parseInt(promoForm.timer_minutos) : null,
      cotas_dobro: promoForm.cotas_dobro,
    });
    setShowPromoForm(false);
    setPromoForm({ titulo: "", descricao: "", timer_minutos: "", cotas_dobro: false });
    loadPromotions();
  };

  const togglePromo = async (id: string, current: boolean) => {
    await invoke("update-promotion", { promotion_id: id, updates: { ativa: !current } });
    loadPromotions();
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Excluir promoção?")) return;
    await invoke("delete-promotion", { promotion_id: id });
    loadPromotions();
  };

  // ─── LOGIN SCREEN ───
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card rounded-2xl p-8 shadow-2xl border border-border">
          <h1 className="text-2xl font-bold text-foreground text-center mb-6">Acesso Restrito</h1>
          {error && <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3 mb-4">{error}</div>}
          <div className="space-y-4">
            <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-secondary px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 rounded-lg border border-border bg-secondary px-4 pr-11 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button onClick={handleLogin} disabled={loading || !email || !password}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-bold disabled:opacity-50">
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ORDER DETAIL MODAL ───
  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <button onClick={() => { setSelectedOrder(null); loadDashboard(); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ChevronLeft size={20} /> Voltar
            </button>
            <div className="flex gap-2">
              <button onClick={() => { setEditingOrder(true); setEditForm({ nome: selectedOrder.nome, celular: selectedOrder.celular, valor: selectedOrder.valor, quantidade: selectedOrder.quantidade }); }}
                className="text-primary hover:text-primary/80"><Edit size={18} /></button>
              <button onClick={() => deleteOrder(selectedOrder.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={18} /></button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div className="bg-card rounded-xl p-6 border border-border space-y-4">
            <h2 className="text-lg font-bold">Detalhes da Compra</h2>
            {editingOrder ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Nome</label>
                    <input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                      className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" /></div>
                  <div><label className="text-xs text-muted-foreground">Celular</label>
                    <input value={editForm.celular} onChange={(e) => setEditForm({ ...editForm, celular: e.target.value })}
                      className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" /></div>
                  <div><label className="text-xs text-muted-foreground">Valor</label>
                    <input value={editForm.valor} onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
                      className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" /></div>
                  <div><label className="text-xs text-muted-foreground">Quantidade</label>
                    <input type="number" value={editForm.quantidade} onChange={(e) => setEditForm({ ...editForm, quantidade: parseInt(e.target.value) || 0 })}
                      className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveOrder} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1"><Save size={14} /> Salvar</button>
                  <button onClick={() => setEditingOrder(false)} className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium ml-1">{selectedOrder.nome}</span></div>
                <div><span className="text-muted-foreground">Celular:</span> <span className="font-medium ml-1">{selectedOrder.celular}</span></div>
                <div><span className="text-muted-foreground">Valor:</span> <span className="font-bold text-primary ml-1">R$ {selectedOrder.valor}</span></div>
                <div><span className="text-muted-foreground">Quantidade:</span> <span className="font-medium ml-1">{selectedOrder.quantidade}</span></div>
                <div><span className="text-muted-foreground">Status:</span>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedOrder.status === "paid" ? "bg-green-500/20 text-green-400" :
                    selectedOrder.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                    "bg-yellow-500/20 text-yellow-400"
                  }`}>{selectedOrder.status === "paid" ? "Pago" : selectedOrder.status === "cancelled" ? "Cancelado" : "Pendente"}</span>
                </div>
                <div><span className="text-muted-foreground">Data:</span> <span className="text-xs ml-1">{new Date(selectedOrder.created_at).toLocaleString("pt-BR")}</span></div>
                {selectedOrder.txid && <div className="col-span-2"><span className="text-muted-foreground">TXID:</span> <span className="text-xs font-mono ml-1 break-all">{selectedOrder.txid}</span></div>}
              </div>
            )}
          </div>

          <div className="bg-card rounded-xl p-6 border border-border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Cotas Geradas ({orderQuotas.length})</h2>
              <div className="flex items-center gap-2">
                <input value={newQuotaNum} onChange={(e) => setNewQuotaNum(e.target.value)} placeholder="Nº cota"
                  className="h-8 w-28 rounded border border-border bg-secondary px-2 text-sm text-foreground"
                  onKeyDown={(e) => e.key === "Enter" && addQuota()} />
                <button onClick={addQuota} className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-xs font-bold"><Plus size={12} /></button>
              </div>
            </div>
            {quotaError && <p className="text-destructive text-xs">{quotaError}</p>}
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5 max-h-64 overflow-y-auto">
              {orderQuotas.map((q) => (
                <div key={q.id} className="group relative bg-primary/10 border border-primary/20 rounded text-center py-1.5 text-xs font-mono font-semibold text-foreground">
                  {q.numero}
                  <button onClick={() => deleteQuota(q.id)}
                    className="absolute -top-1 -right-1 hidden group-hover:flex bg-destructive text-destructive-foreground rounded-full w-4 h-4 items-center justify-center text-[8px]">
                    <X size={8} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── MAIN PANEL ───
  const { vendidas, reservadas, disponiveis } = calcCotas();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">Painel Admin</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => { loadDashboard(); if (activeTab === "prizes") loadPrizeQuotas(); if (activeTab === "promotions") loadPromotions(); }}
              disabled={loading} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              {loading ? "Atualizando..." : "Atualizar"}
            </button>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1 overflow-x-auto">
          {([["dashboard", "Dashboard", <ShoppingCart size={14} key="d" />],
             ["prizes", "Cotas Premiadas", <Award size={14} key="p" />],
             ["promotions", "Promoções", <Megaphone size={14} key="m" />],
             ["lookup", "Consultar Cota", <Search size={14} key="l" />],
             ["settings", "Configurações", <Palette size={14} key="s" />]] as const).map(([key, label, icon]) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* ─── DASHBOARD TAB ─── */}
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard icon={<ShoppingCart size={20} />} label="Cotas Vendidas" value={String(vendidas)} color="green" />
              <StatCard icon={<PackageOpen size={20} />} label="Cotas Reservadas" value={String(reservadas)} color="yellow" />
              <StatCard icon={<CreditCard size={20} />} label="Cotas Disponíveis" value={String(disponiveis)} />
              <StatCard icon={<Users size={20} />} label="Pedidos Pagos" value={String(data?.totalPaidOrders || 0)} />
              <StatCard icon={<TrendingUp size={20} />} label="Total Pedidos" value={String(data?.totalOrders || 0)} />
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2"><DollarSign size={20} className="text-primary" /><h2 className="font-bold text-lg">Faturamento</h2></div>
                <div className="flex gap-1">
                  {(["day", "week", "month", "total"] as const).map((f) => (
                    <button key={f} onClick={() => setRevenueFilter(f)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        revenueFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}>
                      {{ day: "Dia", week: "Semana", month: "Mês", total: "Total" }[f]}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-3xl font-bold text-primary">{fmt(getRevenue())}</p>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Users size={20} className="text-accent" />Maiores Compradores</h2>
              {data?.topBuyers.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum comprador encontrado.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-4">#</th><th className="text-left py-2 pr-4">Nome</th>
                      <th className="text-left py-2 pr-4">Celular</th><th className="text-right py-2 pr-4">Cotas</th>
                      <th className="text-right py-2">Total Gasto</th>
                    </tr></thead>
                    <tbody>{data?.topBuyers.slice(0, 10).map((b, i) => (
                      <tr key={b.celular} className="border-b border-border/50">
                        <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-4 font-medium">{b.nome}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{b.celular}</td>
                        <td className="py-2 pr-4 text-right">{b.count}</td>
                        <td className="py-2 text-right font-bold text-primary">{fmt(b.total)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg">Todas as Compras</h2>
                <div className="flex gap-1">
                  {(["all", "paid", "pending", "cancelled"] as const).map((f) => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        statusFilter === f ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}>
                      {{ all: "Todos", paid: "Pagos", pending: "Pendentes", cancelled: "Cancelados" }[f]}
                    </button>
                  ))}
                </div>
              </div>
              {filteredOrders.length === 0 ? <p className="text-muted-foreground text-sm">Nenhum pedido encontrado.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-border text-muted-foreground">
                      <th className="text-left py-2 pr-4">Nome</th><th className="text-left py-2 pr-4">Celular</th>
                      <th className="text-right py-2 pr-4">Qtd</th><th className="text-right py-2 pr-4">Valor</th>
                      <th className="text-center py-2 pr-4">Status</th><th className="text-left py-2 pr-4">Data</th>
                      <th className="text-center py-2">Ações</th>
                    </tr></thead>
                    <tbody>{filteredOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-secondary/30 cursor-pointer" onClick={() => openOrderDetail(order)}>
                        <td className="py-2 pr-4 font-medium">{order.nome}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{order.celular}</td>
                        <td className="py-2 pr-4 text-right">{order.quantidade}</td>
                        <td className="py-2 pr-4 text-right">R$ {order.valor}</td>
                        <td className="py-2 pr-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            order.status === "paid" ? "bg-green-500/20 text-green-400" :
                            order.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }`}>{order.status === "paid" ? "Pago" : order.status === "cancelled" ? "Cancelado" : "Pendente"}</span>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground text-xs">{new Date(order.created_at).toLocaleString("pt-BR")}</td>
                        <td className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => deleteOrder(order.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── PRIZES TAB ─── */}
        {activeTab === "prizes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Award size={20} className="text-primary" /> Cotas Premiadas</h2>
              <button onClick={() => setShowPrizeForm(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                <Plus size={14} /> Nova Cota Premiada
              </button>
            </div>

            {showPrizeForm && (
              <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                <h3 className="font-bold">Nova Cota Premiada</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Número da Cota</label>
                    <input value={prizeForm.numero} onChange={(e) => setPrizeForm({ ...prizeForm, numero: e.target.value })}
                      className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" placeholder="Ex: 136333" /></div>
                  <div><label className="text-xs text-muted-foreground">Valor do Prêmio (R$)</label>
                    <input value={prizeForm.premio_valor} onChange={(e) => setPrizeForm({ ...prizeForm, premio_valor: e.target.value })}
                      className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" placeholder="2000,00 ou 2000.00" /></div>
                  <div className="col-span-2"><label className="text-xs text-muted-foreground">Descrição</label>
                    <input value={prizeForm.premio_descricao} onChange={(e) => setPrizeForm({ ...prizeForm, premio_descricao: e.target.value })}
                      className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" placeholder="Premiação especial" /></div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={prizeForm.st} onChange={(e) => setPrizeForm({ ...prizeForm, st: e.target.checked })} />
                  Permitir
                </label>
                <div className="flex gap-2">
                  <button onClick={createPrize} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold">Criar</button>
                  <button onClick={() => setShowPrizeForm(false)} className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
                </div>
              </div>
            )}

            {prizeQuotas.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma cota premiada cadastrada.</p> : (
              <div className="space-y-3">
                {prizeQuotas.map((pq) => (
                  <div key={pq.id} className="bg-card rounded-xl p-4 border border-border flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="bg-primary/20 text-primary font-mono font-bold px-3 py-1 rounded text-lg">{pq.numero}</span>
                        <span className="text-primary font-bold">{fmt(pq.premio_valor)}</span>
                        {pq.premio_descricao && <span className="text-muted-foreground text-sm">· {pq.premio_descricao}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${pq.vendida ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}`}>
                          {pq.vendida ? "Vendida" : "Disponível"}
                        </span>
                        <span className={`flex items-center gap-1 ${pq.st ? "text-green-400" : "text-red-400"}`}>
                          {pq.st ? <Unlock size={12} /> : <Lock size={12} />}
                          {pq.st ? "Permitir" : "Não Permitir"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePrizeField(pq.id, "ativa", pq.ativa)} title={pq.ativa ? "Desativar" : "Ativar"}
                        className={pq.ativa ? "text-green-400" : "text-muted-foreground"}>
                        {pq.ativa ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                      <button onClick={() => togglePrizeField(pq.id, "st", pq.st)} title={pq.st ? "Não Permitir" : "Permitir"}
                        className={pq.st ? "text-primary" : "text-red-400"}>
                        {pq.st ? <Unlock size={18} /> : <Lock size={18} />}
                      </button>
                      <button onClick={() => deletePrize(pq.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── PROMOTIONS TAB ─── */}
        {activeTab === "promotions" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><Megaphone size={20} className="text-primary" /> Promoções</h2>
              <button onClick={() => setShowPromoForm(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                <Plus size={14} /> Nova Promoção
              </button>
            </div>

            {showPromoForm && (
              <div className="bg-card rounded-xl p-6 border border-border space-y-4">
                <h3 className="font-bold">Nova Promoção</h3>
                <div><label className="text-xs text-muted-foreground">Título</label>
                  <input value={promoForm.titulo} onChange={(e) => setPromoForm({ ...promoForm, titulo: e.target.value })}
                    className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" placeholder="Cotas em dobro!" /></div>
                <div><label className="text-xs text-muted-foreground">Texto da Promoção (exibido na página inicial)</label>
                  <textarea value={promoForm.descricao} onChange={(e) => setPromoForm({ ...promoForm, descricao: e.target.value })}
                    className="w-full rounded border border-border bg-secondary px-3 py-2 text-sm text-foreground min-h-[80px]" placeholder="Compre 100 cotas e ganhe mais 100 grátis!" /></div>
                <div><label className="text-xs text-muted-foreground">Duração da promoção (minutos) — deixe vazio para sem limite</label>
                  <input type="number" value={promoForm.timer_minutos} onChange={(e) => setPromoForm({ ...promoForm, timer_minutos: e.target.value })}
                    className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" placeholder="Ex: 60 (1 hora)" /></div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={promoForm.cotas_dobro} onChange={(e) => setPromoForm({ ...promoForm, cotas_dobro: e.target.checked })} />
                  Cotas em dobro
                </label>
                <div className="flex gap-2">
                  <button onClick={createPromo} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold">Criar</button>
                  <button onClick={() => setShowPromoForm(false)} className="bg-secondary text-foreground px-4 py-2 rounded-lg text-sm">Cancelar</button>
                </div>
              </div>
            )}

            {promotions.length === 0 ? <p className="text-muted-foreground text-sm">Nenhuma promoção cadastrada.</p> : (
              <div className="space-y-3">
                {promotions.map((p) => (
                  <div key={p.id} className="bg-card rounded-xl p-4 border border-border flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-foreground">{p.titulo}</p>
                      <p className="text-sm text-muted-foreground mt-1">{p.descricao}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.ativa ? "bg-green-500/20 text-green-400" : "bg-secondary text-muted-foreground"}`}>
                          {p.ativa ? "Ativa" : "Inativa"}
                        </span>
                        {p.timer_minutos && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock size={12} /> {p.timer_minutos} min
                          </span>
                        )}
                        {p.cotas_dobro && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-accent/20 text-accent">
                            Cotas em Dobro
                          </span>
                        )}
                        {p.ativa && p.timer_minutos && p.ativado_em && (
                          <PromoTimer ativadoEm={p.ativado_em} timerMinutos={p.timer_minutos} />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePromo(p.id, p.ativa)} className={p.ativa ? "text-green-400" : "text-muted-foreground"}>
                        {p.ativa ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                      </button>
                      <button onClick={() => deletePromo(p.id)} className="text-destructive hover:text-destructive/80"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── LOOKUP TAB ─── */}
        {activeTab === "lookup" && (
          <div className="bg-card rounded-xl p-6 border border-border space-y-6">
            <h2 className="font-bold text-lg flex items-center gap-2"><Search size={20} className="text-primary" />Consultar Cota</h2>
            <div className="flex gap-2">
              <input value={lookupNumero} onChange={(e) => setLookupNumero(e.target.value)} placeholder="Digite o número da cota"
                className="flex-1 h-11 rounded-lg border border-border bg-secondary px-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && handleLookupQuota()} />
              <button onClick={handleLookupQuota} disabled={lookupLoading || !lookupNumero.trim()}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2">
                {lookupLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />} Buscar
              </button>
            </div>
            {lookupResult !== null && (
              lookupResult.found ? (
                <div className="space-y-3">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-green-400 font-bold text-sm mb-2">✅ Cota {lookupNumero} encontrada!</p>
                    {lookupResult.results.map((r: any, i: number) => (
                      <div key={i} className="bg-secondary/50 rounded-lg p-3 mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium ml-1">{r.nome}</span></div>
                        <div className="flex items-center gap-1">
  <span className="text-muted-foreground">Celular:</span>
  <span className="font-medium ml-1">
    {showCelular[i]
      ? r.celular
      : r.celular.replace(/^(\(\d{2}\))\s*(\d{5})-?(\d{4})$/, (_, ddd, _mid, fim) => `${ddd} *****-${fim}`)
    }
  </span>
  <button
    onClick={() => setShowCelular((prev) => ({ ...prev, [i]: !prev[i] }))}
    className="text-muted-foreground hover:text-foreground transition ml-1"
    title={showCelular[i] ? "Ocultar" : "Revelar"}
  >
    {showCelular[i]
      ? <EyeOff size={14} />
      : <Eye size={14} />
    }
  </button>
</div>
                        <div><span className="text-muted-foreground">Valor:</span> <span className="font-bold text-primary ml-1">R$ {r.valor}</span></div>
                        <div><span className="text-muted-foreground">Status:</span>
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                            r.status === "paid" ? "bg-green-500/20 text-green-400" :
                            r.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                            "bg-yellow-500/20 text-yellow-400"
                          }`}>{r.status === "paid" ? "Pago" : r.status === "cancelled" ? "Cancelado" : "Pendente"}</span>
                        </div>
                        <div className="col-span-2"><span className="text-muted-foreground">Data:</span> <span className="text-xs ml-1">{new Date(r.created_at).toLocaleString("pt-BR")}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-400 font-bold text-sm">⚠️ Cota {lookupNumero} não foi vendida ainda.</p>
                </div>
              )
            )}
          </div>
        )}

        {/* ─── SETTINGS TAB ─── */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="bg-card rounded-xl p-6 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 size={20} className="text-primary" /> Progress Bar</h2>
                <button onClick={() => {
                  const updated = { ...progressBar, ativa: !progressBar.ativa };
                  setProgressBar(updated);
                  saveSiteSetting("progress_bar", updated);
                }} className={progressBar.ativa ? "text-green-400" : "text-muted-foreground"}>
                  {progressBar.ativa ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Exibe uma barra de progresso.</p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Porcentagem: {progressBar.porcentagem}%</label>
                <input type="range" min="0.01" max="100" step="0.01" value={progressBar.porcentagem}
                  onChange={(e) => setProgressBar({ ...progressBar, porcentagem: parseFloat(e.target.value) })}
                  className="w-full accent-primary" />
                <div className="flex items-center gap-2">
                  <input type="number" min="0.01" max="100" step="0.01" value={progressBar.porcentagem}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v >= 0.01 && v <= 100) setProgressBar({ ...progressBar, porcentagem: v });
                    }}
                    className="w-24 h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" />
                  <span className="text-sm text-muted-foreground">%</span>
                  <button onClick={() => saveSiteSetting("progress_bar", progressBar)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 ml-auto">
                    <Save size={14} /> Salvar
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Preview:</p>
                <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressBar.porcentagem}%` }} />
                </div>
              </div>
            </div>

            {/* Banner */}
            <div className="bg-card rounded-xl p-6 border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2"><Type size={20} className="text-primary" /> Mini Banner</h2>
                <button onClick={() => {
                  const updated = { ...banner, ativa: !banner.ativa };
                  setBanner(updated);
                  saveSiteSetting("banner", updated);
                }} className={banner.ativa ? "text-green-400" : "text-muted-foreground"}>
                  {banner.ativa ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Exibe um mini banner.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Texto do Banner</label>
                  <input value={banner.texto} onChange={(e) => setBanner({ ...banner, texto: e.target.value })}
                    className="w-full h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground" placeholder="Adquira Já!" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Cor de Fundo</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={banner.cor} onChange={(e) => setBanner({ ...banner, cor: e.target.value })}
                        className="w-10 h-9 rounded border border-border cursor-pointer" />
                      <input value={banner.cor} onChange={(e) => setBanner({ ...banner, cor: e.target.value })}
                        className="flex-1 h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Cor do Texto</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={banner.cor_texto} onChange={(e) => setBanner({ ...banner, cor_texto: e.target.value })}
                        className="w-10 h-9 rounded border border-border cursor-pointer" />
                      <input value={banner.cor_texto} onChange={(e) => setBanner({ ...banner, cor_texto: e.target.value })}
                        className="flex-1 h-9 rounded border border-border bg-secondary px-3 text-sm text-foreground font-mono" />
                    </div>
                  </div>
                </div>
                <button onClick={() => saveSiteSetting("banner", banner)}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1">
                  <Save size={14} /> Salvar
                </button>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Preview:</p>
                <div className="inline-block px-3 py-1.5 rounded-md text-xs font-bold shadow-lg animate-banner-blink"
                  style={{ backgroundColor: banner.cor, color: banner.cor_texto }}>
                  {banner.texto || "Adquira Já!"}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const PromoTimer = ({ ativadoEm, timerMinutos }: { ativadoEm: string; timerMinutos: number }) => {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const update = () => {
      const expiresAt = new Date(ativadoEm).getTime() + timerMinutos * 60 * 1000;
      const diff = expiresAt - Date.now();
      if (diff <= 0) { setRemaining("Expirada"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h > 0 ? h + "h " : ""}${m}m ${s}s`);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [ativadoEm, timerMinutos]);
  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${remaining === "Expirada" ? "text-destructive" : "text-accent"}`}>
      <Clock size={12} /> {remaining}
    </span>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color?: "green" | "yellow" }) => (
  <div className={`bg-card rounded-xl p-4 border ${
    color === "green" ? "border-green-500/30" :
    color === "yellow" ? "border-yellow-500/30" :
    "border-border"
  }`}>
    <div className={`flex items-center gap-2 mb-2 ${
      color === "green" ? "text-green-400" :
      color === "yellow" ? "text-yellow-400" :
      "text-muted-foreground"
    }`}>
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </div>
    <p className={`text-2xl font-bold ${
      color === "green" ? "text-green-400" :
      color === "yellow" ? "text-yellow-400" :
      ""
    }`}>{value}</p>
  </div>
);

export default Admin;
