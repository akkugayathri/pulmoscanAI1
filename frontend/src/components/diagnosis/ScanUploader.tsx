import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Camera, 
  X, 
  RotateCcw, 
  ArrowRight, 
  FileImage, 
  AlertCircle,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDiagnosis } from '@/context/DiagnosisContext';
import { toast } from 'sonner';

type UploadMethod = 'file' | 'camera' | null;

export function ScanUploader() {
  const navigate = useNavigate();
  const { patientData, setScanData } = useDiagnosis();
  
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Redirect if no patient data
  useEffect(() => {
    if (!patientData) {
      navigate('/patient-details');
    }
  }, [patientData, navigate]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image (JPG, PNG) or PDF file');
        return;
      }

      // Validate file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }

      setSelectedFile(file);
      setUploadMethod('file');
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        setUploadMethod('camera');
      }
    } catch (error) {
      toast.error('Unable to access camera. Please check permissions.');
      console.error('Camera error:', error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const resetUpload = () => {
    setUploadMethod(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCapturedImage(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = () => {
    setScanData({
      file: selectedFile,
      capturedImage: capturedImage,
      uploadMethod: uploadMethod,
    });
    navigate('/processing');
  };

  // Don't render content if no patient data
  if (!patientData) {
    return null;
  }

  const hasValidScan = (uploadMethod === 'file' && selectedFile) || 
                       (uploadMethod === 'camera' && capturedImage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <div className="medical-card">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold mb-2">Upload CT Scan</h2>
          <p className="text-sm text-muted-foreground">
            Choose how you'd like to provide the CT scan image for analysis
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!uploadMethod && (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {/* File Upload Option */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Upload File</p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG, or PDF up to 20MB
                    </p>
                  </div>
                </div>
              </button>

              {/* Camera Option */}
              <button
                onClick={startCamera}
                className="p-8 rounded-xl border-2 border-dashed border-accent/30 hover:border-accent hover:bg-accent/5 transition-all group"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Camera className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Use Camera</p>
                    <p className="text-xs text-muted-foreground">
                      Capture scan from display
                    </p>
                  </div>
                </div>
              </button>
            </motion.div>
          )}

          {/* File Preview */}
          {uploadMethod === 'file' && selectedFile && (
            <motion.div
              key="file-preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden scan-preview">
                {previewUrl ? (
                  <img 
                    src={previewUrl} 
                    alt="CT Scan Preview" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-primary-foreground/70">
                    <FileImage className="w-16 h-16" />
                    <p className="text-sm">{selectedFile.name}</p>
                  </div>
                )}
                
                {/* Success Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-success text-success-foreground text-sm font-medium">
                  <Check className="w-4 h-4" />
                  File Ready
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileImage className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={resetUpload}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Camera View */}
          {uploadMethod === 'camera' && (
            <motion.div
              key="camera"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden scan-preview">
                {isCameraActive && (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 border-2 border-primary/50 rounded-xl">
                      <div className="scanning-line" />
                    </div>
                  </>
                )}

                {capturedImage && (
                  <>
                    <img 
                      src={capturedImage} 
                      alt="Captured CT Scan" 
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-success text-success-foreground text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Captured
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-center gap-3">
                {isCameraActive ? (
                  <>
                    <Button variant="outline" onClick={resetUpload}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button onClick={capturePhoto} className="gap-2">
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </Button>
                  </>
                ) : capturedImage ? (
                  <>
                    <Button variant="outline" onClick={retakePhoto}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retake
                    </Button>
                  </>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hidden Elements */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 bg-warning/10 rounded-lg mt-6">
          <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Image Quality Guidelines</p>
            <p className="text-xs text-muted-foreground">
              For best results, ensure the CT scan image is clear, well-lit, and shows the complete lung region. Avoid blurry or partial images.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => navigate('/patient-details')} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={handleAnalyze} 
            disabled={!hasValidScan}
            className="flex-1 gap-2"
          >
            Analyze Scan
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}