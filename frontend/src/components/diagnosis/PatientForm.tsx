import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, User, Phone, Mail, Calendar, Stethoscope } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDiagnosis } from '@/context/DiagnosisContext';
import { PatientData } from '@/types/patient';
import { toast } from 'sonner';

const symptomOptions = [
  'Persistent cough',
  'Shortness of breath',
  'Chest pain',
  'Wheezing',
  'Coughing up blood',
  'Fatigue',
  'Weight loss',
  'Fever',
  'Night sweats',
];

export function PatientForm() {
  const navigate = useNavigate();
  const { setPatientData } = useDiagnosis();

  const [formData, setFormData] = useState<PatientData>({
    fullName: '',
    age: 0,
    gender: 'male',
    phone: '',
    email: '',
    symptoms: [],
    otherSymptoms: '',
    existingConditions: '',
    consentGiven: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.age || formData.age < 1 || formData.age > 120) {
      newErrors.age = 'Please enter a valid age (1–120)';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }

    if (!formData.consentGiven) {
      newErrors.consent = 'Consent is required to proceed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setPatientData(formData);
      toast.success('Patient details saved');
      navigate('/upload-scan');
    } else {
      toast.error('Please fix the errors in the form');
    }
  };

  const handleSymptomToggle = (symptom: string) => {
    setFormData(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="max-w-2xl mx-auto"
    >
      <div className="medical-card space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Patient Information</h2>
          <p className="text-sm text-muted-foreground">
            Please provide accurate information for diagnosis
          </p>
        </div>

        {/* Personal Details */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">
              <User className="inline w-4 h-4 mr-1" />
              Full Name *
            </Label>
            <Input
              id="fullName"
              placeholder="Enter full name"
              value={formData.fullName}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, fullName: e.target.value }))
              }
              className={errors.fullName ? 'border-destructive' : ''}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">{errors.fullName}</p>
            )}
          </div>

          {/* Age */}
          <div className="space-y-2">
            <Label htmlFor="age">
              <Calendar className="inline w-4 h-4 mr-1" />
              Age *
            </Label>
            <Input
              id="age"
              type="number"
              min={1}
              max={120}
              placeholder="Enter age"
              value={formData.age || ''}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  age: parseInt(e.target.value) || 0,
                }))
              }
              className={errors.age ? 'border-destructive' : ''}
            />
            {errors.age && (
              <p className="text-xs text-destructive">{errors.age}</p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label>Gender *</Label>
            <Select
              value={formData.gender}
              onValueChange={(value: 'male' | 'female' | 'other') =>
                setFormData(prev => ({ ...prev, gender: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="inline w-4 h-4 mr-1" />
              Phone Number *
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, phone: e.target.value }))
              }
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">
              <Mail className="inline w-4 h-4 mr-1" />
              Email Address *
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={(e) =>
                setFormData(prev => ({ ...prev, email: e.target.value }))
              }
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>
        </div>

        {/* Symptoms */}
        <div className="space-y-3">
          <Label>
            <Stethoscope className="inline w-4 h-4 mr-1" />
            Current Symptoms
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {symptomOptions.map(symptom => (
              <label
                key={symptom}
                className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer"
              >
                <Checkbox
                  checked={formData.symptoms.includes(symptom)}
                  onCheckedChange={() => handleSymptomToggle(symptom)}
                />
                <span className="text-sm">{symptom}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Other Symptoms */}
        <div className="space-y-2">
          <Label>Other Symptoms</Label>
          <Textarea
            placeholder="Describe other symptoms (if any)"
            value={formData.otherSymptoms}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                otherSymptoms: e.target.value,
              }))
            }
          />
        </div>

        {/* Existing Conditions */}
        <div className="space-y-2">
          <Label>Existing Medical Conditions</Label>
          <Textarea
            placeholder="Mention existing conditions or medications"
            value={formData.existingConditions}
            onChange={(e) =>
              setFormData(prev => ({
                ...prev,
                existingConditions: e.target.value,
              }))
            }
          />
        </div>

        {/* Consent */}
        <div className="p-4 bg-secondary/50 rounded-lg">
          <label className="flex items-start gap-3">
            <Checkbox
              checked={formData.consentGiven}
              onCheckedChange={checked =>
                setFormData(prev => ({
                  ...prev,
                  consentGiven: checked as boolean,
                }))
              }
            />
            <span className="text-sm">
              I consent to AI-assisted diagnostic analysis *
            </span>
          </label>
          {errors.consent && (
            <p className="text-xs text-destructive mt-1">{errors.consent}</p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full gap-2">
          Continue to Upload Scan
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </motion.form>
  );
}
