# Campus ERP - College Admission & Student Lifecycle Management System

A full-stack institutional web portal for engineering colleges and universities to manage the end-to-end student lifecycle — from CET/lateral admission, document verification, and fee accounting to biometric face authentication, academic progression, and department governance.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features & Role Portals](#-key-features--role-portals)
  - [1. Student Portal](#1-student-portal)
  - [2. Admission & Office Staff Portal](#2-admission--office-staff-portal)
  - [3. Head of Department (HOD) Portal](#3-head-of-department-hod-portal)
  - [4. Principal / Admin Dashboard](#4-principal--admin-dashboard)
- [Default Login Credentials](#-default-login-credentials)
- [Biometric Face Recognition Service](#-biometric-face-recognition-service)
- [Technology Stack](#-technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Configuration (.env)](#-configuration-env)
- [Running the Application](#-running-the-application)
- [Database Seeding](#-database-seeding)
- [Testing](#-testing)
- [Production Build](#-production-build)

---

## 🚀 Overview

Managing higher education admissions and multi-year student lifecycles involves coordinating several stakeholders: candidates submitting applications, office staff verifying documents and allocating quotas, accounts personnel handling multi-head fee structures, HODs overseeing department rosters, and college administrators monitoring overall performance.

This system provides a unified, secure platform with dedicated role-based portals, automated fee accounting, biometric face recognition for student identification, and automated academic year promotion tracking.

---

## 👥 Key Features & Role Portals

### 1. Student Portal
- **Self-Service Dashboard**: Access personal details, current semester, academic batch, and enrollment status.
- **Fee Overview & History**: Breakdown of total, paid, and pending fee amounts with receipt downloads.
- **Biometric Face Registration**: Live camera capture to register and update facial identification data.
- **Profile Edit Requests**: Submit corrections for personal and contact details for HOD review.

### 2. Admission & Office Staff Portal
- **Admission Verification**: Verify incoming student applications, validate KCET ranks/numbers, and approve admissions.
- **Category & Quota Tracking**: Real-time distribution counts across categories (General, SC, ST, OBC, Rural, Kannada Medium).
- **Student Management**: Filterable directory across departments, study years (1st to 4th year), sections, and academic statuses.
- **Fee Accounting & Receipts**: Manage account-wise allocations (Tuition, College, Exam, Laboratory fees) and generate printable PDF receipts.
- **Lateral Entry Management**: Dedicated workflow for diploma-to-degree admissions entering directly in Year 2 / Semester 3.
- **Biometric Desk**: Scan and authenticate student faces in real time using webcam or registered embeddings.
- **Lifecycle & Promotion**: Review semester-wise progression, promote eligible cohorts, and record backlogs.
- **Export & Reports**: Export student rosters, fee statuses, and category metrics to Excel (`.xlsx`) and PDF.

### 3. Head of Department (HOD) Portal
- **Department Roster**: Monitor enrolled students categorized by semester and section.
- **Change Request Approvals**: Approve or decline profile modification requests submitted by students.
- **Department Metrics**: Summary cards for total students, attendance trends, and verification backlogs.

### 4. Principal / Admin Dashboard
- **Institutional Overview**: High-level visual dashboards with branch-wise enrollment counts and fee collection totals.
- **User & Staff Management**: Add and manage HOD accounts, office administrators, and faculty credentials.
- **Audit & Activity Logs**: Track authentication attempts, system events, and admission progress.

---

## 🔑 Default Login Credentials

The system provides seeded accounts for each role:

| Role | Username / Identifier | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Principal** | `admin` | `principal@gecm.edu` | `admin123` | Institutional dashboard & admin controls |
| **System Admin** | `system_admin` | `admin@gecm.edu` | `admin123` | User management & configuration |
| **Office Staff** | `office_admin` | `office@gecm.edu` | `office123` | Admission verification, fees & biometrics |
| **HOD (CSE)** | `hod_cse` | `hod_cse@gecm.edu` | `hod123` | CSE Department (Branch: `CSE`) |
| **HOD (ECE)** | `hod_ece` | `hod_ece@gecm.edu` | `hod123` | ECE Department (Branch: `ECE`) |
| **HOD (Mechanical)** | `hod_me` | `hod_me@gecm.edu` | `hod123` | Mechanical Department (Branch: `ME`) |
| **HOD (Civil)** | `hod_civil` | `hod_civil@gecm.edu` | `hod123` | Civil Department (Branch: `Civil`) |
| **Test Student** | `CET2026` | `student@gecm.edu` | `student123` | Single pre-configured test student |
| **Demo Students** | `DEMO65-001` .. `DEMO65-065` | `demo.student.001@example.com` | `Student@123` | 65 seeded students across branches & years |

> **New Student Admissions**: Students admitted through the online Admission Portal sign in using their assigned **Student ID** (or CET Number) and the password set during Step 5 (Security Auth).

---

## 📷 Biometric Face Recognition Service

The project includes an integrated face recognition service located in `server/face_service.py`:
- **Dual Pipeline**: Uses DeepFace/FaceNet embeddings (512-dimensional vector) when dependencies are installed, with an intelligent synthetic virtual embedding model fallback for local development without heavy GPU/native dependencies.
- **Matching Algorithm**: Cosine similarity calculation with customizable threshold checks for rapid student identification.
- **Auto-Supervised by Dev Server**: The development runner (`server/dev-server.js`) automatically detects the Python environment and starts the microservice on background port `5001`.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, Lucide React, React Router DOM v7 |
| **Backend API** | Node.js, Express.js, JSON Web Tokens (JWT), bcrypt |
| **Database** | MongoDB with Mongoose (19 modular domain schemas) |
| **AI / Biometrics** | Python 3, OpenCV, DeepFace, NumPy |
| **Utilities** | jsPDF, jsPDF-AutoTable, XLSX, Nodemailer, Axios |
| **Testing** | Node.js native test runner (`node --test`), Python unittest |

---

## 📁 Project Directory Structure

```text
My_project/
├── public/                       # Static assets and institutional imagery
├── server/                       # Node.js backend & Python biometric microservice
│   ├── models/                   # Mongoose schemas (Student, FeePayment, User, etc.)
│   ├── .env.example              # Template environment variables
│   ├── db.js                     # MongoDB connection pool setup
│   ├── dev-server.js             # Unified runner for Vite, API, and Python microservice
│   ├── face_service.py           # Biometric face matching microservice
│   ├── index.js                  # Express API server routes & controllers
│   ├── lifecycleService.js       # Academic year promotion & lifecycle transition engine
│   ├── package.json              # Server dependencies
│   ├── requirements.txt          # Python dependencies (opencv, deepface, numpy)
│   └── test_virtual_face_model.py# Unit tests for face recognition engine
├── src/                          # React frontend application
│   ├── assets/                   # Images, illustrations, and SVG icons
│   ├── components/               # Reusable UI components (Buttons, Inputs, Modals, Theme)
│   ├── data/                     # Seed metadata and category tables
│   ├── pages/                    # Application views by role
│   │   ├── admission/            # Multi-step candidate admission portal
│   │   ├── dashboard/            # Admin management views & analytics
│   │   ├── hod/                  # Head of Department portal views
│   │   ├── office/               # Admission office, fees, lifecycle, and biometrics
│   │   └── student/              # Student dashboard & self-service
│   ├── utils/                    # Client helpers & business logic (CET validation, fee calculations)
│   ├── App.jsx                   # Application router & layout orchestration
│   ├── index.css                 # Global styles & Tailwind entry
│   └── main.jsx                  # React DOM mount
├── seedDemoStudents.cjs          # Script to generate mock student records for testing
├── eslint.config.js              # ESLint configuration
├── index.html                    # Single-page application root
├── package.json                  # Root npm scripts and frontend dependencies
├── render.yaml                   # Cloud deployment manifest
└── vite.config.js                # Vite build and proxy configuration
```

---

## ⚙️ Prerequisites

Before running the project locally, ensure you have:
1. **Node.js** (v18.x or higher) & **npm**
2. **MongoDB** installed and running locally on port `27017` (or a MongoDB Atlas connection string)
3. **Python 3.10+** (optional, recommended for face recognition microservice)

---

## 🔧 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd "My_project"
   ```

2. **Install Frontend and Server Dependencies**:
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend server dependencies
   cd server
   npm install
   cd ..
   ```

3. **Install Python Biometric Dependencies** *(Optional)*:
   ```bash
   cd server
   pip install -r requirements.txt
   cd ..
   ```

---

## 🔐 Configuration (.env)

Create a `.env` file inside the `server/` directory:

```bash
cp server/.env.example server/.env
```

Ensure the values match your local environment:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/major
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=1d

# Optional: Email service for OTP & notifications
RESEND_API_KEY=
EMAIL_FROM=
GMAIL_USER=
GMAIL_PASS=
```

---

## 🏃 Running the Application

### One-Command Unified Dev Mode
To launch the Vite frontend, Express backend, and Python face service concurrently:
```bash
npm run dev
```
- **Local Browser**: `http://localhost:5173`
- **Mobile / Local Network**: `http://<YOUR-IP>:5173` (e.g. `http://10.247.126.139:5173`)
- **Backend API**: `http://localhost:5000` (proxied via Vite `/api`)
- **Face Service**: `http://localhost:5001` (if Python is available)

### Running Services Separately

- **Frontend only**:
  ```bash
  npx vite
  ```

- **Backend API only**:
  ```bash
  node server/index.js
  ```

- **Face Microservice only**:
  ```bash
  python server/face_service.py
  ```

---

## 🌱 Database Seeding

To populate the database with 65 realistic demo student records across engineering departments (CSE, ECE, EEE, Civil, Mechanical) and study years (1st through 4th year):

```bash
npm run seed:demo-students
```

This generates:
- Active student profiles with valid enrollment IDs (`DEMO65-001` to `DEMO65-065`).
- Default student credentials: Password `Student@123`.

---

## 🧪 Testing

Run frontend utility unit tests (CET validation, fee calculations, biometric fallback):
```bash
npm test
```

Run Python face recognition microservice tests:
```bash
npm run test:face
```

---

## 📦 Production Build

To build the frontend bundle for production deployment:
```bash
npm run build
```
Optimized static files will be emitted to `dist/`.

To test the production build locally:
```bash
npm run preview
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).


Intelligence plus charecter is the goal of true education 
- Martin luther king jr