import { useState } from 'react';
import { useStore } from '../store';
import { InvoiceSheet } from '../components/InvoiceSheet';
import { exportInvoicePdf, emailInvoicePdf } from '../lib/exportPdf';

interface Props {
  onBack: () => void;
  onRequireProfile: () => void;
}

export function EditorPage({ onBack, onRequireProfile }: Props) {
  const profile = useStore((s) => s.profile);
  const saving = useStore((s) => s.saving);
  const saveCurrentInvoice = useStore((s) => s.saveCurrentInvoice);

  const [building, setBuilding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flashMessage = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 1800);
  };

  const handleBack = async () => {
    setError(null);
    try {
      await saveCurrentInvoice();
      onBack();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handlePdf = async () => {
    if (!profile) {
      onRequireProfile();
      return;
    }
    setError(null);
    setBuilding(true);
    try {
      const saved = await saveCurrentInvoice();
      await exportInvoicePdf(saved, profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBuilding(false);
    }
  };

  const handleShare = async () => {
    if (!profile) {
      onRequireProfile();
      return;
    }
    setError(null);
    setSharing(true);
    try {
      const saved = await saveCurrentInvoice();
      const mode = await emailInvoicePdf(saved, profile);
      if (mode === 'fallback') {
        flashMessage('PDF heruntergeladen – bitte anhängen');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="page editor">
      <div className="editor-actionbar">
        <button className="subtle" onClick={handleBack} disabled={saving}>
          ← Übersicht
        </button>
        <div className="spacer" />
        {flash && <span className="flash">{flash}</span>}
        {saving && <span className="autosave-hint">Speichern…</span>}
        <button
          className="subtle"
          onClick={handleShare}
          disabled={sharing}
          title="Teilen / per E-Mail senden"
        >
          <ShareIcon />
          Senden
        </button>
        <button className="primary" onClick={handlePdf} disabled={building}>
          {building ? (
            'Erzeuge PDF…'
          ) : (
            <>
              PDF
              <DownloadIcon />
            </>
          )}
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <div className="workspace">
        <InvoiceSheet />
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3v12m0 0l-4-4m4 4l4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
