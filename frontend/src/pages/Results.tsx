import { Layout } from '@/components/layout/Layout';
import { StepIndicator } from '@/components/diagnosis/StepIndicator';
import { ResultsDisplay } from '@/components/diagnosis/ResultsDisplay';

const steps = [
  { label: 'Patient Info', path: '/patient-details' },
  { label: 'Upload Scan', path: '/upload-scan' },
  { label: 'Processing', path: '/processing' },
  { label: 'Results', path: '/results' },
];

const Results = () => {
  return (
    <Layout showFooter={false}>
      <div className="min-h-[calc(100vh-5rem)] py-8">
        <div className="medical-container">
          <StepIndicator currentStep={3} steps={steps} />
          <ResultsDisplay />
        </div>
      </div>
    </Layout>
  );
};

export default Results;