import React, { createContext, useContext, useState, ReactNode } from 'react';
import { PatientData, ScanData, DiagnosisResult } from '@/types/patient';

interface DiagnosisContextType {
  patientData: PatientData | null;
  setPatientData: (data: PatientData) => void;
  scanData: ScanData | null;
  setScanData: (data: ScanData) => void;
  diagnosisResult: DiagnosisResult | null;
  setDiagnosisResult: (result: DiagnosisResult) => void;
  resetDiagnosis: () => void;
}

const DiagnosisContext = createContext<DiagnosisContextType | undefined>(undefined);

export function DiagnosisProvider({ children }: { children: ReactNode }) {
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);

  const resetDiagnosis = () => {
    setPatientData(null);
    setScanData(null);
    setDiagnosisResult(null);
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