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
    window.location.href = redirectTo;
    return false;
  }
  return true;
}

async function signOut() {
  await sb.auth.signOut();
  localStorage.clear();
  window.location.href = 'login.html';
}

function isPlatformAdmin() {
  return APP.profile?.role === 'dono' &&
    APP.profile?.company_id === 'aaaa0001-0000-0000-0000-000000000001';
}

// ESC fecha qualquer modal aberto em qualquer página
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (document.getElementById('dm-confirm-overlay')?.classList.contains('show')) return; // não fecha modal de fundo
  if (typeof fecharModal === 'function') { fecharModal(); return; }
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
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
  } catch(e) { /* silencioso */ }
}

function dmToast(msg, tipo = 'success') {
  const el = document.getElementById('dm-toast');
  el.textContent = msg;
  el.className = 'show ' + tipo;
  clearTimeout(_dmToastTimer);
  _dmToastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}
