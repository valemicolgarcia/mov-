"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Activity,
  Clock,
  Footprints,
  MapPin,
  FileText,
  Check,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { localDateStr } from "@/lib/date-utils";

const ACTIVITY_SUGGESTIONS = [
  "Correr",
  "Caminar",
  "Bicicleta",
  "Natacion",
  "Yoga",
  "Futbol",
  "Senderismo",
  "Otro",
];

interface ExtraSessionFormProps {
  onBack: () => void;
  onSaved: () => void;
}

export function ExtraSessionForm({ onBack, onSaved }: ExtraSessionFormProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [activityType, setActivityType] = useState("");
  const [customActivity, setCustomActivity] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [steps, setSteps] = useState("");
  const [distance, setDistance] = useState("");
  const [date, setDate] = useState(() => localDateStr());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const finalActivity =
    activityType === "Otro" ? customActivity : activityType;

  const handleSave = async () => {
    if (!user || !finalActivity) return;
    setSaving(true);

    const metrics: Record<string, number> = {};
    if (steps) metrics.steps = parseInt(steps);
    if (distance) metrics.distance_km = parseFloat(distance);

    await supabase.from("extra_sessions").insert({
      user_id: user.id,
      date,
      activity_type: finalActivity,
      duration_minutes: duration ? parseInt(duration) : null,
      notes: notes || null,
      metrics,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => onSaved(), 500);
  };

  const showSteps = ["Caminar", "Correr", "Senderismo"].includes(activityType);
  const showDistance = [
    "Correr",
    "Bicicleta",
    "Natacion",
    "Senderismo",
  ].includes(activityType);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-lg px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black uppercase tracking-tight text-foreground">
                Actividad Extra
              </h1>
              <p className="text-xs text-muted-foreground">
                Registrar sesion fuera de la rutina
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Activity type */}
        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">
            Tipo de actividad
          </label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_SUGGESTIONS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setActivityType(a)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                  activityType === a
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          {activityType === "Otro" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2"
            >
              <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
                <Activity className="h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  value={customActivity}
                  onChange={(e) => setCustomActivity(e.target.value)}
                  placeholder="Nombre de la actividad"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Fecha
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl bg-secondary px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Duration */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Duracion (minutos)
          </label>
          <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <input
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Ej: 30"
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* Steps (conditional) */}
        {showSteps && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Pasos
            </label>
            <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
              <Footprints className="h-5 w-5 text-muted-foreground" />
              <input
                type="number"
                inputMode="numeric"
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="Ej: 8000"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </motion.div>
        )}

        {/* Distance (conditional) */}
        {showDistance && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Distancia (km)
            </label>
            <div className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="Ej: 5.2"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </motion.div>
        )}

        {/* Notes */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Notas (opcional)
          </label>
          <div className="flex items-start gap-3 rounded-xl bg-secondary px-4 py-3">
            <FileText className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Como te sentiste, que hiciste..."
              rows={3}
              className="flex-1 resize-none bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!finalActivity || saving || saved}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold transition-transform active:scale-[0.98] disabled:opacity-50 ${
            saved
              ? "bg-green-500/20 text-green-400"
              : "bg-primary text-primary-foreground"
          }`}
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : saved ? (
            <>
              <Check className="h-5 w-5" />
              Guardado
            </>
          ) : (
            "Guardar Actividad"
          )}
        </button>
      </div>

      <div className="h-20" />
    </motion.div>
  );
}
