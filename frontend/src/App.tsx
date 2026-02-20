import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DiagnosisProvider } from "@/context/DiagnosisContext";
import Index from "./pages/Index";
import PatientDetails from "./pages/PatientDetails";
import UploadScan from "./pages/UploadScan";
import Processing from "./pages/Processing";
import Results from "./pages/Results";
import HowItWorks from "./pages/HowItWorks";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DiagnosisProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/patient-details" element={<PatientDetails />} />
            <Route path="/upload-scan" element={<UploadScan />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/results" element={<Results />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/about" element={<About />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </DiagnosisProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;