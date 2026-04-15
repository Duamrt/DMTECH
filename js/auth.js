const APP = {
  user: null,
  profile: null,
  company: null
};

async function getProfile() {
  const { data: { user }, error } = await sb.auth.getUser();
  if (error || !user) return null;
  APP.user = user;

  const { data: profile } = await sb.from('profiles')
    .select('*, companies(*)')
    .eq('id', user.id)
    .single();

  if (!profile) return null;
  APP.profile = profile;
  APP.company = profile.companies;
  return profile;
}

async function requireAuth(redirectTo = 'login.html') {
  const profile = await getProfile();
  if (!profile) {
    // Setup pendente: signup com confirmação de e-mail ativada no Supabase
    const pending = localStorage.getItem('dmtech-pending-setup');
    if (pending && APP.user) {
      try {
        const { nomeEmpresa, nomeUser } = JSON.parse(pending);
        const { error } = await sb.rpc('create_company_with_owner', {
          p_company_name: nomeEmpresa,
          p_owner_name:   nomeUser
        });
        if (!error) {
          localStorage.removeItem('dmtech-pending-setup');
          const p2 = await getProfile();
          if (p2) return true;
        }
      } catch(e) { /* silencioso */ }
    }
    window.location.href = redirectTo;
    return false;
  }

  // Admin acessando outra empresa (expira em 8h)
  if (isPlatformAdmin()) {
    const adminCoId  = localStorage.getItem('dmtech-admin-company');
    const adminCoTs  = parseInt(localStorage.getItem('dmtech-admin-company-ts') || '0', 10);
    const oitoHoras  = 8 * 60 * 60 * 1000;
    if (adminCoId && (Date.now() - adminCoTs) < oitoHoras) {
      const { data: co } = await sb.rpc('admin_get_company', { p_company_id: adminCoId });
      if (co) {
        APP.company = co;
        _mostrarBarraAdmin(co.name);
      }
    } else if (adminCoId) {
      localStorage.removeItem('dmtech-admin-company');
      localStorage.removeItem('dmtech-admin-company-ts');
    }
  }

  // Verificar plano (exceto páginas de acesso livre e admin)
  const page = window.location.pathname.split('/').pop() || 'index.html';
  const paginasExentas = ['upgrade.html', 'admin.html', 'login.html', 'signup.html', 'landing.html'];
  if (!paginasExentas.includes(page) && !isPlatformAdmin()) {
    if (!checkPlan()) return false;
  }

  // Modo técnico: redireciona páginas bloqueadas + filtra sidebar
  if (APP.profile?.role === 'tecnico') {
    const bloqueadasTecnico = ['dashboard.html','orcamentos.html','financeiro.html','fornecedores.html','notas-fiscais.html','folha.html','audit.html'];
    if (bloqueadasTecnico.includes(page)) {
      window.location.href = 'minha-fila.html';
      return false;
    }
    document.body.classList.add('modo-tecnico');
    _filtrarNavTecnico();
  }

  _injetarBtnFecharSidebar();
  return true;
}

function _injetarBtnFecharSidebar() {
  const logo = document.querySelector('.sidebar-logo');
  if (!logo || document.getElementById('btn-fechar-sidebar')) return;
  // Envolve o conteúdo existente num wrapper
  const wrap = document.createElement('div');
  wrap.className = 'logo-text';
  while (logo.firstChild) wrap.appendChild(logo.firstChild);
  logo.appendChild(wrap);
  // Botão fechar
  const btn = document.createElement('button');
  btn.id = 'btn-fechar-sidebar';
  btn.innerHTML = '&#8592;';
  btn.setAttribute('aria-label', 'Fechar menu');
  btn.onclick = () => { if (typeof toggleSidebar === 'function') toggleSidebar(); };
  logo.appendChild(btn);
}

function _mostrarBarraAdmin(nomeEmpresa) {
  if (document.getElementById('dm-admin-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'dm-admin-bar';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9997;background:#f97316;color:#fff;font-family:Manrope,sans-serif;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:space-between;padding:6px 16px;gap:12px';
  bar.innerHTML = `<span>&#9650; ADMIN — visualizando: <strong>${String(nomeEmpresa ?? '').replace(/</g,'&lt;')}</strong></span><button onclick="sairModoAdmin()" style="background:rgba(0,0,0,.25);border:none;color:#fff;font-size:11px;font-weight:700;font-family:Manrope,sans-serif;padding:4px 12px;cursor:pointer">&#8592; Voltar ao Admin</button>`;
  document.body.prepend(bar);
  // empurra o conteúdo pra baixo
  document.body.style.paddingTop = (parseInt(document.body.style.paddingTop) || 0) + 32 + 'px';
}

function sairModoAdmin() {
  localStorage.removeItem('dmtech-admin-company');
  localStorage.removeItem('dmtech-admin-company-ts');
  window.location.href = 'admin.html';
}

function checkPlan() {
  const c = APP.company;
  if (!c) { window.location.href = 'login.html'; return false; } // empresa não carregou = sessão inválida
  const plan = c.plan || 'trial';
  if (plan === 'admin' || plan === 'profissional' || plan === 'empresarial') return true;
  if (plan === 'expirado') {
    window.location.href = 'upgrade.html';
    return false;
  }
  if (plan === 'trial') {
    const trialEnd = c.trial_ends_at ? new Date(c.trial_ends_at) : null;
    if (trialEnd && trialEnd < new Date()) {
      // Marca como expirado no banco (silencioso)
      sb.from('companies').update({ plan: 'expirado' }).eq('id', c.id).then(() => {});
      window.location.href = 'upgrade.html';
      return false;
    }
  }
  return true;
}

// Retorna dias restantes do trial (null se não for trial)
function trialDiasRestantes() {
  const c = APP.company;
  if (!c || c.plan !== 'trial' || !c.trial_ends_at) return null;
  return Math.ceil((new Date(c.trial_ends_at) - new Date()) / 86400000);
}

async function signOut() {
  await sb.auth.signOut();
  localStorage.clear();
  window.location.href = 'login.html';
}

function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
  document.getElementById('sidebar-overlay')?.classList.toggle('show');
}

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    document.querySelector('.sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  }
});

