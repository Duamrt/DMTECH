import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { empresa, nome, email } = await req.json();

    const TG_BOT  = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TG_CHAT = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!TG_BOT || !TG_CHAT) {
      return new Response(JSON.stringify({ ok: false, error: 'Telegram not configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const agora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Recife' });
    const msg = `🚀 *Novo cliente DM Tech!*\n\n🏢 *Empresa:* ${empresa}\n👤 *Nome:* ${nome}\n📧 *E-mail:* ${email}\n🕐 *Horário:* ${agora}`;

    await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, text: msg, parse_mode: 'Markdown' }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
