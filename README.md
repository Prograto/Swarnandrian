# 🎓 Swarnandrian — Enterprise Student Training & Evaluation Platform

A production-grade college platform for coding practice, aptitude tests, technical assessments, and competitions.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Nginx (Port 80)                     │
│              Reverse Proxy + Rate Limiting              │
└──────────┬────────────────────────┬────────────────────-┘
           │                        │
    ┌──────▼──────┐         ┌───────▼──────┐
    │  React SPA  │         │  FastAPI     │
    │  (Port 3000)│         │  (Port 8000) │
    └─────────────┘         └──────┬───────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
       ┌──────▼─────┐    ┌────────▼────────┐  ┌───────▼────────┐
       │ MongoDB    │    │ Redis           │  │ Code Runner    │
       │ Atlas      │    │ (WebSocket      │  │ (Port 8001)    │
       │            │    │  + Cache)       │  │ Docker Sandbox │
       └────────────┘    └─────────────────┘  └────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- MongoDB Atlas account (free tier works)

### 1. Clone & Configure
```bash
git clone <repo>
cd swarnandrian
cp .env.example .env
# Edit .env with your MongoDB Atlas URL and secrets
```

### 2. Start All Services
```bash
docker-compose up --build
```

### 3. Access
| Service    | URL                        |
|------------|----------------------------|
| Frontend   | http://localhost:3000      |
| API Docs   | http://localhost:8000/api/docs |
| Code Runner| http://localhost:8001      |

---

## 👥 User Roles

| Role    | Login Field  | Dashboard URL    |
|---------|-------------|-----------------|
| Admin   | Admin ID    | /admin           |
| Faculty | Faculty ID  | /faculty         |
| Student | Student ID  | /student         |

### Default Test Credentials (after bulk upload)
- Password for bulk-uploaded users: `Welcome@123`

---

## 📁 Project Structure

```
swarnandrian/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/v1/endpoints/  # All REST endpoints
│   │   │   ├── auth.py         # Login / Register
│   │   │   ├── admin.py        # User management, bulk upload
│   │   │   ├── faculty.py      # Faculty routes
│   │   │   ├── students.py     # Student list
│   │   │   ├── coding.py       # Sections & problems
│   │   │   ├── aptitude.py     # Aptitude Q&A + tests
│   │   │   ├── technical.py    # Technical Q&A + tests
│   │   │   ├── competitions.py # Competition CRUD
│   │   │   ├── submissions.py  # Code + aptitude submissions
│   │   │   ├── leaderboard.py  # Rankings
│   │   │   ├── profile.py      # Student profile & portfolio
│   │   │   └── websockets.py   # Real-time WS
│   │   ├── core/
│   │   │   ├── config.py       # Settings (pydantic)
│   │   │   ├── security.py     # JWT + RBAC
│   │   │   └── websocket_manager.py
│   │   ├── db/
│   │   │   └── mongodb.py      # Connection + indexes
│   │   └── models/
│   │       └── schemas.py      # All Pydantic models
│   └── Dockerfile
│
├── frontend/                   # React frontend
│   └── src/
│       ├── pages/
│       │   ├── LandingPage.jsx
│       │   ├── auth/            # Login, Register
│       │   ├── admin/           # Dashboard, Users, Bulk Upload, Analytics
│       │   ├── faculty/         # Dashboard, Coding, Aptitude, Technical, Competitions, Evaluation
│       │   ├── student/         # Dashboard, Coding, Aptitude, Technical, Competitions, Leaderboard, Profile
│       │   ├── coding/          # Monaco Code Editor
│       │   └── test/            # Anti-cheat Test Interface
│       ├── components/
│       │   └── common/          # DashboardLayout, ProtectedRoute
│       ├── store/               # Zustand auth store
│       └── utils/               # Axios API client
│
├── code-runner/                # Code execution microservice
│   └── src/main.py            # Docker sandbox executor
│
├── nginx/nginx.conf           # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

---

## 🔌 Key API Endpoints

### Authentication
```
POST /api/v1/auth/login              → JWT login (all roles)
POST /api/v1/auth/register/student   → Student self-register
POST /api/v1/auth/register/faculty   → Faculty (admin only)
POST /api/v1/auth/register/admin     → Admin registration
```

### Admin
```
GET    /api/v1/admin/analytics                    → Platform stats
GET    /api/v1/admin/users?role=student           → List users
PATCH  /api/v1/admin/users/{role}/{id}/toggle     → Enable/disable
PATCH  /api/v1/admin/users/{role}/{id}/reset-password
DELETE /api/v1/admin/users/{role}/{id}
POST   /api/v1/admin/bulk-upload/{role}           → Excel upload
GET    /api/v1/admin/bulk-upload/{role}/template  → Download template
```

### Coding
```
POST   /api/v1/coding/sections         → Create section (faculty)
GET    /api/v1/coding/sections         → List sections
POST   /api/v1/coding/problems         → Create problem (faculty)
GET    /api/v1/coding/problems         → List problems
GET    /api/v1/coding/problems/{id}    → Get problem
POST   /api/v1/submissions/code        → Submit/run code
GET    /api/v1/submissions/code/history
```

### Aptitude / Technical
```
POST/GET /api/v1/aptitude/sections
POST/GET /api/v1/aptitude/questions
POST     /api/v1/aptitude/questions/bulk-upload
POST/GET /api/v1/aptitude/tests
GET      /api/v1/aptitude/tests/{id}   → With questions
POST     /api/v1/submissions/aptitude  → Submit aptitude test
```

### Competitions
```
POST   /api/v1/competitions/           → Create (faculty)
GET    /api/v1/competitions/           → List
POST   /api/v1/competitions/{id}/join  → Join with access code
POST   /api/v1/competitions/{id}/tests → Add tests
GET    /api/v1/competitions/{id}/leaderboard
```

### Profile & Leaderboard
```
GET    /api/v1/profile/me              → My profile
PUT    /api/v1/profile/me              → Update profile
GET    /api/v1/profile/public/{id}     → Public portfolio
GET    /api/v1/leaderboard/            → Rankings (filterable)
```

### WebSocket
```
WS /api/v1/ws/leaderboard             → Real-time leaderboard
WS /api/v1/ws/competition/{id}        → Competition updates
```

---

## 🔒 Security Features

| Feature                    | Implementation                              |
|----------------------------|---------------------------------------------|
| JWT Authentication         | python-jose, bcrypt password hashing        |
| Role-Based Access Control  | Dependency injection (`require_admin`, etc.)|
| Code Sandbox               | Docker containers with no network access    |
| CPU/Memory Limits          | Docker cgroup limits                        |
| Execution Timeout          | Container kill after N seconds              |
| Rate Limiting              | Nginx `limit_req` zone (30 req/s)           |
| Fullscreen Enforcement     | Fullscreen API + `fullscreenchange` event   |
| Tab Switch Detection       | `visibilitychange` event, 3-strike rule     |
| Copy/Paste Disabled        | `contextmenu` + `copy` event prevention    |
| Input Validation           | Pydantic v2 strict models                  |

---

## 🐳 Docker Sandbox

Each code submission runs in an isolated Docker container:

```
Language  → Docker Image         → Limits
Python    → python:3.11-alpine   → 256MB RAM, 0.5 CPU, 10s timeout
C++       → gcc:13-alpine        → 256MB RAM, 0.5 CPU, 10s timeout
Java      → openjdk:21-alpine    → 256MB RAM, 0.5 CPU, 10s timeout
JS        → node:20-alpine       → 256MB RAM, 0.5 CPU, 10s timeout
C         → gcc:13-alpine        → 256MB RAM, 0.5 CPU, 10s timeout
```

Security controls:
- `network_disabled=True` — No internet inside containers
- CPU quota via `cpu_period`/`cpu_quota`
- Memory hard limit via `mem_limit`
- Container auto-removed after execution
- Isolated `/tmp/sandbox/{uuid}` workspace per submission

---

## 📊 MongoDB Collections

| Collection             | Purpose                           |
|------------------------|-----------------------------------|
| admins                 | Admin accounts                    |
| faculty                | Faculty accounts                  |
| students               | Student accounts + stats          |
| coding_sections        | Coding problem sections           |
| coding_problems        | Problems with private test cases  |
| code_submissions       | Submission results                |
| apt_sections           | Aptitude/Technical sections       |
| apt_questions          | Questions (MCQ/MSQ/NAT/Fill)      |
| apt_submissions        | Aptitude submission results       |
| tests                  | Test definitions                  |
| competitions           | Competition records               |
| competition_tests      | Tests within competitions         |
| competition_participants | Joined students               |
| competition_submissions | Competition answers             |
| leaderboard            | Score aggregations                |

---

## 🔄 Real-Time Architecture

```
Student submits → FastAPI processes → WebSocket broadcast
                                   ↓
                     ws_manager.broadcast("leaderboard", {...})
                                   ↓
                     All connected clients receive update
                                   ↓
                     React refetches leaderboard data
