/**
 * PulmoScan AI — Frontend API Client
 * Connects to the Node.js backend (port 3001 by default)
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface DiagnosisApiResult {
  scanId: string;
  predicted_class: string;
  confidence: number;
  severity: 'Low' | 'Medium' | 'High';
  probabilities: Record<string, number>;
  affected_regions: string[];
  recommendations: string[];
  heatmap_b64: string | null;
  demo_mode: boolean;
  created_at: string;
}

export interface AnalyticsData {
  totalScans: number;
  scansThisWeek: number;
  classDistribution: Array<{
    class: string;
    count: number;
    avgConfidence: number;
  }>;
}

export interface HistoryRecord {
  scanId: string;
  patient: {
    fullName?: string;
    age?: number;
    gender?: string;
    email?: string;
  };
  result: {
    predictedClass: string;
    confidence: number;
    severity: string;
    probabilities: Record<string, number>;
    affectedRegions: string[];
    recommendations: string[];
    demoMode: boolean;
  };
  createdAt: string;
}

/** Submit a scan image + patient data for AI diagnosis */
export async function submitDiagnosis(
  imageFile: File,
  patientData: Record<string, unknown>
): Promise<DiagnosisApiResult> {
  const form = new FormData();
  form.append('image', imageFile);
  form.append('patientData', JSON.stringify(patientData));

  const response = await fetch(`${BASE_URL}/api/diagnose`, {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Server error ${response.status}`);
  }

  return response.json();
}

/** Fetch diagnosis history */
export async function fetchHistory(params?: {
  page?: number;
  limit?: number;
  class?: string;
}): Promise<{ records: HistoryRecord[]; total: number; pages: number }> {
  const qs = new URLSearchParams();
  if (params?.page)  qs.set('page',  String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.class) qs.set('class', params.class);

  const response = await fetch(`${BASE_URL}/api/history?${qs}`);
  if (!response.ok) throw new Error('Failed to fetch history');
  return response.json();
}

/** Fetch analytics summary */
export async function fetchAnalytics(): Promise<AnalyticsData> {
  const response = await fetch(`${BASE_URL}/api/analytics`);
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
}

/** Check backend health */
export async function checkHealth(): Promise<Record<string, unknown>> {
  const response = await fetch(`${BASE_URL}/api/health`);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}
