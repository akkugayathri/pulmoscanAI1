import { motion } from 'framer-motion';

const diseases = [
  {
    name: 'Pneumonia',
    description: 'Lung infection causing inflammation and fluid buildup in air sacs.',
    color: 'bg-destructive/10 text-destructive',
  },
  {
    name: 'Tuberculosis',
    description: 'Bacterial infection primarily affecting the lungs with characteristic patterns.',
    color: 'bg-warning/10 text-warning',
  },
  {
    name: 'COPD',
    description: 'Chronic obstructive pulmonary disease causing breathing difficulties.',
    color: 'bg-primary/10 text-primary',
  },
  {
    name: 'Lung Cancer',
    description: 'Malignant tumor formations detectable in early stages via CT imaging.',
    color: 'bg-destructive/10 text-destructive',
  },
  {
    name: 'Normal',
    description: 'Healthy lung tissue with no detectable abnormalities or concerns.',
    color: 'bg-success/10 text-success',
  },
];

export function DiseasesSection() {
  return (
    <section className="py-20 md:py-28">
      <div className="medical-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Conditions We
            <span className="medical-gradient-text"> Detect</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Our AI model is trained to identify and classify five major pulmonary conditions with high accuracy.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {diseases.map((disease, index) => (
            <motion.div
              key={disease.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="medical-card text-center hover:shadow-elevated transition-all duration-300"
            >
              <div className={`inline-flex px-3 py-1 rounded-full text-xs font-medium mb-3 ${disease.color}`}>
                {disease.name}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {disease.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}