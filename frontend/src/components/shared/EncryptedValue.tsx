import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EncryptedValueProps {
  /** The raw ciphertext handle (bigint) to display when locked */
  ctHash?: bigint;
  /** The decrypted value to show after reveal */
  decryptedValue?: string | number | bigint;
  /** Whether the value is currently being decrypted */
  isDecrypting?: boolean;
  /** Called when the user clicks Reveal */
  onReveal?: () => void;
  /** Unit suffix, e.g. "ETH" */
  unit?: string;
  className?: string;
}

export function EncryptedValue({
  ctHash,
  decryptedValue,
  isDecrypting,
  onReveal,
  unit,
  className = "",
}: EncryptedValueProps) {
  const isRevealed = decryptedValue !== undefined && decryptedValue !== null;
  const shortHash = ctHash
    ? `0x${ctHash.toString(16).slice(0, 8)}…${ctHash.toString(16).slice(-4)}`
    : "encrypted";

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <AnimatePresence mode="wait">
        {isRevealed ? (
          <motion.span
            key="revealed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-mono text-primary font-semibold"
          >
            {String(decryptedValue)}
            {unit && <span className="text-muted-foreground ml-1 text-xs">{unit}</span>}
          </motion.span>
        ) : (
          <motion.span
            key="encrypted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded px-2 py-0.5 flex items-center gap-1"
          >
            <Lock className="w-2.5 h-2.5" />
            {shortHash}
          </motion.span>
        )}
      </AnimatePresence>

      {!isRevealed && onReveal && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
          disabled={isDecrypting}
          onClick={onReveal}
        >
          <Eye className="w-3 h-3 mr-1" />
          {isDecrypting ? "…" : "Reveal"}
        </Button>
      )}
    </div>
  );
}
