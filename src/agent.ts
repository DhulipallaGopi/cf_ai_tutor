import { DurableObject } from "cloudflare:workers";

export interface Env {
  AI: Ai;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface State {
  messages: Message[];
  subject: string;
  level: string;
}

const SYSTEM = `You are Lumen, an expert AI tutor. You:
- Explain concepts clearly with real-world analogies
- Adapt to the learner's level (beginner/intermediate/advanced)
- Use the Socratic method — ask guiding questions
- Keep responses to 2-3 focused paragraphs
- Format with markdown: **bold**, bullet points, code blocks
- Are encouraging and patient`;

export class TutorDO extends DurableObject<Env> {
  private state: State = { messages: [], subject: "", level: "intermediate" };
  private loaded = false;

  private async load() {
    if (this.loaded) return;
    const s = await this.ctx.storage.get<State>("s");
    if (s) this.state = s;
    this.loaded = true;
  }

  private async save() {
    await this.ctx.storage.put("s", this.state);
  }

  async fetch(request: Request): Promise<Response> {
    await this.load();

    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, "");
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    };

    // POST /chat
    if (path === "chat" && request.method === "POST") {
      const { message } = await request.json<{ message: string }>();

      // Build context
      let system = SYSTEM;
      if (this.state.subject) {
        system += `\n\nThe learner is studying: ${this.state.subject} (${this.state.level} level).`;
      }

      // Add user message
      this.state.messages.push({ role: "user", content: message });

      // Keep last 20 messages for context window
      const ctx = this.state.messages.slice(-20);

      // Call Llama 3.3
      const result = await this.env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as BaseAiTextGenerationModels,
        {
          messages: [{ role: "system", content: system }, ...ctx],
          max_tokens: 1024,
          temperature: 0.7,
        }
      );

      const reply =
        result && typeof result === "object" && "response" in result
          ? String(result.response)
          : "Sorry, I could not generate a response. Please try again.";

      this.state.messages.push({ role: "assistant", content: reply });
      await this.save();

      return new Response(JSON.stringify({ reply, subject: this.state.subject }), { headers: cors });
    }

    // GET /history
    if (path === "history" && request.method === "GET") {
      return new Response(
        JSON.stringify({ messages: this.state.messages, subject: this.state.subject, level: this.state.level }),
        { headers: cors }
      );
    }

    // POST /subject
    if (path === "subject" && request.method === "POST") {
      const { subject, level } = await request.json<{ subject: string; level: string }>();
      this.state.subject = subject;
      this.state.level = level || "intermediate";
      await this.save();
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    // POST /plan
    if (path === "plan" && request.method === "POST") {
      const plan = await request.json();
      await this.ctx.storage.put("plan", plan);
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    // POST /reset
    if (path === "reset" && request.method === "POST") {
      this.state = { messages: [], subject: "", level: "intermediate" };
      await this.save();
      return new Response(JSON.stringify({ ok: true }), { headers: cors });
    }

    return new Response("Not found", { status: 404 });
  }
}
