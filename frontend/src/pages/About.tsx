import { Layout } from '@/components/layout/Layout';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Award, 
  Users, 
  Globe,
  Target,
  Lightbulb
} from 'lucide-react';

const stats = [
  { value: '98.5%', label: 'Accuracy Rate' },
  { value: '50K+', label: 'Scans Analyzed' },
  { value: '<30s', label: 'Average Analysis' },
  { value: '24/7', label: 'Availability' },
];

const values = [
  {
    icon: Heart,
    title: 'Patient First',
    description: 'Every decision we make prioritizes patient well-being and healthcare accessibility.',
  },
  {
    icon: Award,
    title: 'Clinical Excellence',
    description: 'Our AI models are trained on verified medical data and validated by pulmonology experts.',
  },
  {
    icon: Users,
    title: 'Collaborative Care',
    description: 'We work alongside healthcare providers to enhance, not replace, clinical expertise.',
  },
  {
    icon: Globe,
    title: 'Global Access',
    description: 'Making advanced diagnostic capabilities available to underserved communities worldwide.',
  },
];

const About = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-secondary/50 to-background">
        <div className="medical-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-6">
              About
              <span className="medical-gradient-text"> PulmoScan AI</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We're on a mission to democratize access to advanced pulmonary diagnostics through the power of artificial intelligence, making early detection accessible to everyone, everywhere.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-foreground text-background">
        <div className="medical-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-display font-bold text-primary mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-background/70">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 md:py-24">
        <div className="medical-container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Our Mission</span>
              </div>
              <h2 className="font-display text-3xl font-bold mb-4">
                Transforming Pulmonary Healthcare
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Pulmonary diseases affect millions worldwide, yet early detection remains a challenge in many regions. We believe that advanced AI diagnostics should not be limited to well-resourced hospitals.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                PulmoScan AI bridges this gap by providing instant, accurate analysis of CT scans, helping healthcare providers make informed decisions faster and enabling early intervention that saves lives.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium text-accent">Our Vision</span>
              </div>
              <h2 className="font-display text-3xl font-bold mb-4">
                A World Where No Disease Goes Undetected
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                We envision a future where AI-assisted diagnostics are a standard part of healthcare, working seamlessly with medical professionals to catch diseases at their earliest, most treatable stages.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our technology is designed to augment human expertise, providing objective analysis while leaving final medical decisions in the hands of qualified physicians.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24 bg-secondary/30">
        <div className="medical-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <h2 className="font-display text-3xl font-bold mb-4">Our Core Values</h2>
            <p className="text-muted-foreground">
              The principles that guide everything we do at PulmoScan AI.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="medical-card text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;