# DEVgauge

AI Code Review Assistant (DEVgauge) is a modern full-stack web application designed to accelerate the development lifecycle by providing instant, automated code quality feedback. Rather than waiting hours or days for a senior developer review, engineers can paste or upload JavaScript or Python code to receive a comprehensive, two-stage evaluation: local static analysis (ESLint and Pylint) followed by a deep semantic AI review. The platform automatically calculates cyclomatic complexity, identifies code smells, flags security vulnerabilities, and generates wiki-style technical documentation, all organized in a premium, searchable review history dashboard.

---

## Badges

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=F000B8)
![xAI Grok](https://img.shields.io/badge/xAI_Grok-FF5A00?style=for-the-badge&logo=xai&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)

---

##  Screenshots & Demo

Here are some preview captures of the application in action:

* **Dashboard Overview**
  ![Dashboard Overview](assets/Dashboard.jpeg)
  
* **Code Submission**
  ![Code Submission](assets/upload%20section.jpeg)

* **Static & AI Review Results**
  ![Static & AI Review Results](assets/review.jpeg)

* **Complexity Metrics**
  ![Complexity Metrics](assets/COMPLEXITY.jpeg)

* **Auto-Generated Documentation**
  ![Auto-Generated Documentation](assets/DOCUMENTATION.jpeg)

---

##  About the Project

In typical development environments, code reviews are often a major pipeline bottleneck. Junior devs wait on senior engineers, slowing down iterations and stalling releases. 

**AI Code Review Assistant** solves this by establishing a two-stage review pipeline:
1. **Stage 1 (Local Static Analysis)**: Scans files instantly for syntactical compliance, styling errors, and quick-fix linter issues using ESLint for JavaScript and Pylint for Python.
2. **Stage 2 (Generative AI Audit)**: Feeds the file contents alongside linter findings context to the advanced xAI Grok / Gemini LLMs to spot logic flaws, API misuses, security holes, and structural smells. 

By combining deterministic compiler-like checks with deep semantic reasoning, developers can harden their code before pushing to GitHub.

---

##  Features

- ** Secure JWT Authentication**: Full signup, login, password recovery, and secure session management.
- ** Paste/Upload Submission**: Paste snippets directly or upload source files (`.js`, `.py`).
- ** Two-Stage Review Pipeline**: ESLint (JavaScript) and Pylint (Python) running in isolated subprocesses.
- ** AI-Powered Auditing**: Large Language Model reviews assessing security, naming, efficiency, and bugs.
- ** Metric Instrumentation**: Cyclomatic complexity scoring, function complexity distributions, and LOC counts.
- ** Auto-Generated Documentation**: Standard JSDoc or Python docstrings extracted and organized in a wiki layout.
- ** History & Filters**: Search projects by name with a debounced partial matches query, filter by linter/AI type, and sort chronologically.
- ** Complete Teardown Control**: Project deletion (with name confirmation safety) and individual run exclusions.

---

##  Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js 16 | Tailwind CSS UI dashboard with responsive panel controls |
| **Backend** | Node.js / Express.js | Core REST API controller with structured error middleware |
| **Database** | PostgreSQL | Neon.tech Serverless Postgres instance with Pg_trgm indexes |
| **Auth** | JWT / bcryptjs | Cryptographically signed sessions and password hashing |
| **AI Integration**| xAI Grok / Gemini SDK | Generative context analysis and wiki doc generator |
| **Static Analysis**| ESLint & Pylint | Child process CLI linters parsing code syntax |
| **Deployment** | Vercel & Render | Automated static build pipeline and web service hosting |

---

## Folder Structure

```text
ai-code-review-assistant/
├── backend/
│   ├── index.js                  # Main Express server configuration
│   ├── db.js                     # PostgreSQL connection pooling and init scripts
│   ├── schema.sql                # SQL database DDL tables, constraints, and indexes
│   ├── middleware/
│   │   ├── auth.js               # JWT verification router protection
│   │   ├── validate.js           # express-validator schema rule runner
│   │   ├── errorHandler.js       # Centralized global Express error handler
│   │   └── durationLogger.js     # Request response time logging middleware
│   ├── routes/
│   │   ├── auth.js               # signup, login, reset-password API handlers
│   │   └── projects.js           # projects CRUD, reviews timeline, and audit triggers
│   ├── utils/
│   │   ├── analyzer.js           # ESLint / Pylint execution child processes
│   │   ├── ai.js                 # LLM completions connector
│   │   └── complexity.js         # JavaScript and Python complexity parse helpers
│   ├── tests/
│   │   └── integration.test.js   # Jest & Supertest integration suite
│   └── uploads/                  # Temporary file upload write directories
├── frontend/
│   ├── app/
│   │   ├── layout.tsx            # Global providers (Auth, Error Boundary)
│   │   ├── globals.css           # Styling directives and custom themes
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Main workspace console UI
│   │   ├── login/
│   │   │   └── page.tsx          # User login screen
│   │   └── components/
│   │       ├── ErrorBoundary.tsx # Crash fallback rendering component
│   │       └── ReviewResults.tsx # Inline analysis view console
└── README.md
```

---

##  Getting Started

### Prerequisites
* **Node.js**: `v18.0.0+`
* **npm**: `v9.0.0+`
* **PostgreSQL**: Local install or cloud database (e.g. Neon.tech)
* **Python**: `v3.8+` (Required for running Pylint analyses)

---

### Installation & Local Setup

#### 1. Clone and Navigate
```bash
git clone https://github.com/your-username/ai-code-review-assistant.git
cd ai-code-review-assistant
```

#### 2. Backend Configuration
```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Setup environment variables (create .env from .env.example)
cp .env.example .env
# Edit the .env file with your secrets (see Environment Variables section below)

# Run migrations and start server in development mode
npm run dev
```

#### 3. Frontend Configuration
```bash
# Navigate to frontend (from root directory)
cd ../frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit the .env.local file with your settings (see Environment Variables section below)

# Start Next.js development server
npm run dev
```

The frontend will start on `http://localhost:3000` and proxy requests to the backend server on `http://localhost:5000`.

---

##  Environment Variables

### Backend (`backend/.env`)
| Variable | Example / Description |
| :--- | :--- |
| `PORT` | `5000` - Port the Express backend listens on |
| `DATABASE_URL` | `postgresql://user:pass@host:587/db?sslmode=require` - Postgres link |
| `JWT_SECRET` | `your_cryptographic_secret_hex` - Used to sign JWT keys |
| `XAI_API_KEY` | `xai-grok-api-key-here` - Authentication token for Grok LLM calls |
| `CLIENT_URL` | `http://localhost:3000` - Client CORS origin whitelist |

### Frontend (`frontend/.env.local`)
| Variable | Example / Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL`| `http://localhost:5000` - Base URL targeting the backend endpoints |

---

## 📡 API Reference

### User Authentication (`/api/auth`)
* `POST /api/auth/register` - Create new user account.
* `POST /api/auth/login` - Authenticate credentials and return JWT token.
* `POST /api/auth/forgot-password` - Request a password reset email token.
* `POST /api/auth/reset-password` - Reset user password using token.

### Project Directory (`/api/projects`)
* `GET /api/projects` *(Protected)* - List all projects for logged-in user (Supports `page`, `limit`, `search`, and `sort` query filters).
* `POST /api/projects` *(Protected)* - Paste/upload code content to create a new project folder.
* `GET /api/projects/:id` *(Protected)* - Retrieve source code content.
* `DELETE /api/projects/:id` *(Protected)* - Delete project, clean files, and cascade-remove reviews.

### Review Pipeline (`/api/projects/:id/...`)
* `POST /api/projects/:id/analyze` *(Protected)* - Trigger ESLint/Pylint static check.
* `POST /api/projects/:id/ai-review` *(Protected)* - Trigger semantic LLM review (Rate limited: max 10 requests / 15 mins).
* `POST /api/projects/:id/complexity` *(Protected)* - Run cyclomatic metrics parse.
* `POST /api/projects/:id/documentation` *(Protected)* - Extract classes/functions and generate inline docstrings (Rate limited: max 10 requests / 15 mins).
* `GET /api/projects/:id/reviews` *(Protected)* - Fetch project review logs history.
* `DELETE /api/reviews/:review_id` *(Protected)* - Exclude a specific review run.

---

##  Deployment

### Backend (Render)
1. Sign in to [Render](https://render.com) and create a new **Web Service**.
2. Connect your GitHub repository.
3. Set the **Build Command** to `npm install`.
4. Set the **Start Command** to `node index.js` (inside backend directory).
5. Input all variables in the **Environment** tab matching `backend/.env`.

### Frontend (Vercel)
1. Sign in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Connect your repository and select the `frontend` folder as the root.
3. Select **Next.js** as the framework preset.
4. Input `NEXT_PUBLIC_API_URL` pointing to your deployed Render URL under **Environment Variables**.
5. Click **Deploy**.

---

## 🔮 Future Improvements

- [ ] **Multi-language support**: Add Rust, Go, C++, and Java static rulesets.
- [ ] **GitHub OAuth & Pull Request Integration**: Automatically comment review findings on PR diff lines.
- [ ] **Real-Time Collaboration**: Live team reviews and inline chat systems.
- [ ] **Code Quality Scoring**: Dynamic grading metrics (e.g. A to F grades) over time.
- [ ] **Dark / Light theme toggle**: Native support for customizable color palette modes.
- [ ] **CI/CD Integrations**: Publish GitHub actions wrapping CLI analysis tools.
- [ ] **Docker Containers**: Standardize multi-container development using `docker-compose`.

---

## 👨‍💻 Author

Built by **[Antra Sharma]**. 

This application was developed as an internship project demonstrating full-stack engineering, AI API orchestration, static code analysis toolchain configuration, and robust PostgreSQL database design.