```

---

## 📈 Scaling Strategy

For production at scale:
1. **Backend**: Run multiple FastAPI instances behind Nginx (horizontal scaling)
2. **WebSockets**: Use Redis pub/sub for multi-instance WebSocket coordination
3. **Code Runner**: Separate cluster of code execution nodes
4. **MongoDB**: Atlas auto-scaling, read replicas for analytics queries
5. **Redis**: Redis Cluster for horizontal cache/session scaling

---

## 🛣 Development Roadmap

### Phase 1 — Core (Weeks 1–4)
- [x] Authentication system (JWT + RBAC)
- [x] Admin dashboard + bulk upload
- [x] Coding sections & problems
- [x] Monaco Editor integration

### Phase 2 — Evaluation (Weeks 5–7)
- [x] Docker sandbox code execution
- [x] Private test cases evaluation
- [x] Aptitude/Technical Q&A system
- [x] Test interface with anti-cheat

### Phase 3 — Competitions (Weeks 8–9)
- [x] Competition CRUD
- [x] Real-time leaderboard (WebSocket)
- [x] Access code system

### Phase 4 — Portfolio & Polish (Weeks 10–11)
- [x] Student profile system
- [x] Public portfolio page
- [x] Faculty evaluation analytics
- [x] Responsive UI polish

### Phase 5 — Production (Week 12)
- [ ] SSL/TLS configuration
- [ ] MongoDB Atlas production tier
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Monitoring (Prometheus + Grafana)

---

## 📦 Excel Template Columns

### Student Upload Template
`name | course | year | department | student_id | password`

### Faculty Upload Template
`name | designation | department | contact_number | email | faculty_id | password`

### Admin Upload Template
`name | designation | department | contact_number | email | admin_id | password`

### Aptitude Question Upload Template
`question_type | question_text | options | correct_options | correct_answer | explanation | marks | negative_marks | difficulty | image_url`

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch
3. Follow the existing code style
4. Submit a PR with description

---

## 📄 License

MIT License — Free to use for educational institutions.
