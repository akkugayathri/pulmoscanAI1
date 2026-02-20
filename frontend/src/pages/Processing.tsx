import { Layout } from '@/components/layout/Layout';
import { StepIndicator } from '@/components/diagnosis/StepIndicator';
import { ProcessingAnimation } from '@/components/diagnosis/ProcessingAnimation';

const steps = [
  { label: 'Patient Info', path: '/patient-details' },
  { label: 'Upload Scan', path: '/upload-scan' },
  { label: 'Processing', path: '/processing' },
  { label: 'Results', path: '/results' },
];

const Processing = () => {
  return (
    <Layout showFooter={false}>
      <div className="min-h-[calc(100vh-5rem)] py-8">
        <div className="medical-container">
          <StepIndicator currentStep={2} steps={steps} />
          <ProcessingAnimation />
        </div>
      </div>
    </Layout>
  );
};

export default Processing;