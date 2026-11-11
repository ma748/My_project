import base64
import json
import sys

sys.path.insert(0, '.')

try:
    from face_service import generate_virtual_image, extract_virtual_embedding, cosine_similarity
except ImportError as exc:
    raise SystemExit(f'IMPORT_ERROR: {exc}')


def main():
    seed = 'STU-2026-001'
    image = generate_virtual_image(seed)
    if not image or len(image) < 20:
        raise AssertionError('Expected a valid virtual image payload for the student seed.')

    embedding = extract_virtual_embedding(image)
    if len(embedding) != 512:
        raise AssertionError(f'Expected 512 embedding values, got {len(embedding)}')

    other = generate_virtual_image('STU-2026-002')
    other_embedding = extract_virtual_embedding(other)
    same = cosine_similarity(embedding, embedding)
    diff = cosine_similarity(embedding, other_embedding)

    if same < 0.99:
        raise AssertionError(f'Embedding self-similarity should be near 1, got {same}')
    if diff >= 0.7:
        raise AssertionError('Different student seeds should not match strongly.')

    print('virtual face model ok')


if __name__ == '__main__':
    main()
