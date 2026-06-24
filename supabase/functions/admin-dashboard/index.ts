import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};


// ─── RATE LIMITER (in-memory, por IP) ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;        // máximo de requisições
const RATE_WINDOW_MS = 60_000; // por minuto

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Verifica o JWT do Supabase Auth manualmente usando SUPABASE_JWT_SECRET
// (essa variável é sempre injetada automaticamente em edge functions do Supabase)
async function verifySupabaseJWT(jwt: string): Promise<boolean> {
  if (!jwt) return false;
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return false;

    // Decodifica o payload (base64url → JSON)
    const base64url = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64url));

    // Verifica expiração
    if (payload.exp && payload.exp * 1000 < Date.now()) return false;

    // Verifica a assinatura com SUPABASE_JWT_SECRET
    const secret = Deno.env.get("SUPABASE_JWT_SECRET")!;
    if (!secret) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false, ["verify"]
    );

    // A assinatura do JWT usa base64url
    const sigBase64url = parts[2].replace(/-/g, "+").replace(/_/g, "/");
    const sigBytes = Uint8Array.from(atob(sigBase64url), c => c.charCodeAt(0));
    const dataToVerify = encoder.encode(`${parts[0]}.${parts[1]}`);

    return await crypto.subtle.verify("HMAC", key, sigBytes, dataToVerify);
  } catch {
    return false;
  }
}

