import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  steps: { label: string; path: string }[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 py-6">
      {steps.map((step, index) => (
        <div key={step.path} className="flex items-center">
          {/* Step Circle */}
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`
                w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-sm
                transition-all duration-300
                ${index < currentStep 
                  ? 'bg-success text-success-foreground' 
                  : index === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }
              `}
            >
              {index < currentStep ? (
                <Check className="w-4 h-4 md:w-5 md:h-5" />
              ) : (
                index + 1
              )}
            </motion.div>
            <span className={`
              text-xs mt-2 font-medium hidden sm:block
              ${index === currentStep ? 'text-primary' : 'text-muted-foreground'}
            `}>
              {step.label}
            </span>
          </div>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div className={`
              w-8 md:w-16 h-0.5 mx-2
              ${index < currentStep ? 'bg-success' : 'bg-muted'}
            `} />
          )}
        </div>
      ))}
    </div>
  );
}