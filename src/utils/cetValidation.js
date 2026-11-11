export function isValidCETNumber(value = '') {
  const text = String(value || '').trim();
  return /^[A-Za-z]{2}\d{3}$/.test(text);
}

export function sanitizeCETNumber(value = '') {
  const text = String(value || '').trim().toUpperCase();
  const letters = text.replace(/[^A-Za-z]/g, '').slice(0, 2);
  const digits = text.replace(/\D/g, '').slice(0, 3);

  if (!letters && !digits) return '';
  const result = `${letters}${digits}`;
  return result.length > 5 ? result.slice(0, 5) : result;
}

export function isValidCETRank(value = '') {
  const text = String(value ?? '').trim();
  if (!/^\d+$/.test(text)) return false;
  const rank = Number(text);
  return Number.isFinite(rank) && rank >= 1 && rank <= 1000000;
}

export function sanitizeCETRank(value = '') {
  const text = String(value ?? '').trim().replace(/\D/g, '');
  if (!text) return '';
  const rank = Math.min(Number(text || 0), 1000000);
  return String(rank);
}
