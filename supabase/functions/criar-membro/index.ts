import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { name, email, whatsapp, password, company_id } = await req.json();

  if (!name || !email || !password || !company_id) {
    return new Response(JSON.stringify({ error: "Campos obrigatórios faltando." }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  // 1. Criar usuário no Auth
  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authErr) {
    return new Response(JSON.stringify({ error: authErr.message }), {
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
    // rollback: remove o usuário criado
    await admin.auth.admin.deleteUser(authData.user.id);
    return new Response(JSON.stringify({ error: profErr.message }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  return new Response(JSON.stringify({ ok: true, id: authData.user.id }), {
    headers: { "Content-Type": "application/json", ...CORS },
  });
});
