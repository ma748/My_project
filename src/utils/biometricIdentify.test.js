import test from 'node:test';
import assert from 'node:assert/strict';

import { buildBiometricIdentifyPayload } from './biometricIdentify.js';

test('prefers the captured face image when both are available', () => {
  const payload = buildBiometricIdentifyPayload({
    capturedImage: 'data:image/jpeg;base64,abc123',
    virtualSeed: 'STU-2026-001'
  });

  assert.deepEqual(payload, {
    image: 'data:image/jpeg;base64,abc123'
  });
});

test('falls back to the captured image when no seed is selected', () => {
  const payload = buildBiometricIdentifyPayload({
    capturedImage: 'data:image/jpeg;base64,abc123',
    virtualSeed: ''
  });

  assert.deepEqual(payload, {
    image: 'data:image/jpeg;base64,abc123'
  });
});

test('falls back to the virtual seed when no snapshot is captured', () => {
  const payload = buildBiometricIdentifyPayload({
    capturedImage: '',
    virtualSeed: ' STU-2026-002 '
  });

  assert.deepEqual(payload, {
    virtualSeed: 'STU-2026-002'
  });
});
