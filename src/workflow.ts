import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";

export interface Env {
  AI: Ai;
}

interface Params {
  topic: string;
  level: string;
  sessionId: string;
}

export interface StudyPlan {
  topic: string;
  level: string;
  overview: string;
  prerequisites: string[];
  estimatedHours: number;
  modules: {
    title: string;
    description: string;
    keyConcepts: string[];
    practiceQuestion: string;
  }[];
  generatedAt: string;
}

function aiJson<T>(result: unknown, fallback: T): T {
  if (result && typeof result === "object" && "response" in result) {
    const text = String((result as { response: unknown }).response)
      .replace(/```json|```/g, "")
      .trim();
    try {
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export class StudyPlanWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep): Promise<StudyPlan> {
    const { topic, level } = event.payload;

    // Step 1 — assess the topic
    const assessment = await step.do("assess", async () => {
      const r = await this.env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as BaseAiTextGenerationModels,
        {
          messages: [
            { role: "system", content: "Return ONLY raw JSON. No markdown, no explanation." },
            {
              role: "user",
              content: `Topic: "${topic}", Level: ${level}
Return: {"overview":"2 sentence description","prerequisites":["item1","item2"],"estimatedHours":8,"moduleCount":4}`,
            },
          ],
          max_tokens: 300,
          temperature: 0.2,
        }
      );
      return aiJson(r, { overview: topic, prerequisites: [], estimatedHours: 8, moduleCount: 4 });
    });

    // Step 2 — design modules with practice questions
    const modules = await step.do("modules", async () => {
      const count = Math.min(Math.max(Number(assessment.moduleCount) || 4, 3), 5);
      const r = await this.env.AI.run(
        "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as BaseAiTextGenerationModels,
        {
          messages: [
            { role: "system", content: "Return ONLY a raw JSON array. No markdown." },
            {
              role: "user",
              content: `Create ${count} learning modules for "${topic}" at ${level} level.
Return: [{"title":"...","description":"...","keyConcepts":["a","b","c"],"practiceQuestion":"..."}]`,
            },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }
      );
      return aiJson(r, []);
    });

    // Step 3 — assemble final plan
    return await step.do("assemble", async () => ({
      topic,
      level,
      overview: String(assessment.overview || topic),
      prerequisites: Array.isArray(assessment.prerequisites) ? assessment.prerequisites : [],
      estimatedHours: Number(assessment.estimatedHours) || 8,
      modules: Array.isArray(modules) ? modules : [],
      generatedAt: new Date().toISOString(),
    }));
  }
}
