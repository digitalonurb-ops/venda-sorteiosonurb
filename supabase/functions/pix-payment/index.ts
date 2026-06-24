import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-action',
};

const EFI_PROXY_URL = "https://efi-mtls-proxy-rxt-production.up.railway.app";

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const clientId = Deno.env.get('EFI_CLIENT_ID');
  const clientSecret = Deno.env.get('EFI_CLIENT_SECRET');
  const proxySecret = Deno.env.get('EFI_PROXY_SECRET');
  if (!clientId || !clientSecret) throw new Error('EFI credentials not configured');

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const headers: Record<string, string> = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'identity',
  };
  if (proxySecret) headers['x-proxy-secret'] = proxySecret;

  const res = await fetch(`${EFI_PROXY_URL}/efi/oauth/token`, {
    method: 'POST', headers,
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth failed [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

async function efiRequest(method: string, path: string, body?: unknown): Promise<Response> {
  const token = await getAccessToken();
  const proxySecret = Deno.env.get('EFI_PROXY_SECRET');
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept-Encoding': 'identity',
  };
  if (proxySecret) headers['x-proxy-secret'] = proxySecret;
  const opts: RequestInit = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${EFI_PROXY_URL}/efi${path}`, opts);
}

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function isDoubleQuotasActive(supabase: any, referenceDate: Date = new Date()): Promise<boolean> {
  const { data } = await supabase
    .from("promotions")
    .select("cotas_dobro, timer_minutos, ativado_em")
    .eq("ativa", true)
    .eq("cotas_dobro", true);

  for (const p of (data || [])) {
    if (p.timer_minutos && p.ativado_em) {
      const expiresAt = new Date(new Date(p.ativado_em).getTime() + p.timer_minutos * 60 * 1000);
      if (referenceDate < expiresAt) return true;
    } else {
      return true;
    }
  }

  return false;
}

// ─── NOVA FUNÇÃO: busca números de cotas premiadas bloqueadas para venda ───
async function getBlockedPrizeNumbers(supabase: any): Promise<Set<string>> {
  const { data } = await supabase
    .from("prize_quotas")
    .select("numero")
    .eq("ativa", true)
    .eq("pode_vender", false);
  return new Set((data || []).map((p: any) => String(p.numero)));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const action = req.headers.get('x-action') || new URL(req.url).searchParams.get('action');
    const body = req.method === 'POST' ? await req.json() : {};

    // ─── CREATE PIX CHARGE + ORDER ───
    if (action === 'create') {
      const { nome, celular, quantidade } = body;
      if (!nome || !celular || !quantidade) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const qty = Math.floor(Number(quantidade));
      if (!Number.isFinite(qty) || qty < 1 || qty > 30000) {
        return new Response(JSON.stringify({ error: 'Quantidade inválida (1-30000)' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const valor = (qty * 0.03).toFixed(2);
      const pixKey = Deno.env.get('EFI_PIX_KEY') || '';
      const supabase = getSupabaseAdmin();
      const doubleActive = await isDoubleQuotasActive(supabase);
      const actualQuantity = doubleActive ? qty * 2 : qty;

      const chargeRes = await efiRequest('POST', '/v2/cob', {
        calendario: { expiracao: 3600 },
        valor: { original: valor },
        chave: pixKey,
        infoAdicionais: [
          { nome: 'Campanha', valor: 'Pgto Campanha' },
          { nome: 'Cotas', valor: String(actualQuantity) },
          { nome: 'Cliente', valor: nome },
          { nome: 'Celular', valor: celular },
        ],
      });

      if (!chargeRes.ok) {
        const errText = await chargeRes.text();
        console.error('Efi charge error:', errText);
        return new Response(JSON.stringify({ error: 'Erro ao criar cobrança' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const charge = await chargeRes.json();

      const qrRes = await efiRequest('GET', `/v2/loc/${charge.loc.id}/qrcode`);
      if (!qrRes.ok) {
        return new Response(JSON.stringify({ error: 'Erro ao gerar QR Code' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const qr = await qrRes.json();

      const { error: dbError } = await supabase.from('orders').insert({
        nome, celular, quantidade: actualQuantity, valor, txid: charge.txid, status: 'pending',
      });
      if (dbError) console.error('DB insert error:', dbError);

      return new Response(JSON.stringify({
        txid: charge.txid,
        qrcode: qr.imagemQrcode,
        copiaECola: qr.qrcode,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── CHECK STATUS ───
    if (action === 'status') {
      const txid = body.txid;
      if (!txid) {
        return new Response(JSON.stringify({ error: 'txid required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await efiRequest('GET', `/v2/cob/${txid}`);
      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'Erro ao consultar status' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await res.json();

      if (data.status === 'CONCLUIDA') {
        const supabase = getSupabaseAdmin();

        await supabase.from('orders').update({ status: 'paid' }).eq('txid', txid);

        const { data: order } = await supabase
          .from('orders')
          .select('id, quantidade, created_at, valor')
          .eq('txid', txid)
          .single();

        if (order) {
          const { data: existingQuotas } = await supabase
            .from('quotas')
            .select('numero')
            .eq('order_id', order.id);

          if (!existingQuotas || existingQuotas.length === 0) {
            let actualQuantity = order.quantidade;
            const paidQuantity = Math.round(Number.parseFloat(order.valor) / 0.03);

            if (order.quantidade <= paidQuantity) {
              const doubleWasActiveOnOrderCreation = await isDoubleQuotasActive(
                supabase,
                new Date(order.created_at)
              );

              if (doubleWasActiveOnOrderCreation) {
                actualQuantity = order.quantidade * 2;
              }
            }

            const { data: rpcQuotas, error: rpcError } = await supabase
              .rpc('generate_unique_quotas', { quantidade: actualQuantity });

            if (rpcError) throw rpcError;

            // ─── BLOQUEIO: remover cotas premiadas com pode_vender=false ───
            const blockedNumbers = await getBlockedPrizeNumbers(supabase);
            const allQuotas = (rpcQuotas || []).map((q: { numero: string }) => String(q.numero));
            const quotas = blockedNumbers.size > 0
              ? allQuotas.filter((n: string) => !blockedNumbers.has(n))
              : allQuotas;

            const quotaRows = quotas.map((numero: string) => ({
              order_id: order.id,
              numero,
            }));
            const { error: qErr } = await supabase.from('quotas').insert(quotaRows);
            if (qErr) console.error('Quota insert error:', qErr);

            return new Response(JSON.stringify({
              status: 'CONCLUIDA',
              quotas,
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({
              status: 'CONCLUIDA',
              quotas: existingQuotas.map((q: { numero: string }) => q.numero),
            }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }
      }

      return new Response(JSON.stringify({ status: data.status }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── GET ORDER + QUOTAS BY PHONE ───
    if (action === 'meus-titulos') {
      const { celular } = body;
      if (!celular) {
        return new Response(JSON.stringify({ error: 'celular required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const supabase = getSupabaseAdmin();
      const { data: orders } = await supabase
        .from('orders')
        .select('id, nome, quantidade, valor, status, created_at')
        .eq('celular', celular)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

      const ordersWithQuotas = [];
      for (const order of (orders || [])) {
        const { data: quotas } = await supabase
          .from('quotas')
          .select('numero')
          .eq('order_id', order.id)
          .order('numero', { ascending: true });
        ordersWithQuotas.push({ ...order, quotas: quotas || [] });
      }

      return new Response(JSON.stringify({ orders: ordersWithQuotas }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── WEBHOOK ───
    if (action === 'webhook') {
      console.log('Webhook received');
      if (body.pix && Array.isArray(body.pix)) {
        const supabase = getSupabaseAdmin();
        for (const pix of body.pix) {
          try {
            const verifyRes = await efiRequest('GET', `/v2/cob/${pix.txid}`);
            if (!verifyRes.ok) {
              console.error(`Webhook: failed to verify txid ${pix.txid}`);
              continue;
            }
            const verifyData = await verifyRes.json();
            if (verifyData.status === 'CONCLUIDA') {
              await supabase.from('orders').update({ status: 'paid' }).eq('txid', pix.txid);
            } else {
              console.warn(`Webhook: txid ${pix.txid} status is ${verifyData.status}, not CONCLUIDA`);
            }
          } catch (e) {
            console.error(`Webhook: error verifying txid ${pix.txid}:`, e);
          }
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