// Gera token de sessão admin (HMAC assinado com service role key)
async function generateToken(): Promise<string> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const payload = { exp: Date.now() + 4 * 60 * 60 * 1000 }; // 4h
  const payloadB64 = btoa(JSON.stringify(payload));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payloadB64}.${sigB64}`;
}

async function verifyToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return false;
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]
    );
    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(payloadB64));
    if (!valid) return false;
    const payload = JSON.parse(atob(payloadB64));
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ─── RATE LIMIT CHECK ───
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIP)) {
    return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em breve." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { username, password, action } = body;

    const supabase = getSupabase();

    // ─── PUBLIC ALL (single call for homepage) ───
    if (action === "public-all") {
      // Prize quotas
      const { data: pqData } = await supabase
        .from("prize_quotas")
        .select("numero, premio_valor, premio_descricao, status, vendida, pode_vender")
        .eq("ativa", true)

      const quotasWithStatus = [];
      for (const pq of (pqData || [])) {
        const { data: sold } = await supabase
          .from("quotas")
          .select("id")
          .eq("numero", pq.numero)
          .limit(1);
        const { pode_vender, ...pqRest } = pq as any;
        quotasWithStatus.push({
          ...pqRest,
          st: pode_vender,
          vendida: (sold && sold.length > 0),
          status: (sold && sold.length > 0) ? "vendida" : "disponivel",
        });
      }

      // Promotions
      const { data: promoData } = await supabase
        .from("promotions")
        .select("titulo, descricao, timer_minutos, ativado_em, cotas_dobro")
        .eq("ativa", true);

      const now = new Date();
      const activePromos = (promoData || []).filter((p: any) => {
        if (p.timer_minutos && p.ativado_em) {
          const expiresAt = new Date(new Date(p.ativado_em).getTime() + p.timer_minutos * 60 * 1000);
          return now < expiresAt;
        }
        return true;
      });

      // Site settings
      const { data: settingsData } = await supabase.from("site_settings").select("key, value");
      const settings: Record<string, any> = {};
      for (const row of (settingsData || [])) {
        settings[row.key] = row.value;
      }

      return new Response(JSON.stringify({
        prize_quotas: quotasWithStatus,
        promotions: activePromos,
        settings,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PUBLIC ENDPOINTS (no auth required) ───
    if (action === "public-prize-quotas") {
      const { data } = await supabase
        .from("prize_quotas")
        .select("numero, premio_valor, premio_descricao, status, vendida, pode_vender")
        .eq("ativa", true)

      const quotasWithStatus = [];
      for (const pq of (data || [])) {
        const { data: sold } = await supabase
          .from("quotas")
          .select("id")
          .eq("numero", pq.numero)
          .limit(1);
        const { pode_vender, ...pqRest } = pq as any;
        quotasWithStatus.push({
          ...pqRest,
          st: pode_vender,
          vendida: (sold && sold.length > 0),
          status: (sold && sold.length > 0) ? "vendida" : "disponivel",
        });
      }

      return new Response(JSON.stringify({ prize_quotas: quotasWithStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "public-promotions") {
      const { data } = await supabase
        .from("promotions")
        .select("titulo, descricao, timer_minutos, ativado_em, cotas_dobro")
        .eq("ativa", true);

      const now = new Date();
      const activePromos = (data || []).filter((p: any) => {
        if (p.timer_minutos && p.ativado_em) {
          const expiresAt = new Date(new Date(p.ativado_em).getTime() + p.timer_minutos * 60 * 1000);
          return now < expiresAt;
        }
        return true;
      });

      return new Response(JSON.stringify({ promotions: activePromos }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "public-check-double-quotas") {
      const { data } = await supabase
        .from("promotions")
        .select("cotas_dobro, timer_minutos, ativado_em")
        .eq("ativa", true)
        .eq("cotas_dobro", true);

      let doubleActive = false;
      const now = new Date();
      for (const p of (data || [])) {
        if (p.timer_minutos && p.ativado_em) {
          const expiresAt = new Date(new Date(p.ativado_em).getTime() + p.timer_minutos * 60 * 1000);
          if (now < expiresAt) { doubleActive = true; break; }
        } else {
          doubleActive = true; break;
        }
      }

      return new Response(JSON.stringify({ doubleActive }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PUBLIC SITE SETTINGS ───
    if (action === "public-site-settings") {
      const { data } = await supabase.from("site_settings").select("key, value");
      const settings: Record<string, any> = {};
      for (const row of (data || [])) {
        settings[row.key] = row.value;
      }
      return new Response(JSON.stringify({ settings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PUBLIC: lookup name by phone ───
    if (action === "public-lookup-phone") {
      const { celular } = body;
      if (!celular) {
        return new Response(JSON.stringify({ nome: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data } = await supabase
        .from("orders")
        .select("nome")
        .eq("celular", celular)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1);
      return new Response(JSON.stringify({ nome: data && data.length > 0 ? data[0].nome : null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── AUTH CHECK ───
    const { token } = body;

    // Para action "login": usa o JWT do Supabase Auth passado no header Authorization
    // Para demais actions: usa o token de sessão admin gerado após login
    let isAuthed = false;

    if (action === "login") {
      // Extrai o JWT do header Authorization: "Bearer <jwt>"
      const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
      const supabaseJWT = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (supabaseJWT) {
        isAuthed = await verifySupabaseJWT(supabaseJWT);
      }
      // Fallback: variáveis de ambiente legadas (ADMIN_USERNAME / ADMIN_PASSWORD)
      if (!isAuthed) {
        const envUser = Deno.env.get("ADMIN_USERNAME");
        const envPass = Deno.env.get("ADMIN_PASSWORD");
        const loginEmail = body.email || username;
        const password = body.password;
        if (envUser && envPass && loginEmail === envUser && password === envPass) {
          isAuthed = true;
        }
      }
    } else {
      // Demais actions autenticadas: verifica o token de sessão admin
      isAuthed = token ? await verifyToken(token) : false;
    }

    if (!isAuthed) {
      return new Response(JSON.stringify({ error: "Credenciais inválidas" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LOGIN ───
    if (action === "login") {
      const newToken = await generateToken();
      return new Response(JSON.stringify({ success: true, token: newToken }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DASHBOARD ───
    if (action === "dashboard") {
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("status", "pending")
        .lt("created_at", tenMinAgo);

      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: quotas } = await supabase.from("quotas").select("*");

      const totalQuotasSold = quotas?.length || 0;
      const paidOrders = orders?.filter((o: any) => o.status === "paid") || [];
      const paidQuotas =
        quotas?.filter((q: any) => paidOrders.some((o: any) => o.id === q.order_id)) || [];

      const buyerMap: Record<string, { nome: string; celular: string; total: number; count: number }> = {};
      for (const order of paidOrders) {
        const key = order.celular;
        if (!buyerMap[key]) {
          buyerMap[key] = { nome: order.nome, celular: order.celular, total: 0, count: 0 };
        }
        const valor = parseFloat(order.valor.replace(",", "."));
        buyerMap[key].total += valor;
        buyerMap[key].count += order.quantidade;
      }
      const topBuyers = Object.values(buyerMap).sort((a, b) => b.total - a.total);

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const revCalc = (from: Date) =>
        paidOrders
          .filter((o: any) => new Date(o.created_at) >= from)
          .reduce((s: number, o: any) => s + parseFloat(o.valor.replace(",", ".")), 0);

      const pendingOrders = orders?.filter((o: any) => o.status === "pending") || [];
      const pendingQuotas =
        quotas?.filter((q: any) => pendingOrders.some((o: any) => o.id === q.order_id)) || [];

      const activeQuotasCount = paidQuotas.length + pendingQuotas.length;
      const totalPool = 1000000;
      const totalQuotasAvailable = totalPool - activeQuotasCount;

      return new Response(
        JSON.stringify({
          totalQuotasSold: paidQuotas.length,
          totalQuotasPending: pendingQuotas.length,
          totalQuotasAvailable,
          totalOrders: orders?.length || 0,
          totalPaidOrders: paidOrders.length,
          revenueDay: revCalc(startOfDay),
          revenueWeek: revCalc(startOfWeek),
          revenueMonth: revCalc(startOfMonth),
          revenueTotal: paidOrders.reduce((s: number, o: any) => s + parseFloat(o.valor.replace(",", ".")), 0),
          orders: orders || [],
          topBuyers,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ORDER DETAILS ───
    if (action === "order-details") {
      const { order_id } = body;
      const { data: order } = await supabase.from("orders").select("*").eq("id", order_id).single();
      const { data: quotas } = await supabase.from("quotas").select("*").eq("order_id", order_id).order("numero", { ascending: true });
      return new Response(JSON.stringify({ order, quotas: quotas || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── DELETE ORDER ───
    if (action === "delete-order") {
      const { order_id } = body;
      await supabase.from("quotas").delete().eq("order_id", order_id);
      await supabase.from("orders").delete().eq("id", order_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── UPDATE ORDER ───
    if (action === "update-order") {
      const { order_id, updates } = body;
      const allowedFields = ["nome", "celular", "valor", "quantidade", "status"];
      const filtered: Record<string, unknown> = {};
      for (const key of allowedFields) {
        if (updates[key] !== undefined) filtered[key] = updates[key];
      }
      await supabase.from("orders").update(filtered).eq("id", order_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── UPDATE QUOTA ───
    if (action === "update-quota") {
      const { quota_id, numero } = body;
      await supabase.from("quotas").update({ numero }).eq("id", quota_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── DELETE QUOTA ───
    if (action === "delete-quota") {
      const { quota_id } = body;
      await supabase.from("quotas").delete().eq("id", quota_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── ADD QUOTA ───
    if (action === "add-quota") {
      const { order_id, numero } = body;
      const { data: existing } = await supabase.from("quotas").select("id").eq("numero", numero).limit(1);
      if (existing && existing.length > 0) {
        return new Response(JSON.stringify({ error: "Esta cota já foi vendida/atribuída." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("quotas").insert({ order_id, numero });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PRIZE QUOTAS - LIST ───
    if (action === "list-prize-quotas") {
      const { data } = await supabase.from("prize_quotas").select("*").order("created_at", { ascending: false });
      const mappedAdmin = (data || []).map(({ pode_vender, ...r }: any) => ({ ...r, st: pode_vender }));
      return new Response(JSON.stringify({ prize_quotas: mappedAdmin }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PRIZE QUOTAS - CREATE ───
    if (action === "create-prize-quota") {
      const { numero, premio_valor, premio_descricao, pode_vender, st, ativa } = body;
      const pv = st !== undefined ? st : (pode_vender ?? true);
      await supabase.from("prize_quotas").insert({ numero, premio_valor, premio_descricao, pode_vender: pv, ativa: ativa ?? false });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PRIZE QUOTAS - UPDATE ───
    if (action === "update-prize-quota") {
      const { prize_id, updates } = body;
      // mapeia st → pode_vender (nome real da coluna no banco)
      const { st, ...rest } = updates as any;
      const dbUpdates = { ...rest, ...(st !== undefined ? { pode_vender: st } : {}) };
      await supabase.from("prize_quotas").update(dbUpdates).eq("id", prize_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PRIZE QUOTAS - DELETE ───
    if (action === "delete-prize-quota") {
      const { prize_id } = body;
      await supabase.from("prize_quotas").delete().eq("id", prize_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PROMOTIONS - LIST ───
    if (action === "list-promotions") {
      const { data } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
      return new Response(JSON.stringify({ promotions: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PROMOTIONS - CREATE ───
    if (action === "create-promotion") {
      const { titulo, descricao, ativa, timer_minutos, cotas_dobro } = body;
      await supabase.from("promotions").insert({ titulo, descricao, ativa: ativa ?? false, timer_minutos: timer_minutos || null, cotas_dobro: cotas_dobro ?? false });
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PROMOTIONS - UPDATE ───
    if (action === "update-promotion") {
      const { promotion_id, updates } = body;
      if (updates.ativa === true) {
        updates.ativado_em = new Date().toISOString();
      }
      await supabase.from("promotions").update(updates).eq("id", promotion_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PROMOTIONS - DELETE ───
    if (action === "delete-promotion") {
      const { promotion_id } = body;
      await supabase.from("promotions").delete().eq("id", promotion_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── SITE SETTINGS - GET ───
    if (action === "get-site-settings") {
      const { data } = await supabase.from("site_settings").select("key, value");
      const settings: Record<string, any> = {};
      for (const row of (data || [])) {
        settings[row.key] = row.value;
      }
      return new Response(JSON.stringify({ settings }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── SITE SETTINGS - UPDATE ───
    if (action === "update-site-setting") {
      const { key, value } = body;
      await supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── LOOKUP QUOTA ───
    if (action === "lookup-quota") {
      const { numero } = body;
      if (!numero) {
        return new Response(JSON.stringify({ error: "Número da cota é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: quotaRows } = await supabase.from("quotas").select("*, orders(*)").eq("numero", numero);
      if (!quotaRows || quotaRows.length === 0) {
        return new Response(JSON.stringify({ found: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const results = quotaRows.map((q: any) => ({
        numero: q.numero,
        order_id: q.order_id,
        nome: q.orders?.nome || "",
        celular: q.orders?.celular || "",
        status: q.orders?.status || "",
        valor: q.orders?.valor || "",
        quantidade: q.orders?.quantidade || 0,
        created_at: q.orders?.created_at || q.created_at,
      }));
      return new Response(JSON.stringify({ found: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Admin dashboard error:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
