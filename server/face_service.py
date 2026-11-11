import http.server
import json
import base64
import hashlib
import math

PORT = 5001


def normalize_vector(vector):
    if not vector:
        return []
    magnitude = math.sqrt(sum(x * x for x in vector))
    if magnitude == 0:
        return vector
    return [x / magnitude for x in vector]


def as_seed(value):
    if value is None:
        return ''
    if isinstance(value, dict):
        for key in ('virtualSeed', 'seed', 'studentId', 'id', 'studentName'):
            if key in value:
                return as_seed(value[key])
        return ''
    return str(value)


def deterministic_vector(seed, length=512):
    text = str(seed).strip()
    if not text:
        text = 'virtual-face-student'
    digest = hashlib.sha256(text.encode('utf-8')).digest()
    state = int.from_bytes(digest, 'big', signed=False)
    vector = []
    for _ in range(length):
        state = (state * 1103515245 + 12345) & 0x7fffffff
        vector.append(((state % 2000) / 1000.0) - 1.0)
    return normalize_vector(vector)


def generate_virtual_image(seed):
    seed_text = as_seed(seed)
    values = deterministic_vector(seed_text, 48 * 48)
    header = b'P5\n48 48\n255\n'
    payload = bytearray()
    for idx in range(len(values)):
        value = int((values[idx] + 1.0) * 127.5)
        payload.append(max(0, min(255, value)))
    data = header + bytes(payload)
    encoded = base64.b64encode(data).decode('ascii')
    return 'data:image/x-portable-graymap;base64,' + encoded


def extract_virtual_embedding(value):
    if isinstance(value, (int, float, str)):
        text = str(value)
        if text.startswith('virtual:'):
            return deterministic_vector(text.replace('virtual:', '', 1))
        if text.startswith('data:'):
            if ',' in text:
                payload = text.split(',', 1)[1]
                try:
                    image_bytes = base64.b64decode(payload)
                    return deterministic_vector(hashlib.sha256(image_bytes).hexdigest())
                except Exception:
                    return deterministic_vector(payload)
            return deterministic_vector(text)
        return deterministic_vector(text)
    if isinstance(value, list):
        return normalize_vector(value)
    if isinstance(value, dict):
        return extract_virtual_embedding(as_seed(value))
    return deterministic_vector(str(value))


def cosine_similarity(a, b):
    if len(a) != len(b):
        return 0.0
    numerator = sum(x * y for x, y in zip(a, b))
    a_norm = math.sqrt(sum(x * x for x in a))
    b_norm = math.sqrt(sum(x * x for x in b))
    if a_norm == 0 or b_norm == 0:
        return 0.0
    return numerator / (a_norm * b_norm)


def detect_facial_expression(image):
    """Classify expression independently from the identity embedding."""
    try:
        from deepface import DeepFace

        result = DeepFace.analyze(
            image,
            actions=['emotion'],
            detector_backend='opencv',
            enforce_detection=False,
            silent=True
        )
        if isinstance(result, list):
            result = result[0] if result else {}
        emotion = result.get('dominant_emotion')
        scores = result.get('emotion') or {}
        if not emotion:
            return {'label': 'Unknown', 'confidence': 0.0, 'available': False}
        return {
            'label': str(emotion).capitalize(),
            'confidence': round(float(scores.get(emotion, 0.0)) / 100.0, 3),
            'available': True
        }
    except Exception:
        return {'label': 'Unavailable', 'confidence': 0.0, 'available': False}


def compute_image_hash(image_bytes):
    hasher = hashlib.md5()
    hasher.update(image_bytes)
    h = hasher.hexdigest()
    state = int(h, 16)
    vector = []
    for _ in range(512):
        state = (state * 1103515245 + 12345) & 0x7fffffff
        vector.append(((state % 2000) / 1000.0) - 1.0)
    return normalize_vector(vector)

def compute_face_embedding(image):
    """Use an identity-focused model so expression changes affect recognition less."""
    try:
        from deepface import DeepFace

        result = DeepFace.represent(
            image,
            model_name='Facenet512',
            detector_backend='opencv',
            enforce_detection=False,
            align=True,
            normalization='Facenet'
        )
        if isinstance(result, list):
            result = result[0] if result else {}
        embedding = result.get('embedding', [])
        if len(embedding) == 512:
            return normalize_vector([float(value) for value in embedding])
    except Exception:
        pass
    return None


