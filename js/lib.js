// DMTechApp — Funções utilitárias globais
// Incluir ANTES dos scripts de página em todos os .html

// Escapa HTML para evitar XSS em innerHTML com dados do banco/usuário
function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Formata valor monetário em BRL
function dmFmt(v) {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Formata data ISO para pt-BR (aceita 'YYYY-MM-DD' ou datetime)
function dmFmtData(d) {
  if (!d) return '—';
  const str = String(d);
  // Se for só data (YYYY-MM-DD), adiciona T12:00 para evitar off-by-one de fuso
  const date = str.length === 10 ? new Date(str + 'T12:00:00') : new Date(str);
  return date.toLocaleDateString('pt-BR');
}
