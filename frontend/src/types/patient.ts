export interface PatientData {
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email: string;
  symptoms: string[];
  otherSymptoms: string;
  existingConditions: string;
  consentGiven: boolean;
}

export interface ScanData {
  file: File | null;
  capturedImage: string | null;
  uploadMethod: 'file' | 'camera' | null;
}

export type DiseaseClass =
  | 'Normal'
  | 'Pneumonia'
  | 'COVID-19'
  | 'Lung Opacity'
  | 'Tuberculosis';

export interface DiagnosisResult {
  /** ID returned by the backend for this scan */
  scanId?: string;
  disease: DiseaseClass;
  confidence: number;               // 0–1 float
  severity: 'Low' | 'Medium' | 'High';
  affectedRegions: string[];
  recommendations: string[];
  /** Full probability distribution over all classes */
  probabilities: Record<string, number>;
  /** Base64-encoded Grad-CAM PNG from Python API */
  heatmapUrl: string;
  /** True when Python model is not loaded and results are deterministic demo */
  demoMode: boolean;
}

export interface AnalysisReport {
  id: string;
  patientData: PatientData;
  scanData: ScanData;
  result: DiagnosisResult;
  createdAt: Date;
}