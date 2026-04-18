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

function sanitize(s: unknown, max = 500) {
  return String(s ?? "").replace(/[`$\\]/g, "").slice(0, max);
}

serve(async (req) => {
  const CORS = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  // Autenticação JWT
  const jwt = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!jwt) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { "Content-Type": "application/json", ...CORS },
    });
  }
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY  = (Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))!;
  const caller = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authErr } = await caller.auth.getUser(jwt);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const GEMINI_KEY = Deno.env.get("GEMINI_KEY");
  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_KEY não configurada" }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const { action, os } = await req.json();
  const notes      = sanitize(os?.notes, 500);
  const clientName = sanitize(os?.client_name, 120);
  const numero     = String(os?.numero ?? "").replace(/\D/g, "").slice(0, 10);
  const statusKey  = sanitize(os?.status, 40);

  let prompt = "";

  if (action === "checklist") {
    prompt = `Você é um assistente técnico de uma empresa de serviços elétricos que faz instalações residenciais e comerciais (câmeras, cercas elétricas, motores, CFTV, elétrica em geral).

Gere um checklist de campo para o técnico executar este serviço:

Descrição do serviço: ${notes || "não informado"}
Cliente: ${clientName}

Retorne APENAS os itens do checklist, sem título, sem explicação, no formato:
☐ item
(máximo 8 itens, práticos e diretos, adequados ao serviço descrito)`;

  } else if (action === "whatsapp") {
    const statusLabels: Record<string, string> = {
      aberta: "recebida e em fila",
      em_andamento: "em execução",
      aguardando_peca: "aguardando material",
      pronta: "concluída e pronta",
      entregue: "encerrada",
    };
    const statusLabel = statusLabels[statusKey] || statusKey;

    prompt = `Você é um assistente de uma empresa de serviços elétricos.
Escreva uma mensagem curta e profissional para WhatsApp informando o cliente sobre a OS.

Cliente: ${clientName}
OS nº: ${numero.padStart(3, "0")}
Situação: ${statusLabel}
Serviço: ${notes || "serviço solicitado"}

Regras:
- Máximo 3 linhas
- Sem asteriscos ou markdown
- Tom cordial e direto
- Mencione o número da OS
- Termine com algo que deixe o cliente tranquilo`;
  } else {
    return new Response(JSON.stringify({ error: "action inválida" }), {
      status: 400, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Erro ao gerar resposta.";

  return new Response(JSON.stringify({ text: text.trim() }), {
    headers: { "Content-Type": "application/json", ...CORS },
  });
});
