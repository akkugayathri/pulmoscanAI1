import { Layout } from '@/components/layout/Layout';
import { StepIndicator } from '@/components/diagnosis/StepIndicator';
import { ScanUploader } from '@/components/diagnosis/ScanUploader';

const steps = [
  { label: 'Patient Info', path: '/patient-details' },
  { label: 'Upload Scan', path: '/upload-scan' },
  { label: 'Processing', path: '/processing' },
  { label: 'Results', path: '/results' },
];

const UploadScan = () => {
  return (
    <Layout showFooter={false}>
      <div className="min-h-[calc(100vh-5rem)] py-8">
        <div className="medical-container">
          <StepIndicator currentStep={1} steps={steps} />
          <ScanUploader />
        </div>
      </div>
    </Layout>
  );
};

export default UploadScan;