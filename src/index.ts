import { TutorDO } from "./agent";
import { StudyPlanWorkflow } from "./workflow";

export { TutorDO, StudyPlanWorkflow };

export interface Env {
  AI: Ai;
  TUTOR_DO: DurableObjectNamespace;
  STUDY_PLAN_WF: Workflow;
  ASSETS: Fetcher;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);

    // ── /do/{sessionId}/{action} → Durable Object ──────────────────────
    // e.g. /do/abc123/chat  /do/abc123/history
    if (url.pathname.startsWith("/do/")) {
      const parts = url.pathname.split("/").filter(Boolean);
      // parts = ["do", sessionId, action]
      const sessionId = parts[1];
      const action = parts[2] || "";

      if (!sessionId) return err("Missing sessionId");

      const id = env.TUTOR_DO.idFromName(sessionId);
      const stub = env.TUTOR_DO.get(id);

      // Forward to Durable Object with just the action as path
      const doReq = new Request(`https://do/${action}`, {
        method: request.method,
        headers: { "Content-Type": "application/json" },
        body: request.method === "POST" ? await request.text() : undefined,
      });

      const res = await stub.fetch(doReq);
      const body = await res.text();

      return new Response(body, {
        status: res.status,
        headers: { "Content-Type": "application/json", ...CORS },
      });
    }

    // ── POST /api/plan → trigger Workflow ──────────────────────────────
    if (url.pathname === "/api/plan" && request.method === "POST") {
      const { topic, level, sessionId } = await request.json<{
        topic: string;
        level: string;
        sessionId: string;
      }>();
      if (!topic) return err("topic required");

      const instance = await env.STUDY_PLAN_WF.create({
        params: { topic, level: level || "intermediate", sessionId },
      });
      return ok({ workflowId: instance.id });
    }

    // ── GET /api/plan/:id → poll Workflow ──────────────────────────────
    const wfMatch = url.pathname.match(/^\/api\/plan\/(.+)$/);
    if (wfMatch && request.method === "GET") {
      const instance = await env.STUDY_PLAN_WF.get(wfMatch[1]);
      const status = await instance.status();
      return ok({ status: status.status, output: status.output ?? null });
    }

    // ── Static assets ──────────────────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};

function ok(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function err(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
