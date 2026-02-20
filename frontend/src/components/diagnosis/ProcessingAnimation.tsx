import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Activity, Scan, CheckCircle, AlertCircle } from 'lucide-react';
import { useDiagnosis } from '@/context/DiagnosisContext';
import { submitDiagnosis } from '@/lib/api';
import { DiagnosisResult, DiseaseClass } from '@/types/patient';

const processingSteps = [
  { icon: Scan,        label: 'Preprocessing image…',    duration: 1200 },
  { icon: Brain,       label: 'Running AI analysis…',    duration: 2200 },
  { icon: Activity,    label: 'Generating Grad-CAM…',    duration: 1200 },
  { icon: CheckCircle, label: 'Finalizing results…',     duration: 800  },
];

export function ProcessingAnimation() {
  const navigate = useNavigate();
  const { scanData, patientData, setDiagnosisResult } = useDiagnosis();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [error,       setError]       = useState<string | null>(null);
  const calledRef = useRef(false);

  useEffect(() => {
    if (!scanData) navigate('/upload-scan');
  }, [scanData, navigate]);

  useEffect(() => {
    if (!scanData || calledRef.current) return;
    calledRef.current = true;

    const totalDuration = processingSteps.reduce((a, s) => a + s.duration, 0);
    let elapsed = 0;

    const progressInterval = setInterval(() => {
      elapsed += 50;
      setProgress(Math.min((elapsed / totalDuration) * 90, 90));
    }, 50);

    let acc = 0;
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    processingSteps.forEach((_, idx) => {
      stepTimers.push(setTimeout(() => setCurrentStep(idx), acc));
      acc += processingSteps[idx].duration;
    });

    const imageFile = scanData.file;

    (async () => {
      try {
        if (!imageFile) throw new Error('No scan file available.');

        const apiResult = await submitDiagnosis(imageFile, patientData ?? {});

        const result: DiagnosisResult = {
          scanId:          apiResult.scanId,
          disease:         apiResult.predicted_class as DiseaseClass,
          confidence:      apiResult.confidence,
          severity:        apiResult.severity,
          affectedRegions: apiResult.affected_regions,
          recommendations: apiResult.recommendations,
          probabilities:   apiResult.probabilities,
          heatmapUrl:      apiResult.heatmap_b64 ?? '',
          demoMode:        apiResult.demo_mode,
        };

        clearInterval(progressInterval);
        setProgress(100);
        setDiagnosisResult(result);
        setTimeout(() => navigate('/results'), 500);
      } catch (err: unknown) {
        clearInterval(progressInterval);
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg);
      } finally {
        stepTimers.forEach(clearTimeout);
      }
    })();

    return () => {
      clearInterval(progressInterval);
      stepTimers.forEach(clearTimeout);
    };
  }, [scanData, patientData, navigate, setDiagnosisResult]);

  const CurrentIcon = processingSteps[currentStep]?.icon ?? Brain;

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="font-display text-xl font-bold mb-3">Analysis Failed</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground mb-6">
            Make sure the Node.js backend (port 3001) and Python inference API (port 5001) are running.
          </p>
          <button
            onClick={() => navigate('/upload-scan')}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md mx-auto px-4"
      >
        <div className="relative w-32 h-32 mx-auto mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-4 rounded-full border-4 border-accent/20 border-b-accent"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              key={currentStep}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center"
            >
              <CurrentIcon className="w-8 h-8 text-primary-foreground" />
            </motion.div>
          </div>
        </div>

        <motion.h2
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-xl font-semibold mb-2"
        >
          {processingSteps[currentStep]?.label}
        </motion.h2>

        <p className="text-sm text-muted-foreground mb-6">
          EfficientNetB0 deep-learning model · Grad-CAM visualization
        </p>

        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">{Math.round(progress)}% complete</p>

        <div className="flex justify-center gap-2 mt-6">
          {processingSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
