import { AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export function DisclaimerBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-warning/10 border-y border-warning/20"
    >
      <div className="medical-container py-4">
        <div className="flex items-center justify-center gap-3 text-center">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">Medical Disclaimer:</span>{' '}
            PulmoScan AI is an AI-assisted diagnostic support tool. Results should be reviewed by a qualified healthcare professional and should not replace medical diagnosis or treatment.
          </p>
        </div>
      </div>
    </motion.div>
  );
}