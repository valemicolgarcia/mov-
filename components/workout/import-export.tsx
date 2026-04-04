"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  Download,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

interface ImportExportProps {
  onImport: (json: string) => Promise<boolean>;
  onExport: () => string;
  onBack: () => void;
}

export function ImportExport({ onImport, onExport, onBack }: ImportExportProps) {
  const [jsonText, setJsonText] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleImport = async () => {
    if (!jsonText.trim()) {
      setMessage({ type: "error", text: "Pegá el JSON de la rutina" });
      return;
    }
    const success = await onImport(jsonText);
    if (success) {
      setMessage({ type: "success", text: "Rutina importada correctamente" });
      setTimeout(() => onBack(), 1000);
    } else {
      setMessage({
        type: "error",
        text: "JSON inválido. Verificá el formato.",
      });
    }
  };

  const handleExport = async () => {
    const json = onExport();
    setJsonText(json);
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setMessage({
        type: "success",
        text: "Rutina copiada al portapapeles",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({
        type: "success",
        text: "Rutina exportada. Copiala manualmente.",
      });
    }
  };

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
            <h1 className="text-lg font-black uppercase tracking-tight text-foreground">
              Importar / Exportar
            </h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-4">
        {/* Export button */}
        <button
          onClick={handleExport}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card border border-border py-4 text-sm font-bold text-foreground transition-colors hover:border-primary active:scale-[0.98]"
        >
          {copied ? (
            <Check className="h-5 w-5 text-primary" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {copied ? "Copiado" : "Exportar Rutina Actual"}
        </button>

        {/* JSON textarea */}
        <div>
          <label className="mb-2 block text-sm font-bold uppercase tracking-widest text-muted-foreground">
            JSON de la rutina
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setMessage(null);
            }}
            placeholder='Pegá acá el JSON de la rutina para importar...'
            rows={12}
            className="w-full rounded-xl bg-secondary p-4 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              message.type === "success"
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {message.type === "success" ? (
              <Check className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {message.text}
          </motion.div>
        )}

        {/* Import button */}
        <button
          onClick={handleImport}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <Upload className="h-5 w-5" />
          Importar Rutina
        </button>
      </div>
    </motion.div>
  );
}
