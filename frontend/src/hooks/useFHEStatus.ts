import { useState } from "react";

export enum EncryptStep {
  Idle       = "IDLE",
  Encrypting = "ENCRYPTING",
  Submitting = "SUBMITTING",
  Mining     = "MINING",
  Done       = "DONE",
  Error      = "ERROR",
}

export const ENCRYPT_STEP_LABELS: Record<EncryptStep, string> = {
  [EncryptStep.Idle]:       "Ready",
  [EncryptStep.Encrypting]: "Encrypting inputs…",
  [EncryptStep.Submitting]: "Awaiting wallet signature…",
  [EncryptStep.Mining]:     "Broadcasting transaction…",
  [EncryptStep.Done]:       "Confirmed",
  [EncryptStep.Error]:      "Error",
};

export function useFHEStatus() {
  const [step, setStep] = useState<EncryptStep>(EncryptStep.Idle);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function reset() {
    setStep(EncryptStep.Idle);
    setErrorMsg(null);
  }

  function setError(err: unknown) {
    setStep(EncryptStep.Error);
    setErrorMsg(err instanceof Error ? err.message : String(err));
  }

  return {
    step,
    setStep,
    label: ENCRYPT_STEP_LABELS[step],
    isLoading: step !== EncryptStep.Idle && step !== EncryptStep.Done && step !== EncryptStep.Error,
    isDone: step === EncryptStep.Done,
    isError: step === EncryptStep.Error,
    errorMsg,
    reset,
    setError,
  };
}
