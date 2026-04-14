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
  if (typeof fecharModal === 'function') { fecharModal(); return; }
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
});
