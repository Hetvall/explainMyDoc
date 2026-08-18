"use client";

import {
  Sparkles,
  MessageSquareText,
  GraduationCap,
  Layers,
  CalendarDays,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryPanel } from "./summary-panel";
import { ChatPanel } from "./chat-panel";
import { QuizPanel } from "./quiz-panel";
import { FlashcardsPanel } from "./flashcards-panel";
import { StudyPlanPanel } from "./study-plan-panel";

export function AiPanel({ documentId }: { documentId: string }) {
  return (
    <Tabs defaultValue="summary" className="flex h-full min-h-0 flex-col">
      <TabsList className="grid h-auto w-full flex-none grid-cols-5 gap-0.5">
        <TabsTrigger
          value="summary"
          className="h-auto flex-col gap-1 px-1 py-1.5 text-xs"
        >
          <Sparkles className="size-3.5" />
          Summary
        </TabsTrigger>
        <TabsTrigger
          value="chat"
          className="h-auto flex-col gap-1 px-1 py-1.5 text-xs"
        >
          <MessageSquareText className="size-3.5" />
          Chat
        </TabsTrigger>
        <TabsTrigger
          value="quiz"
          className="h-auto flex-col gap-1 px-1 py-1.5 text-xs"
        >
          <GraduationCap className="size-3.5" />
          Quiz
        </TabsTrigger>
        <TabsTrigger
          value="flashcards"
          className="h-auto flex-col gap-1 px-1 py-1.5 text-xs"
        >
          <Layers className="size-3.5" />
          Cards
        </TabsTrigger>
        <TabsTrigger
          value="study"
          className="h-auto flex-col gap-1 px-1 py-1.5 text-xs"
        >
          <CalendarDays className="size-3.5" />
          Plan
        </TabsTrigger>
      </TabsList>

      <div className="scrollbar-thin flex-1 min-h-0 overflow-y-auto overscroll-contain pt-1">
        <TabsContent value="summary">
          <SummaryPanel documentId={documentId} />
        </TabsContent>
        <TabsContent value="chat">
          <ChatPanel documentId={documentId} />
        </TabsContent>
        <TabsContent value="quiz">
          <QuizPanel documentId={documentId} />
        </TabsContent>
        <TabsContent value="flashcards">
          <FlashcardsPanel documentId={documentId} />
        </TabsContent>
        <TabsContent value="study">
          <StudyPlanPanel documentId={documentId} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
