import { motion } from 'framer-motion';
import { 
  ScanLine, 
  Brain, 
  FileCheck, 
  Lock, 
  Cpu, 
  Eye 
} from 'lucide-react';

const features = [
  {
    icon: ScanLine,
    title: 'CT Scan Analysis',
    description: 'Upload CT scans in various formats including DICOM, JPG, PNG, or PDF for comprehensive lung analysis.',
  },
  {
    icon: Brain,
    title: 'Deep Learning AI',
    description: 'Powered by state-of-the-art CNN models trained on thousands of pulmonary images for accurate detection.',
  },
  {
    icon: Eye,
    title: 'Grad-CAM Visualization',
    description: 'Visual explanations showing exactly which lung regions influenced the AI\'s diagnosis decision.',
  },
  {
    icon: FileCheck,
    title: 'Multi-Disease Detection',
    description: 'Detect and classify Pneumonia, Tuberculosis, COPD, Lung Cancer, or confirm healthy lung status.',
  },
  {
    icon: Cpu,
    title: 'Real-Time Processing',
    description: 'Get diagnostic results in seconds with our optimized inference pipeline and cloud infrastructure.',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'Your medical data is encrypted and processed securely. We never store images after analysis.',
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 md:py-28 bg-secondary/30">
      <div className="medical-container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Cutting-Edge
            <span className="medical-gradient-text"> AI Technology</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Our platform combines advanced deep learning with medical imaging expertise to deliver reliable pulmonary diagnostics.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="medical-card h-full hover:shadow-elevated transition-shadow duration-300 group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}