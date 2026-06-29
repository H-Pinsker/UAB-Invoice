import { useState } from 'react';
import type { FarmProfile } from '../types';
import { useStore } from '../store';
import { FarmProfileForm } from '../components/FarmProfileForm';

export function SettingsPage() {
  const profile = useStore((s) => s.profile);
  const saveProfile = useStore((s) => s.saveProfile);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (p: FarmProfile) => {
    setError(null);
    try {
      await saveProfile(p);
      setFlash(true);
      setTimeout(() => setFlash(false), 1800);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="page settings">
      <div className="page-head">
        <div>
          <h1>Stammdaten</h1>
          <p className="page-sub">Ihre Betriebsdaten für alle Rechnungen.</p>
        </div>
        {flash && <span className="flash">✓ Gespeichert</span>}
      </div>

      {error && <div className="banner-error">{error}</div>}

      <div className="settings-card">
        <FarmProfileForm initial={profile} onSave={handleSave} variant="page" />
      </div>
    </div>
  );
}
