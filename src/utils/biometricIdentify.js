export function buildBiometricIdentifyPayload({ capturedImage, virtualSeed }) {
  const trimmedSeed = String(virtualSeed || '').trim();
  const image = typeof capturedImage === 'string' ? capturedImage.trim() : '';

  if (image) {
    return { image };
  }

  if (trimmedSeed) {
    return { virtualSeed: trimmedSeed };
  }

  return {};
}
