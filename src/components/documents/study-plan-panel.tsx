"use client";

import * as React from "react";
import { Loader2, CalendarDays, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Difficulty = "easy" | "medium" | "hard";

interface StudyDay {
  day: number;
  title: string;
  tasks: string[];
}

interface StudyPlan {
  id: string;
  goal: string;
  plan: { days: StudyDay[]; summary: string };
}

export function StudyPlanPanel({ documentId }: { documentId: string }) {
  const [plan, setPlan] = React.useState<StudyPlan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [generating, setGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [goal, setGoal] = React.useState("I have an exam in 7 days and 4 hours available per day.");
  const [availableDays, setAvailableDays] = React.useState(7);
  const [hoursPerDay, setHoursPerDay] = React.useState(2);
  const [difficulty, setDifficulty] = React.useState<Difficulty>("medium");

  React.useEffect(() => {
    (async () => {
      const res = await fetch(`/api/documents/${documentId}/study-plan`);
      const data = await res.json();
      setPlan(Array.isArray(data.studyPlan?.plan?.days) ? data.studyPlan : null);
      setLoading(false);
    })();
  }, [documentId]);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, availableDays, hoursPerDay, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't generate a study plan.");
      if (!Array.isArray(data.studyPlan?.plan?.days)) {
        throw new Error("The study plan came back in an unexpected format. Please try again.");
      }
      setPlan(data.studyPlan);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10 text-foreground-subtle">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (plan) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-foreground-muted">{plan.plan.summary}</p>
        <div className="space-y-3">
          {plan.plan.days.map((d) => (
            <div key={d.day} className="rounded-md border border-border p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">
                Day {d.day}
              </p>
              <p className="mt-0.5 text-sm font-medium">{d.title}</p>
              <ul className="mt-1.5 space-y-1 text-sm text-foreground-muted">
                {(d.tasks ?? []).map((t, i) => (
                  <li key={i}>· {t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Button variant="secondary" size="sm" className="w-full" onClick={() => setPlan(null)}>
          <RotateCcw className="size-3.5" />
          Make a new plan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-foreground-muted">
        <CalendarDays className="size-4" />
        <p className="text-sm">Get a day-by-day plan based on this document.</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <Label htmlFor="goal">Goal</Label>
        <Textarea
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="days">Days available</Label>
          <Input
            id="days"
            type="number"
            min={1}
            max={60}
            value={availableDays}
            onChange={(e) => setAvailableDays(Number(e.target.value))}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="hours">Hours / day</Label>
          <Input
            id="hours"
            type="number"
            min={0.5}
            max={12}
            step={0.5}
            value={hoursPerDay}
            onChange={(e) => setHoursPerDay(Number(e.target.value))}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label>Difficulty</Label>
        <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button className="w-full" onClick={generate} disabled={generating}>
        {generating ? (
          <>
            <Loader2 className="size-3.5 animate-spin" /> Building your plan…
          </>
        ) : (
          "Create study plan"
        )}
      </Button>
    </div>
  );
}
