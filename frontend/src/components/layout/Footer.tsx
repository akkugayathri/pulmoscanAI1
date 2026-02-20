import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-10">
      <div className="medical-container max-w-4xl mx-auto text-center space-y-6">

       

        {/* Divider */}
        <div className="border-t border-background/10 pt-6 space-y-3">
          <p className="text-xs text-background/50">
            © 2026 PulmoScan AI. All rights reserved.
          </p>

          <div className="flex justify-center gap-6">
            <Link
              to="/privacy"
              className="text-xs text-background/50 hover:text-primary transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-xs text-background/50 hover:text-primary transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
