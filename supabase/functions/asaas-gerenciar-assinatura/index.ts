// asaas-gerenciar-assinatura (DMTech)
// Input: { action: "cancelar" | "proxima_cobranca", assinatura_id }
// Output variável: cancelar -> {ok, cancelada}; proxima_cobranca -> {ok, invoice_url}
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
const ASAAS_BASE = Deno.env.get("ASAAS_BASE_URL") ?? "https://sandbox.asaas.com/api/v3";
const ASAAS_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = (Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;
const ALLOWED_ORIGINS = ["https://dmtechapp.com.br","https://www.dmtechapp.com.br","http://localhost:3000","http://localhost:5555"];
function corsHeaders(req: Request) {
  const o = req.headers.get("origin") ?? "";
  const a = ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
  return { "Access-Control-Allow-Origin": a, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin" };
}
function json(b: unknown, s = 200, cors: Record<string,string> = {}) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
}
async function asaas(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), "access_token": ASAAS_KEY, "content-type": "application/json", "User-Agent": "DMTech/1.0" },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${text}`);
  return data;
}
Deno.serve(async (req) => {
  const CORS = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, CORS);
  const jwt = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!jwt) return json({ error: "unauthorized" }, 401, CORS);
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data: u, error: ue } = await sb.auth.getUser(jwt);
  if (ue || !u?.user) return json({ error: "unauthorized" }, 401, CORS);
  const body = await req.json().catch(() => ({}));
  const { action, assinatura_id } = body;
  if (!action || !assinatura_id) return json({ error: "missing_fields", campos: "action, assinatura_id" }, 400, CORS);
  // busca assinatura e valida que user é dono/admin da company
  const { data: a } = await sb.from("assinaturas").select("*").eq("id", assinatura_id).single();
  if (!a) return json({ error: "assinatura_not_found" }, 404, CORS);
  const { data: perfil } = await sb.from("profiles").select("company_id,role").eq("id", u.user.id).single();
  const isPlatformAdmin = perfil?.company_id === "aaaa0001-0000-0000-0000-000000000001" && perfil?.role === "dono";
  if (!isPlatformAdmin) {
    if (perfil?.company_id !== a.company_id) return json({ error: "forbidden" }, 403, CORS);
    if (perfil?.role !== "dono") return json({ error: "forbidden_role" }, 403, CORS);
  }
  try {
    if (action === "cancelar") {
      await asaas(`/subscriptions/${a.asaas_subscription_id}`, { method: "DELETE" });
      // webhook SUBSCRIPTION_DELETED vai atualizar o banco. Mas forçamos já pra UI responder rápido:
      await sb.from("assinaturas").update({ status: "cancelada" }).eq("id", a.id);
      await sb.from("companies").update({ status_pagamento: "cancelado", bloqueado_em: new Date().toISOString() }).eq("id", a.company_id);
      return json({ ok: true, cancelada: true }, 200, CORS);
    }
    if (action === "proxima_cobranca") {
      // busca cobrança PENDING da subscription — cliente usa o link pra pagar com outro cartão/método
      const ps = await asaas(`/payments?subscription=${a.asaas_subscription_id}&status=PENDING&limit=1`);
      const p = ps?.data?.[0];
      if (!p) return json({ error: "sem_cobranca_pendente", message: "Não há cobrança pendente no momento." }, 404, CORS);
      return json({ ok: true, invoice_url: p.invoiceUrl ?? p.bankSlipUrl, due_date: p.dueDate, value: p.value }, 200, CORS);
    }
    return json({ error: "action_invalida" }, 400, CORS);
  } catch (e) {
    console.error("[dmtech-gerenciar]", e);
    return json({ error: "asaas_error", message: String(e instanceof Error ? e.message : e) }, 500, CORS);
  }
});