def extract_detected_face_embedding(image_bytes, include_expression=True):
    import cv2
    import numpy as np

    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError('The captured image could not be decoded')

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    if gray.size == 0:
        raise ValueError('The captured image is empty. Center the student face and try again.')

    height, width = gray.shape
    left, top, right, bottom = 0, 0, width, height
    try:
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        detector = cv2.CascadeClassifier(cascade_path)
        detected_faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
        if len(detected_faces):
            face_x, face_y, face_width, face_height = max(detected_faces, key=lambda box: box[2] * box[3])
            padding_x = int(face_width * 0.28)
            padding_y = int(face_height * 0.38)
            left = max(0, face_x - padding_x)
            top = max(0, face_y - padding_y)
            right = min(width, face_x + face_width + padding_x)
            bottom = min(height, face_y + face_height + padding_y)
    except Exception:
        pass

    if right == width and bottom == height and left == 0 and top == 0:
        crop_width = int(width * 0.65)
        crop_height = int(height * 0.85)
        left = max(0, (width - crop_width) // 2)
        top = max(0, (height - crop_height) // 2)
        right = min(width, left + crop_width)
        bottom = min(height, top + crop_height)

    face = gray[top:bottom, left:right]
    if face.size == 0:
        raise ValueError('The captured image could not be cropped. Try another snapshot.')

    identity_embedding = compute_face_embedding(image)
    stable_height = max(1, int(face.shape[0] * 0.72))
    face = face[:stable_height, :]
    face = cv2.resize(face, (32, 32), interpolation=cv2.INTER_AREA)
    face = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4)).apply(face)
    face = cv2.GaussianBlur(face, (3, 3), 0)

    gradient_x = cv2.Sobel(face, cv2.CV_32F, 1, 0, ksize=3)
    gradient_y = cv2.Sobel(face, cv2.CV_32F, 0, 1, ksize=3)
    gradient_x = cv2.resize(gradient_x, (16, 16), interpolation=cv2.INTER_AREA)
    gradient_y = cv2.resize(gradient_y, (16, 16), interpolation=cv2.INTER_AREA)
    fallback_embedding = normalize_vector(gradient_x.flatten().astype(float).tolist() + gradient_y.flatten().astype(float).tolist())
    embedding = identity_embedding or fallback_embedding
    face_box = {'x': int(left), 'y': int(top), 'width': int(right - left), 'height': int(bottom - top)}
    expression = detect_facial_expression(image) if include_expression else {'label': 'Unavailable', 'confidence': 0.0, 'available': False}
    return embedding, face_box, expression


registered_hashes = {}


class FaceServiceHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data.decode('utf-8'))
        except Exception:
            self.wfile.write(json.dumps({"error": "Invalid JSON format"}).encode('utf-8'))
            return

        try:
            if self.path == '/extract':
                self.handle_extract(data)
            elif self.path == '/recognize':
                self.handle_recognize(data)
            else:
                self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))
        except Exception as error:
            self.wfile.write(json.dumps({"error": str(error), "faceDetected": False}).encode('utf-8'))

    def handle_extract(self, data=None):
        if data is None:
            data = {}

        image_base64 = data.get('image', '')
        seed = data.get('virtualSeed') or data.get('seed') or data.get('studentId')

        if not image_base64 and not seed:
            self.wfile.write(json.dumps({"error": "No image or virtual seed provided"}).encode('utf-8'))
            return

        if image_base64 and str(image_base64).startswith('data:'):
            if ',' in str(image_base64):
                image_base64 = image_base64.split(',', 1)[1]
            try:
                image_bytes = base64.b64decode(image_base64)
            except Exception:
                self.wfile.write(json.dumps({"error": "Failed to decode base64 image"}).encode('utf-8'))
                return

            embedding, face_box, expression = extract_detected_face_embedding(image_bytes)
            response = {"embedding": embedding, "method": "OpenCV-Centered-Face-Model", "faceDetected": True, "faceBox": face_box, "expression": expression}
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        virtual_seed = data.get('virtualSeed') or data.get('seed') or data.get('studentId')
        if virtual_seed:
            embedding = extract_virtual_embedding(virtual_seed)
            virtual_image = generate_virtual_image(virtual_seed)
            response = {
                "embedding": embedding,
                "method": "Virtual-Student-Model",
                "virtualImage": virtual_image,
                "seed": str(virtual_seed)
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        if image_base64 and str(image_base64).startswith('virtual:'):
            embedding = extract_virtual_embedding(image_base64)
            response = {
                "embedding": embedding,
                "method": "Virtual-Student-Model",
                "virtualImage": generate_virtual_image(image_base64.replace('virtual:', '', 1))
            }
            self.wfile.write(json.dumps(response).encode('utf-8'))
            return

        if isinstance(image_base64, str) and ',' in image_base64:
            image_base64 = image_base64.split(',', 1)[1]

        try:
            image_bytes = base64.b64decode(image_base64)
        except Exception:
            self.wfile.write(json.dumps({"error": "Failed to decode base64 image"}).encode('utf-8'))
            return

        try:
            embedding, face_box, expression = extract_detected_face_embedding(image_bytes)
            response = {"embedding": embedding, "method": "OpenCV-Centered-Face-Model", "faceDetected": True, "faceBox": face_box, "expression": expression}
        except Exception as e:
            response = {"error": str(e), "faceDetected": False}

        self.wfile.write(json.dumps(response).encode('utf-8'))

    def handle_recognize(self, data):
        image_base64 = data.get('image', '')
        students = data.get('students', [])
        virtual_seed = data.get('virtualSeed') or data.get('studentId') or data.get('seed')
        query_is_real_image = str(image_base64).startswith('data:image/') and 'image/x-portable-graymap' not in str(image_base64)[:80]

        if not image_base64 and not virtual_seed:
            self.wfile.write(json.dumps({"error": "No image or virtual seed provided"}).encode('utf-8'))
            return

        if not students:
            self.wfile.write(json.dumps({"match": None, "message": "No registered students in search list"}).encode('utf-8'))
            return

        query_embedding = None
        expression = {'label': 'Unavailable', 'confidence': 0.0, 'available': False}
        if virtual_seed and not image_base64:
            query_embedding = extract_virtual_embedding(virtual_seed)
        elif image_base64 and str(image_base64).startswith('data:'):
            if ',' in str(image_base64):
                image_base64 = image_base64.split(',', 1)[1]
            try:
                image_bytes = base64.b64decode(image_base64)
            except Exception:
                self.wfile.write(json.dumps({"error": "Failed to decode base64 image"}).encode('utf-8'))
                return

            query_embedding = None
            try:
                query_embedding, _, expression = extract_detected_face_embedding(image_bytes)
            except Exception as error:
                self.wfile.write(json.dumps({"error": str(error), "faceDetected": False}).encode('utf-8'))
                return
        elif str(image_base64).startswith('virtual:'):
            query_embedding = extract_virtual_embedding(image_base64)
        else:
            if ',' in str(image_base64):
                image_base64 = image_base64.split(',', 1)[1]
            try:
                image_bytes = base64.b64decode(image_base64)
            except Exception:
                self.wfile.write(json.dumps({"error": "Failed to decode base64 image"}).encode('utf-8'))
                return

            query_embedding = compute_image_hash(image_bytes)
            expression = {'label': 'Unavailable', 'confidence': 0.0, 'available': False}

        best_match = None
        best_similarity = -1.0
        ranked_matches = []

        for student in students:
            student_id = student.get('id')
            student_embedding = student.get('embedding')
            reference_image = student.get('referenceImage')
            reference_is_virtual = str(reference_image).startswith('data:image/x-portable-graymap') or str(reference_image).startswith('virtual:')
            if query_is_real_image and (not reference_image or reference_is_virtual):
                continue
            if reference_image and str(reference_image).startswith('data:'):
                try:
                    reference_payload = str(reference_image).split(',', 1)[1]
                    reference_bytes = base64.b64decode(reference_payload)
                    student_embedding, _, _ = extract_detected_face_embedding(reference_bytes, include_expression=False)
                except Exception:
                    if query_is_real_image:
                        continue
                    student_embedding = None
            if not student_id or not student_embedding or len(student_embedding) != 512:
                continue
            similarity = cosine_similarity(query_embedding, student_embedding)
            ranked_matches.append((student_id, similarity))
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = student_id

        ranked_matches.sort(key=lambda item: item[1], reverse=True)
        second_similarity = ranked_matches[1][1] if len(ranked_matches) > 1 else -1.0
        threshold = 0.55
        minimum_margin = 0.08
        if best_similarity >= threshold and best_similarity - second_similarity >= minimum_margin:
            response = {
                "match": best_match,
                "confidence": round(best_similarity, 3),
                "threshold": threshold,
                "margin": round(best_similarity - second_similarity, 3),
                "expression": expression
            }
        else:
            response = {
                "match": None,
                "best_match_candidate": best_match,
                "confidence": round(best_similarity, 3),
                "threshold": threshold,
                "margin": round(best_similarity - second_similarity, 3),
                "message": "No unique face match found",
                "expression": expression
            }

        self.wfile.write(json.dumps(response).encode('utf-8'))


def run(server_class=http.server.HTTPServer, handler_class=FaceServiceHandler):
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"Python Face Recognition Service running on port {PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    print("Python Face Recognition Service stopped.")


if __name__ == '__main__':
    run()
