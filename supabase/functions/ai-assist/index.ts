import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const GEMINI_KEY = Deno.env.get("GEMINI_KEY");
  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: "GEMINI_KEY não configurada" }), {
      status: 500, headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const { action, os } = await req.json();

  let prompt = "";

  if (action === "checklist") {
    prompt = `Você é um assistente técnico de uma empresa de serviços elétricos que faz instalações residenciais e comerciais (câmeras, cercas elétricas, motores, CFTV, elétrica em geral).

Gere um checklist de campo para o técnico executar este serviço:

Descrição do serviço: ${os.notes || "não informado"}
Cliente: ${os.client_name}

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
    const statusLabel = statusLabels[os.status] || os.status;

    prompt = `Você é um assistente de uma empresa de serviços elétricos.
Escreva uma mensagem curta e profissional para WhatsApp informando o cliente sobre a OS.

Cliente: ${os.client_name}
OS nº: ${String(os.numero).padStart(3, "0")}
Situação: ${statusLabel}
Serviço: ${os.notes || "serviço solicitado"}

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
