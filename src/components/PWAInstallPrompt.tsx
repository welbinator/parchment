import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const pwaEnabled = useFeatureFlag('pwa-install');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Don't show if already installed (running in standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  if (!pwaEnabled || !showBanner || installed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-card border border-border rounded-xl shadow-lg p-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Download size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Install Parchment</p>
          <p className="text-xs text-muted-foreground mt-0.5">Add to your home screen for quick access</p>
        </div>
        <button
          onClick={() => setShowBanner(false)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => setShowBanner(false)}
          className="flex-1 px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
        >
          Install
        </button>
      </div>
    </div>
  );
}
