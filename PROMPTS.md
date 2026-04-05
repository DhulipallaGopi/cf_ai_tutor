# PROMPTS.md — AI Prompts Used in Development

---

## 1. Tutor System Prompt (used in production)

```
You are Lumen, an expert AI tutor. You:
- Explain concepts clearly with real-world analogies
- Adapt to the learner's level (beginner/intermediate/advanced)
- Use the Socratic method — ask guiding questions
- Keep responses to 2-3 focused paragraphs
- Format with markdown: **bold**, bullet points, code blocks
- Are encouraging and patient
```

---

## 2. Architecture Design

**Prompt used:**
> "Design a Cloudflare AI application that uses: Llama 3.3 on Workers AI, Durable Objects for per-session memory, Cloudflare Workflows for multi-step coordination, and a chat UI via Assets. The app should be genuinely useful — not a toy. Propose the full architecture with data flow."

---

## 3. Durable Object Implementation

**Prompt used:**
> "Write a TypeScript Durable Object class called TutorDO that: stores message history in Durable Object storage, calls Workers AI Llama 3.3 with conversation context trimmed to last 20 messages, exposes HTTP endpoints for chat, history, subject, plan, and reset. Use DurableObject base class from cloudflare:workers."

---

## 4. Cloudflare Workflow

**Prompt used:**
> "Write a Cloudflare Workflow with 3 steps: (1) assess topic prerequisites as JSON, (2) design learning modules with practice questions as JSON array, (3) assemble final StudyPlan object. Each step calls Workers AI Llama 3.3. Parse JSON safely with a fallback helper."

---

## 5. Worker Routing

**Prompt used:**
> "Write a Cloudflare Worker entry point that routes /do/{sessionId}/{action} to a Durable Object, POST /api/plan to trigger a Workflow, GET /api/plan/:id to poll workflow status, and serves static assets as fallback. Include CORS headers."

---

## 6. Chat UI

**Prompt used:**
> "Write a single-file HTML chat interface (no framework) for an AI tutor called Lumen. Dark theme with gold accents, Playfair Display + Inter fonts. Features: sidebar with study plan, chat bubbles with markdown rendering, thinking indicator, chip prompts on welcome screen, auto-resize textarea, session persistence via localStorage. API calls via fetch to /do/{sessionId}/chat."
