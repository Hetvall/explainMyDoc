import { getDocumentContext } from "./context";
import { safeGenerateObject } from "./generate-object";
import { studyPlanSchema, type GeneratedStudyPlan } from "./schemas";

const SYSTEM_PROMPT = `You create short, practical day-by-day study plans for one document, based on a
goal, a number of available days, hours available per day, and a target difficulty.

Rules:
- Keep it practical and specific to the document's actual structure/content — reference real sections or themes, not generic advice.
- Spread work realistically across the available days and hours; don't cram everything into day one.
- Include a mix of reading, active recall (flashcards/quiz), and review days when there are 3+ days available.
- Keep each day to 2-4 concrete tasks.`;

export async function generateStudyPlan(
  documentId: string,
  goal: string,
  availableDays: number,
  hoursPerDay: number,
  difficulty: "easy" | "medium" | "hard",
): Promise<GeneratedStudyPlan> {
  const { title, text, truncated } = await getDocumentContext(documentId);

  const result = await safeGenerateObject({
    schema: studyPlanSchema,
    system: SYSTEM_PROMPT,
    prompt: `Document title: ${title}
${truncated ? "(Note: truncated for length.)\n" : ""}
Document content:
"""
${text}
"""

Goal: ${goal}
Available days: ${availableDays}
Hours available per day: ${hoursPerDay}
Target difficulty: ${difficulty}

Create a day-by-day plan (one entry per day, "day" numbered from 1 to ${availableDays}) to reach this goal using this specific document.`,
  });

  return result;
}
