# cf_ai_tutor 

> An AI-powered adaptive tutor built entirely on Cloudflare — using Llama 3.3 (Workers AI), Durable Objects for persistent memory, Cloudflare Workflows for multi-step study plan generation, and a chat UI served via Cloudflare Assets.

**Live Demo:** https://cf-ai-tutor.gopichandudhulipalla.workers.dev

---

## Assignment Requirements

| Requirement | Implementation |
|---|---|
| **LLM** | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` via Workers AI |
| **Workflow / coordination** | `StudyPlanWorkflow` — 3-step Cloudflare Workflow with auto-retry |
| **User input via chat** | Chat UI (Cloudflare Assets) with fetch-based messaging |
| **Memory / state** | `TutorDO` Durable Object — persists full conversation history across sessions |

---

## Architecture

```
Browser (public/index.html — Cloudflare Assets)
        │
        │  POST /do/{sessionId}/chat
        │  GET  /do/{sessionId}/history
        ▼
Cloudflare Worker (src/index.ts)
        │
        ├──► TutorDO (Durable Object)          ← memory + AI calls
        │      • Stores conversation history
        │      • Calls Llama 3.3 (Workers AI)
        │      • Persists subject + study plan
        │
        └──► StudyPlanWorkflow                  ← multi-step coordination
               Step 1: Assess topic
               Step 2: Design modules + questions
               Step 3: Assemble final plan
```

---

## Features

- **AI Tutoring** — Llama 3.3 teaches using the Socratic method, adapts to learner level
- **Persistent Memory** — full conversation history survives page refreshes (Durable Object storage)
- **Study Plan Generator** — Cloudflare Workflow creates a personalized multi-module study plan
- **Session Management** — each user gets an isolated Durable Object instance via UUID
- **No external API keys** — everything runs on Cloudflare (Workers AI is free tier)

---

## Running Locally

### Prerequisites
- Node.js 18+
- Cloudflare account (free)
- Wrangler CLI

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/cf_ai_tutor.git
cd cf_ai_tutor

# 2. Install
npm install

# 3. Login to Cloudflare
npx wrangler login

# 4. Deploy
npm run deploy
```

Open the deployed URL — done. No `.env` file, no API keys needed.

> Note: Workers AI requires a real Cloudflare account. Use `npm run deploy` rather than `npm run dev` for full functionality.

---

## Project Structure

```
cf_ai_tutor/
├── src/
│   ├── index.ts      ← Worker: routing, API endpoints
│   ├── agent.ts      ← TutorDO: Durable Object with memory + AI
│   └── workflow.ts   ← StudyPlanWorkflow: 3-step Cloudflare Workflow
├── public/
│   └── index.html    ← Chat UI (no framework, plain JS)
├── wrangler.toml
├── package.json
├── README.md
└── PROMPTS.md
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/do/:sid/chat` | Send message, get AI reply |
| `GET` | `/do/:sid/history` | Get conversation history |
| `POST` | `/do/:sid/subject` | Set learning subject |
| `POST` | `/do/:sid/reset` | Clear session |
| `POST` | `/api/plan` | Trigger study plan Workflow |
| `GET` | `/api/plan/:id` | Poll Workflow status |
