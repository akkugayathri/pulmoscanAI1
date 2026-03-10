import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Activity, Scan, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { useDiagnosis } from '@/context/DiagnosisContext';
import { submitDiagnosis } from '@/lib/api';
import { DiagnosisResult, DiseaseClass } from '@/types/patient';

const processingSteps = [
  { icon: Scan,        label: 'Preprocessing image…',    duration: 1200 },
  { icon: Brain,       label: 'Running AI analysis…',    duration: 2200 },
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

  // ── Error Screen ────────────────────────────────────────────────────────────
  if (error) {
    const isInvalidXray = error.startsWith('INVALID_XRAY:');
    const errorMessage  = isInvalidXray
      ? error.replace('INVALID_XRAY:', '')
      : error;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          {/* Icon — red X circle for invalid xray, alert for other errors */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isInvalidXray ? 'bg-orange-100' : 'bg-destructive/10'
          }`}>
            {isInvalidXray
              ? <XCircle className="w-10 h-10 text-orange-500" />
              : <AlertCircle className="w-10 h-10 text-destructive" />
            }
          </div>

          {/* Title */}
          <h2 className="font-display text-xl font-bold mb-3">
            {isInvalidXray ? 'Invalid Image Uploaded' : 'Analysis Failed'}
          </h2>

          {/* Main message */}
          <p className="text-sm text-muted-foreground mb-4">
            {errorMessage}
          </p>

          {/* Extra hint for invalid xray */}
          {isInvalidXray && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 text-left">
              <p className="text-xs text-orange-700 font-medium mb-1">Please make sure you upload:</p>
              <ul className="text-xs text-orange-600 space-y-1 list-disc list-inside">
                <li>A chest X-ray image (grayscale / black & white)</li>
                <li>In JPEG or PNG format</li>
                <li>Not a selfie, photo, or colored image</li>
              </ul>
            </div>
          )}

          {/* Extra hint for server errors */}
          {!isInvalidXray && (
            <p className="text-xs text-muted-foreground mb-6">
              AI inference service may be unavailable. Please ensure the Python API is running.
            </p>
          )}

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

  // ── Processing Screen ───────────────────────────────────────────────────────
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
