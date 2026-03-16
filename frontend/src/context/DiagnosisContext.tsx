import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PatientData, ScanData, DiagnosisResult } from '@/types/patient';

interface DiagnosisContextType {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
  scanData: ScanData | null;
  setScanData: (data: ScanData) => void;
  diagnosisResult: DiagnosisResult | null;
  setDiagnosisResult: (result: DiagnosisResult) => void;
  resetDiagnosis: () => void;
  // Form auto-save helpers
  savedFormDraft: Partial<PatientData> | null;
  saveFormDraft: (data: Partial<PatientData>) => void;
  clearFormDraft: () => void;
}

const DiagnosisContext = createContext<DiagnosisContextType | undefined>(undefined);

const SESSION_KEY   = 'pulmoscan_session';
const DRAFT_KEY     = 'pulmoscan_form_draft';

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadSession(): { patientData: PatientData | null; diagnosisResult: DiagnosisResult | null } {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { patientData: null, diagnosisResult: null };
}

function saveSession(patientData: PatientData | null, diagnosisResult: DiagnosisResult | null) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ patientData, diagnosisResult }));
  } catch {}
}

function loadDraft(): Partial<PatientData> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveDraft(data: Partial<PatientData>) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function DiagnosisProvider({ children }: { children: ReactNode }) {
  const session = loadSession();

  const [patientData,     setPatientDataState]     = useState<PatientData | null>(session.patientData);
  const [scanData,        setScanData]             = useState<ScanData | null>(null);
  const [diagnosisResult, setDiagnosisResultState] = useState<DiagnosisResult | null>(session.diagnosisResult);
  const [savedFormDraft,  setSavedFormDraft]        = useState<Partial<PatientData> | null>(loadDraft);

  // Persist patient data + result to sessionStorage whenever they change
  useEffect(() => {
    saveSession(patientData, diagnosisResult);
  }, [patientData, diagnosisResult]);

  const setPatientData = (data: PatientData) => {
    setPatientDataState(data);
  };

  const setDiagnosisResult = (result: DiagnosisResult) => {
    setDiagnosisResultState(result);
  };

  const saveFormDraft = (data: Partial<PatientData>) => {
    setSavedFormDraft(data);
    saveDraft(data);
  };

  const clearFormDraft = () => {
    setSavedFormDraft(null);
    clearDraft();
  };

  const resetDiagnosis = () => {
    setPatientDataState(null);
    setScanData(null);
    setDiagnosisResultState(null);
    clearFormDraft();
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
  };

  return (
    <DiagnosisContext.Provider
      value={{
        patientData,
        setPatientData,
        scanData,
        setScanData,
        diagnosisResult,
        setDiagnosisResult,
        resetDiagnosis,
        savedFormDraft,
        saveFormDraft,
        clearFormDraft,
      }}
    >
      {children}
    </DiagnosisContext.Provider>
  );
}

export function useDiagnosis() {
  const context = useContext(DiagnosisContext);
  if (context === undefined) {
    throw new Error('useDiagnosis must be used within a DiagnosisProvider');
  }
  return context;
}

