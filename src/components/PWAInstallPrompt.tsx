import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Download, X } from 'lucide-react';

const PWA_DISMISS_STORAGE_ID = 'pwa_prompt_dismissed_at';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  readonly prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallContextType {
  canInstall: boolean;
  isInstalled: boolean;
  triggerInstall: () => Promise<void>;
}

const PWAInstallContext = createContext<PWAInstallContextType>({
  canInstall: false,
  isInstalled: false,
  triggerInstall: async () => {},
});

export const usePWAInstall = () => useContext(PWAInstallContext);

// skipcq: JS-0067
export function PWAInstallProvider({ children }: { readonly children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (globalThis.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only auto-show banner if not recently dismissed
      const lastDismissed = localStorage.getItem(PWA_DISMISS_STORAGE_ID);
      if (!lastDismissed || Date.now() - Number.parseInt(lastDismissed, 10) >= ONE_WEEK_MS) {
        setShowBanner(true);
      }
    };

    globalThis.addEventListener('beforeinstallprompt', handler);
    globalThis.addEventListener('appinstalled', () => { setIsInstalled(true); setShowBanner(false); });

    return () => { globalThis.removeEventListener('beforeinstallprompt', handler); }; // skipcq: JS-0045
  }, []);

  const triggerInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') { setIsInstalled(true); }
    setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(PWA_DISMISS_STORAGE_ID, String(Date.now()));
    setShowBanner(false);
  };

  return (
    <PWAInstallContext.Provider value={{ canInstall: !!deferredPrompt && !isInstalled, isInstalled, triggerInstall }}>
      {children}
      {showBanner && !isInstalled && (
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
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              Not now
            </button>
            <button
              onClick={() => { void triggerInstall(); }}
              className="flex-1 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Install
            </button>
          </div>
        </div>
      )}
    </PWAInstallContext.Provider>
  );
}

// Legacy default export for backwards compat — renders nothing, provider handles the banner
// skipcq: JS-0067
export default function PWAInstallPrompt() { return null; }
