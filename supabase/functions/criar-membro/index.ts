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

const MASTER_COMPANY = "aaaa0001-0000-0000-0000-000000000001";

serve(async (req) => {
  const CORS = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY  = (Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Autenticar chamador
  const jwt = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { "Content-Type": "application/json", ...CORS },
    });
  }
  const { data: { user }, error: authErr } = await admin.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!callerProfile || callerProfile.role !== "dono") {
    return new Response(JSON.stringify({ error: "Acesso negado" }), {
      status: 403, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const { name, email, whatsapp, password, company_id } = await req.json();

  if (!name || !email || !password || !company_id) {
    return new Response(JSON.stringify({ error: "Campos obrigatórios faltando." }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  if (String(password).length < 8) {
    return new Response(JSON.stringify({ error: "Senha deve ter ao menos 8 caracteres." }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // Bloquear tenant master
  if (company_id === MASTER_COMPANY) {
    return new Response(JSON.stringify({ error: "company_id inválido" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // Dono só cria membro na própria empresa (admin da plataforma pode em qualquer uma exceto master)
  const isPlatformAdmin = callerProfile.company_id === MASTER_COMPANY;
  if (!isPlatformAdmin && callerProfile.company_id !== company_id) {
    return new Response(JSON.stringify({ error: "Acesso negado" }), {
      status: 403, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // 1. Criar usuário no Auth
  const { data: authData, error: authCreateErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authCreateErr) {
    return new Response(JSON.stringify({ error: authCreateErr.message }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // 2. Criar profile vinculado à empresa
  const { error: profErr } = await admin.from("profiles").insert({
    id:         authData.user.id,
    name,
    email,
    whatsapp,
    company_id,
    role:       "tecnico",
  });

  if (profErr) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return new Response(JSON.stringify({ error: profErr.message }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  return new Response(JSON.stringify({ ok: true, id: authData.user.id }), {
    headers: { "Content-Type": "application/json", ...CORS },
  });
});