function isPlatformAdmin() {
  return APP.profile?.role === 'dono' &&
    APP.profile?.company_id === 'aaaa0001-0000-0000-0000-000000000001';
}

function podeVer(key) {
  if (APP.profile?.role === 'dono') return true;
  return !!(APP.profile?.permissions?.[key]);
}

function _filtrarNavTecnico() {
  const bloqueadas = ['dashboard.html','orcamentos.html','financeiro.html','fornecedores.html','notas-fiscais.html','folha.html','audit.html'];
  document.querySelectorAll('.sidebar-nav a.nav-item').forEach(a => {
    const href = (a.getAttribute('href') || '').split('?')[0].split('/').pop();
    if (bloqueadas.includes(href)) a.style.display = 'none';
  });
}

// ESC fecha qualquer modal ou painel aberto em qualquer página
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('dm-confirm-overlay')?.classList.contains('show')) return;
  // Painel lateral (kanban e outros que usam classe .open)
  const painel = document.getElementById('side-panel');
  if (painel?.classList.contains('open')) {
    painel.classList.remove('open');
    document.getElementById('panel-overlay')?.classList.remove('open');
    return;
  }
  // Modais padrão
  if (typeof fecharModal === 'function') { fecharModal(); return; }
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  // Sidebar mobile
  document.querySelector('.sidebar.open')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
});

// ── Confirm e Toast globais ──
let _dmConfirmCb = null;
let _dmToastTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  const st = document.createElement('style');
  st.textContent = `
    #dm-confirm-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9998;align-items:center;justify-content:center}
    #dm-confirm-overlay.show{display:flex}
    #dm-confirm-box{background:var(--surface-2);border:1px solid var(--border);width:100%;max-width:400px;padding:28px;font-family:'Manrope',sans-serif}
    #dm-confirm-msg{font-size:14px;color:var(--text);margin-bottom:24px;line-height:1.6;font-weight:500}
    .dm-confirm-btns{display:flex;gap:10px;justify-content:flex-end}
    #dm-confirm-cancel{background:none;border:1px solid var(--border);color:var(--text-muted);padding:9px 18px;font-size:13px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer}
    #dm-confirm-cancel:hover{color:var(--text)}
    #dm-confirm-ok{background:var(--accent);border:none;color:#fff;padding:9px 18px;font-size:13px;font-weight:700;font-family:'Manrope',sans-serif;cursor:pointer}
    #dm-confirm-ok:hover{opacity:.88}
    #dm-confirm-ok.danger{background:#ef4444}
    #dm-toast{position:fixed;bottom:24px;right:24px;padding:12px 20px;font-size:13px;font-weight:700;font-family:'Manrope',sans-serif;z-index:9999;display:none;max-width:340px;border:1px solid}
    #dm-toast.show{display:block}
    #dm-toast.success{background:rgba(74,222,128,.08);border-color:#4ade80;color:#4ade80}
    #dm-toast.error{background:rgba(239,68,68,.08);border-color:#f87171;color:#f87171}
    #dm-toast.info{background:var(--surface-2);border-color:var(--border);color:var(--text)}
    .modo-tecnico .hide-tecnico{display:none!important}
  `;
  document.head.appendChild(st);
  document.body.insertAdjacentHTML('beforeend', `
    <div id="dm-confirm-overlay">
      <div id="dm-confirm-box">
        <div id="dm-confirm-msg"></div>
        <div class="dm-confirm-btns">
          <button id="dm-confirm-cancel">Cancelar</button>
          <button id="dm-confirm-ok">Confirmar</button>
        </div>
      </div>
    </div>
    <div id="dm-toast"></div>
  `);
  document.getElementById('dm-confirm-cancel').addEventListener('click', () => {
    document.getElementById('dm-confirm-overlay').classList.remove('show');
    _dmConfirmCb = null;
  });
  document.getElementById('dm-confirm-ok').addEventListener('click', () => {
    document.getElementById('dm-confirm-overlay').classList.remove('show');
    const cb = _dmConfirmCb; _dmConfirmCb = null;
    if (cb) cb();
  });
});

function dmConfirm(msg, onConfirm, btnLabel = 'Confirmar', danger = false) {
  document.getElementById('dm-confirm-msg').textContent = msg;
  const ok = document.getElementById('dm-confirm-ok');
  ok.textContent = btnLabel;
  danger ? ok.classList.add('danger') : ok.classList.remove('danger');
  document.getElementById('dm-confirm-overlay').classList.add('show');
  _dmConfirmCb = onConfirm;
}

async function auditLog(action, entity, entityId, entityLabel, details) {
  if (!APP?.company?.id) return;
  try {
    await sb.from('audit_log').insert({
      company_id: APP.company.id,
      user_id: APP.user?.id || null,
      user_name: APP.profile?.name || APP.profile?.email || '',
      action, entity,
      entity_id: entityId ? String(entityId) : null,
      entity_label: entityLabel || null,
      details: details || null
    });
  } catch(e) { console.warn('[auditLog]', e?.message || e); }
}

function dmToast(msg, tipo = 'success') {
  const el = document.getElementById('dm-toast');
  el.textContent = msg;
  el.className = 'show ' + tipo;
  clearTimeout(_dmToastTimer);
  _dmToastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
