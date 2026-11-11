import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAccountPayments } from './feeAccountBreakdown.js';

test('summarizes payment history by account', () => {
  const result = summarizeAccountPayments([
    { amount: 1500, account: 'IDP A/C' },
    { amount: 2800, account: 'VTU A/C' },
    { amount: 900, account: 'PD A/C' },
    { amount: 600, account: 'IDP A/C' }
  ]);

  assert.deepEqual(result, {
    idp: 2100,
    vtu: 2800,
    pd: 900
  });
});

test('uses stored account totals when present', () => {
  const result = summarizeAccountPayments([], {
    accountBreakdown: {
      idp: 1200,
      vtu: 3500,
      pd: 500
    }
  });

  assert.deepEqual(result, {
    idp: 1200,
    vtu: 3500,
    pd: 500
  });
});
