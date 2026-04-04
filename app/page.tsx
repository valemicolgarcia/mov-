"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { DaysList } from "@/components/workout/days-list";
import { WorkoutDetail } from "@/components/workout/workout-detail";
import { RoutineEditor } from "@/components/workout/routine-editor";
import { WorkoutHistory } from "@/components/workout/workout-history";
import { useWorkoutStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

type View = "list" | "detail" | "editor" | "history";

export default function Home() {
  const { loading: authLoading, signOut } = useAuth();
  const store = useWorkoutStore();
  const [view, setView] = useState<View>("list");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const selectedDay = selectedDayId
    ? store.routine.find((d) => d.id === selectedDayId)
    : null;

  if (authLoading || store.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {view === "editor" ? (
          <RoutineEditor
            key="editor"
            routine={store.routine}
            onSave={store.saveRoutine}
            onImport={store.importRoutine}
            onExport={store.exportRoutine}
            onBack={() => {
              store.reload();
              setView("list");
            }}
          />
        ) : view === "history" ? (
          <WorkoutHistory
            key="history"
            store={store}
            onBack={() => setView("list")}
          />
        ) : view === "detail" && selectedDay ? (
          <WorkoutDetail
            key="detail"
            day={selectedDay}
            store={store}
            onBack={() => {
              setSelectedDayId(null);
              setView("list");
            }}
          />
        ) : (
          <DaysList
            key="list"
            routine={store.routine}
            getDayProgress={store.getDayProgress}
            onSelectDay={(id) => {
              setSelectedDayId(id);
              setView("detail");
            }}
            onEditRoutine={() => setView("editor")}
            onViewHistory={() => setView("history")}
            onSignOut={signOut}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
