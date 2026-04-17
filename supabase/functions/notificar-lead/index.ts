import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Escapa caracteres especiais do MarkdownV2 do Telegram e limita tamanho
function tgEscape(s: unknown, max = 120) {
  return String(s ?? "")
    .replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, "")
    .slice(0, max);
}

serve(async (req) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { empresa, nome, email } = await req.json();

    const TG_BOT  = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TG_CHAT = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!TG_BOT || !TG_CHAT) {
      return new Response(JSON.stringify({ ok: false, error: 'Telegram not configured' }), {
        status: 200,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Recife' });
    const msg = `🚀 *Novo cliente DM Tech!*\n\n🏢 *Empresa:* ${tgEscape(empresa)}\n👤 *Nome:* ${tgEscape(nome)}\n📧 *E-mail:* ${tgEscape(email, 200)}\n🕐 *Horário:* ${agora}`;

    await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg, parse_mode: 'Markdown' }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
