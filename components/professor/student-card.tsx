"use client";

import { motion } from "framer-motion";
import { User, Calendar, TrendingUp } from "lucide-react";
import type { StudentSummary } from "@/lib/professor-store";

interface StudentCardProps {
  student: StudentSummary;
  index: number;
  onClick: () => void;
}

export function StudentCard({ student, index, onClick }: StudentCardProps) {
  const isActive =
    student.lastWorkoutDate &&
    daysSince(student.lastWorkoutDate) <= 7;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:bg-secondary/30 active:scale-[0.98]"
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          isActive ? "bg-primary/10" : "bg-secondary"
        }`}
      >
        <User
          className={`h-6 w-6 ${
            isActive ? "text-primary" : "text-muted-foreground"
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="truncate text-sm font-bold text-foreground">
          {student.display_name}
        </h3>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {student.lastWorkoutDate
              ? `Ultimo: ${formatRelative(student.lastWorkoutDate)}`
              : "Sin entrenamientos"}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1">
          <TrendingUp className="h-3 w-3 text-primary" />
          <span className="text-xs font-bold text-primary">
            {student.completedThisWeek}/sem
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {student.completedThisMonth} este mes
        </span>
      </div>
    </motion.button>
  );
}

function daysSince(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatRelative(dateStr: string): string {
  const days = daysSince(dateStr);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} dias`;
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}
