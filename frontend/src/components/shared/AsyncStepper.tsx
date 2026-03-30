import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Shield } from "lucide-react";
import { EncryptStep, ENCRYPT_STEP_LABELS } from "@/hooks/useFHEStatus";

const STEPS = [
  { id: EncryptStep.Encrypting, label: "Encrypting" },
  { id: EncryptStep.Submitting, label: "Signing"    },
  { id: EncryptStep.Mining,     label: "Confirming" },
  { id: EncryptStep.Done,       label: "Done"       },
];

const stepIndex = (s: EncryptStep) => STEPS.findIndex((x) => x.id === s);

interface AsyncStepperProps {
  step: EncryptStep;
  errorMsg?: string | null;
}

export function AsyncStepper({ step, errorMsg }: AsyncStepperProps) {
  const current = stepIndex(step);
  if (step === EncryptStep.Idle) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-black/30 p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-widest">
        <Shield className="w-3.5 h-3.5 text-primary" />
        FHE Operation
      </div>
      <div className="flex items-center gap-3">
        {STEPS.map((s, i) => {
          const done    = i < current || step === EncryptStep.Done;
          const active  = s.id === step && step !== EncryptStep.Done;
          const pending = i > current;

          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={`h-px w-6 transition-colors duration-500 ${
                    done ? "bg-primary" : "bg-border/40"
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    done
                      ? "bg-primary/20 border border-primary/60"
                      : active
                      ? "bg-primary/10 border border-primary animate-pulse"
                      : "bg-transparent border border-border/30"
                  }`}
                >
                  {done ? (
                    <Check className="w-3.5 h-3.5 text-primary" />
                  ) : active ? (
                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-mono">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-medium ${
                    done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground/40"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={`text-xs ${step === EncryptStep.Error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {step === EncryptStep.Error
            ? (errorMsg ?? "An error occurred")
            : ENCRYPT_STEP_LABELS[step]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
