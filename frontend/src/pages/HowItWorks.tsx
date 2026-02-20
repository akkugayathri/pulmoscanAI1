import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { 
  UserPlus, 
  Upload, 
  Brain, 
  FileCheck,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const steps = [
  {
    icon: UserPlus,
    step: '01',
    title: 'Enter Patient Details',
    description: 'Provide basic patient information including name, age, gender, symptoms, and medical history. All data is handled securely and confidentially.',
  },
  {
    icon: Upload,
    step: '02',
    title: 'Upload CT Scan',
    description: 'Upload a chest CT scan image (JPG, PNG, or PDF) or use your device camera to capture the scan from a display or printout.',
  },
  {
    icon: Brain,
    step: '03',
    title: 'AI Analysis',
    description: 'Our deep learning model analyzes the lung regions using convolutional neural networks trained on thousands of pulmonary images.',
  },
  {
    icon: FileCheck,
    step: '04',
    title: 'Get Results',
    description: 'Receive detailed diagnosis with confidence scores, Grad-CAM heatmap visualization, affected regions, and recommended next steps.',
  },
];

const HowItWorks = () => {
  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="medical-container">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              How
              <span className="medical-gradient-text"> PulmoScan AI</span> Works
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              Our streamlined process makes pulmonary disease detection accessible, fast, and accurate. Here's what to expect.
            </p>
          </motion.div>

          {/* Steps */}
          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-accent to-primary/20 transform -translate-x-1/2" />

            <div className="space-y-12 md:space-y-0">
              {steps.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className={`md:flex items-center gap-8 ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Content Card */}
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="medical-card inline-block text-left max-w-md">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl font-display font-bold text-primary/30">
                          {step.step}
                        </span>
                        <h3 className="font-display text-xl font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="hidden md:flex items-center justify-center relative z-10">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-elevated"
                    >
                      <step.icon className="w-8 h-8 text-primary-foreground" />
                    </motion.div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Link to="/patient-details">
              <Button size="lg" className="gap-2 font-semibold shadow-elevated">
                Start Your Diagnosis
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default HowItWorks;