"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, RotateCw, AlertCircle } from "lucide-react";
import type { Block } from "@/lib/workout-data";
import type { useWorkoutStore } from "@/lib/store";
import { ExerciseRow } from "./exercise-row";

interface BlockCardProps {
  block: Block;
  index: number;
  dayId: string;
  store: ReturnType<typeof useWorkoutStore>;
}

export function BlockCard({ block, index, dayId, store }: BlockCardProps) {
  const [isExpanded, setIsExpanded] = useState(index === 0);

  const dayLog = store.todayLogs[dayId];
  let completedCount = 0;
  let totalCount = 0;

  for (const exercise of block.exercises) {
    const roundCount = block.rounds;
    totalCount += roundCount;
    const exLog = dayLog?.exercises?.[exercise.id];
    if (exLog) completedCount += exLog.filter((s) => s?.completed).length;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      {/* Block header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-secondary/30"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <span className="text-lg font-black">{index + 1}</span>
          </div>
          <div>
            <h3 className="text-base font-bold uppercase tracking-wide text-foreground">
              {block.name}
            </h3>
            <div className="mt-0.5 flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-primary">
                <RotateCw className="h-3 w-3" />
                <span className="font-medium">{block.rounds} vueltas</span>
              </div>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">
                {block.exercises.length} ejercicios
              </span>
              {completedCount > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-xs font-medium text-primary">
                    {completedCount}/{totalCount}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {block.notes && (
              <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg bg-primary/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-primary/90">{block.notes}</p>
              </div>
            )}

            <div className="space-y-4 px-5 pb-5">
              {Array.from({ length: block.rounds }).map((_, roundIdx) => (
                <div key={roundIdx}>
                  {/* Round header */}
                  {block.rounds > 1 && (
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-7 items-center rounded-lg bg-primary/10 px-3">
                        <span className="text-xs font-bold text-primary">
                          Serie {roundIdx + 1}
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {/* All exercises for this round */}
                  <div className="space-y-2">
                    {block.exercises.map((exercise) => (
                      <ExerciseRow
                        key={`${exercise.id}-r${roundIdx}`}
                        exercise={exercise}
                        setIndex={roundIdx}
                        dayId={dayId}
                        store={store}
                        roundLabel={block.rounds > 1 ? roundIdx + 1 : undefined}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
