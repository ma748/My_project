export const ACCOUNT_LABELS = {
  idp: 'IDP A/C',
  vtu: 'VTU A/C',
  pd: 'PD A/C'
};

export const ACCOUNT_OPTIONS = Object.entries(ACCOUNT_LABELS).map(([key, label]) => ({
  key,
  label,
  value: label
}));

export function normalizeAccountKey(account) {
  const value = String(account ?? '').trim().toLowerCase();

  if (value === 'kea') return null;
  if (value.includes('idp')) return 'idp';
  if (value.includes('vtu')) return 'vtu';
  return 'pd';
}

export function summarizeAccountPayments(history = [], feeDetails = {}) {
  const totals = { idp: 0, vtu: 0, pd: 0 };
  const historyTotals = { idp: 0, vtu: 0, pd: 0 };
  (history || []).forEach((entry) => {
    const key = normalizeAccountKey(entry?.account || entry?.accountType || entry?.accountName);
    if (!key) return;
    historyTotals[key] += Number(entry?.amount || 0);
  });
  if (Object.values(historyTotals).some((value) => value > 0)) return historyTotals;

  const storedBreakdown = feeDetails?.accountBreakdown ?? {};
  const hasStoredBreakdown = Object.keys(storedBreakdown).length > 0;

  if (hasStoredBreakdown) {
    Object.entries(storedBreakdown).forEach(([key, value]) => {
      const normalizedKey = String(key).trim().toLowerCase();
      if (normalizedKey.includes('idp')) totals.idp += Number(value || 0);
      else if (normalizedKey.includes('vtu')) totals.vtu += Number(value || 0);
      else if (normalizedKey.includes('pd')) totals.pd += Number(value || 0);
    });
    return totals;
  }

  return totals;
}
