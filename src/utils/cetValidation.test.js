import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidCETNumber, isValidCETRank, sanitizeCETNumber, sanitizeCETRank } from './cetValidation.js';

test('accepts valid CET numbers in the required format', () => {
  assert.equal(isValidCETNumber('AB123'), true);
  assert.equal(isValidCETNumber('ab123'), true);
  assert.equal(isValidCETNumber('A1B23'), false);
  assert.equal(isValidCETNumber('ABC12'), false);
  assert.equal(isValidCETNumber('AB1234'), false);
});

test('limits CET rank to a maximum of 1000000', () => {
  assert.equal(isValidCETRank('12345'), true);
  assert.equal(isValidCETRank('1000000'), true);
  assert.equal(isValidCETRank('1000001'), false);
  assert.equal(isValidCETRank('-1'), false);
  assert.equal(isValidCETRank('abc'), false);
});

test('sanitizes CET input to the required shape', () => {
  assert.equal(sanitizeCETNumber('ab1234'), 'AB123');
  assert.equal(sanitizeCETNumber('a1b23'), 'AB123');
  assert.equal(sanitizeCETRank('10000001'), '1000000');
  assert.equal(sanitizeCETRank('54321'), '54321');
});
