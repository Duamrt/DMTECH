import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://dmtechapp.com.br",
  "https://www.dmtechapp.com.br",
  "http://localhost:3000",
  "http://localhost:5555",
];

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const CORS = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verificar se quem chama é admin da plataforma
  const jwt = req.headers.get("authorization") ?? "";
  const caller = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { authorization: jwt } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authErr } = await caller.auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // Checar se é dono da conta master
  const { data: profile } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    profile.role !== "dono" ||
    profile.company_id !== "aaaa0001-0000-0000-0000-000000000001"
  ) {
    return new Response(JSON.stringify({ error: "Acesso negado" }), {
      status: 403, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const { company_id } = await req.json();

  if (!company_id || company_id === "aaaa0001-0000-0000-0000-000000000001") {
    return new Response(JSON.stringify({ error: "company_id inválido" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // Buscar todos os user_ids vinculados à empresa
  const { data: profilesData } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", company_id);

  const userIds = (profilesData ?? []).map((p: { id: string }) => p.id);

  // Deletar dados da empresa via RPC (já existente)
  const { error: rpcErr } = await admin.rpc("admin_delete_company", {
    p_company_id: company_id,
  });

  if (rpcErr) {
    return new Response(JSON.stringify({ error: rpcErr.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // Deletar usuários do Auth (libera os emails)
  const erros: string[] = [];
  for (const uid of userIds) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) erros.push(`${uid}: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ ok: true, usuarios_removidos: userIds.length, erros }),
    { headers: { "Content-Type": "application/json", ...CORS } }
  );
});
