# DMTechApp — SaaS para Prestadores de Serviço

Sempre responda em português brasileiro.

## Projeto
- **Stack:** HTML + CSS + JS vanilla + Supabase (PostgreSQL)
- **Deploy:** `./deploy.sh "mensagem"` → dmtechapp.com.br (GitHub Pages, branch main)
- **Branches:** dev → main
- **Servidor local:** `npx serve -s .`
- **Supabase:** projeto DMTech

## Arquitetura
- SaaS multi-tenant — tenant = empresa prestadora de serviço
- Módulos: clientes · OS · agenda · financeiro · estoque · equipe · folha · relatório · admin
- PWA com ícone DM laranja
- Signup self-service + wizard onboarding + planos trial/PIX
- Sem Edge Function ai-assist — IA local

## Gotchas críticos
- **audit_log:** toda ação sensível registra em `audit_log` — não remover
- **started_at / garantia / link_externo:** colunas existem no banco — SEMPRE incluir no SELECT de OS
- **Planos:** trial → básico → profissional → master. `plan_expires_at` null = expirado (mesmo master)

## Início de sessão
Ao iniciar qualquer sessão neste repo, leia primeiro:
`G:/DUAM - ECOSISTEMA/DUAM - ECOSISTEMA/07_DMTECH/_CONTEXTO_MESTRE.md`
Esse arquivo tem: estado atual, pendências priorizadas, bugs abertos, próxima task.
