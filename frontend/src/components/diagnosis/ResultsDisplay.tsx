import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, Download, RotateCcw,
  Activity, TrendingUp, FileText, Shield, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiagnosis } from '@/context/DiagnosisContext';
import { toast } from 'sonner';

const severityConfig = {
  Low:    { color: 'bg-success text-success-foreground', icon: CheckCircle },
  Medium: { color: 'bg-warning text-warning-foreground', icon: AlertTriangle },
  High:   { color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle },
};

const diseaseConfig: Record<string, { color: string; bgColor: string }> = {
  Normal:          { color: 'text-success',     bgColor: 'bg-success/10' },
  Pneumonia:       { color: 'text-warning',     bgColor: 'bg-warning/10' },
  'COVID-19':      { color: 'text-destructive', bgColor: 'bg-destructive/10' },
  'Lung Opacity':  { color: 'text-primary',     bgColor: 'bg-primary/10' },
  Tuberculosis:    { color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

const CLASS_COLORS: Record<string, string> = {
  Normal:          '#22c55e',
  Pneumonia:       '#f59e0b',
  'COVID-19':      '#ef4444',
  'Lung Opacity':  '#3b82f6',
  Tuberculosis:    '#dc2626',
};

export function ResultsDisplay() {
  const navigate = useNavigate();
  const { patientData, diagnosisResult, resetDiagnosis } = useDiagnosis();

  useEffect(() => {
    if (!diagnosisResult || !patientData) navigate('/');
  }, [diagnosisResult, patientData, navigate]);

  if (!diagnosisResult || !patientData) return null;

  const disease  = diseaseConfig[diagnosisResult.disease] ?? diseaseConfig['Normal'];
  const severity = severityConfig[diagnosisResult.severity];
  const SeverityIcon = severity.icon;
  const confidencePct = (diagnosisResult.confidence * 100).toFixed(1);

  const handleDownloadReport = () => {
    const report = {
      patient:   patientData,
      diagnosis: {
        disease:         diagnosisResult.disease,
        confidence:      diagnosisResult.confidence,
        severity:        diagnosisResult.severity,
        probabilities:   diagnosisResult.probabilities,
        affectedRegions: diagnosisResult.affectedRegions,
        recommendations: diagnosisResult.recommendations,
        scanId:          diagnosisResult.scanId,
      },
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `pulmoscan-report-${patientData.fullName.replace(/\s+/g, '_')}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const handleNewDiagnosis = () => {
    resetDiagnosis();
    navigate('/patient-details');
  };

  const probEntries = Object.entries(diagnosisResult.probabilities ?? {})
    .sort(([, a], [, b]) => b - a);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      {/* Result Header */}
      <div className="medical-card text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${disease.bgColor} mb-4`}
        >
          <Activity className={`w-10 h-10 ${disease.color}`} />
        </motion.div>

        <h1 className="font-display text-3xl font-bold mb-2">Analysis Complete</h1>

        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={`text-2xl font-bold ${disease.color}`}>
            {diagnosisResult.disease}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${severity.color}`}>
            <SeverityIcon className="w-4 h-4 inline mr-1" />
            {diagnosisResult.severity} Severity
          </span>
        </div>

        {/* Confidence score */}
        <div className="max-w-sm mx-auto">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Confidence Score</span>
            <span className="font-semibold">{confidencePct}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidencePct}%` }}
              transition={{ delay: 0.5, duration: 1 }}
              className="h-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
        </div>

        {diagnosisResult.scanId && (
          <p className="text-xs text-muted-foreground mt-4">
            Scan ID: <code className="bg-secondary px-1 py-0.5 rounded">{diagnosisResult.scanId}</code>
          </p>
        )}
      </div>

      {/* Probability Distribution */}
      <div className="medical-card">
        <h3 className="font-display font-semibold text-lg mb-5 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Probability Distribution
        </h3>
        <div className="space-y-4">
          {probEntries.map(([cls, prob]) => {
            const pct   = (prob * 100).toFixed(1);
            const color = CLASS_COLORS[cls] ?? '#6b7280';
            const isTop = cls === diagnosisResult.disease;
            return (
              <div key={cls}>
                <div className="flex justify-between text-sm mb-1">
                  <span className={`font-medium ${isTop ? 'font-bold' : ''}`}>{cls}</span>
                  <span style={{ color }} className="font-semibold">{pct}%</span>
                </div>
                <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Affected Regions */}
      {diagnosisResult.affectedRegions.length > 0 && (
        <div className="medical-card">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Affected Regions
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {diagnosisResult.affectedRegions.map((region, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-destructive flex-shrink-0" />
                <span className="text-sm font-medium">{region}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clinical Recommendations */}
      <div className="medical-card">
        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Clinical Recommendations
        </h3>
        <ul className="space-y-3">
          {diagnosisResult.recommendations.map((rec, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span className="text-sm">{rec}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      {/* Patient Summary */}
      <div className="medical-card">
        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Patient Summary
        </h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Name</span>
            <p className="font-medium mt-0.5">{patientData.fullName}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Age / Gender</span>
            <p className="font-medium mt-0.5">{patientData.age} / {patientData.gender}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Contact</span>
            <p className="font-medium mt-0.5">{patientData.email}</p>
          </div>
        </div>

        {patientData.symptoms.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-muted-foreground text-sm">Reported Symptoms</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {patientData.symptoms.map((symptom) => (
                <span key={symptom} className="px-2 py-1 bg-secondary rounded text-xs font-medium">
                  {symptom}
                </span>
              ))}
            </div>
          </div>
        )}

        {patientData.existingConditions && (
          <div className="mt-3 pt-3 border-t border-border">
            <span className="text-muted-foreground text-sm">Existing Conditions</span>
            <p className="text-sm mt-0.5">{patientData.existingConditions}</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl">
        <Shield className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Important Medical Notice</p>
          <p className="text-xs text-muted-foreground mt-1">
            This AI-assisted result is for informational purposes only and must not replace a
            qualified clinician's judgement. Always consult a licensed healthcare professional
            before making any medical decisions.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pb-6">
        <Button variant="outline" onClick={handleNewDiagnosis} className="flex-1 gap-2">
          <RotateCcw className="w-4 h-4" />
          New Diagnosis
        </Button>
        <Button onClick={handleDownloadReport} className="flex-1 gap-2">
          <Download className="w-4 h-4" />
          Download Report
        </Button>
      </div>
    </motion.div>
  );
}
