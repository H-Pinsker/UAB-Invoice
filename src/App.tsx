import { useEffect, useState } from 'react';
import { useAuth } from './lib/auth';
import { isSupabaseConfigured } from './lib/supabase';
import { useStore } from './store';
import type { FarmProfile } from './types';
import { logoUrl } from './lib/logo';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { EditorPage } from './pages/EditorPage';
import { SettingsPage } from './pages/SettingsPage';
import { CustomersPage } from './pages/CustomersPage';
import { EuroworkPage } from './pages/EuroworkPage';
import { FarmProfileForm } from './components/FarmProfileForm';

type View = 'overview' | 'editor' | 'settings' | 'customers' | 'eurowork';

export default function App() {
  const { user, loading, signOut } = useAuth();

  if (!isSupabaseConfigured) return <ConfigNotice />;
  if (loading) return <FullScreenMessage text="Lädt…" />;
  if (!user) return <LoginPage />;

  return <AuthedApp key={user.id} onSignOut={signOut} />;
}

function AuthedApp({ onSignOut }: { onSignOut: () => void }) {
  const profile = useStore((s) => s.profile);
  const loaded = useStore((s) => s.loaded);
  const loadCloud = useStore((s) => s.loadCloud);
  const saveProfile = useStore((s) => s.saveProfile);

  const [view, setView] = useState<View>('overview');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadCloud().catch((e) => setLoadError((e as Error).message));
  }, [loadCloud]);

  // Force the Stammdaten dialog the first time, when no profile exists yet.
  useEffect(() => {
    if (loaded && profile === null) setShowProfileModal(true);
  }, [loaded, profile]);

  const handleSaveProfile = async (p: FarmProfile) => {
    await saveProfile(p);
    setShowProfileModal(false);
  };

  return (
    <div className="app">
      <header className="appbar">
        <button className="appbar-brand" onClick={() => setView('overview')}>
          <img src={logoUrl} alt="Urlaub am Bauernhof" />
          <span className="appbar-name">{profile?.farmName || 'Rechnungen'}</span>
        </button>

        <nav className="appbar-nav">
          <button
            className={view === 'overview' ? 'nav active' : 'nav'}
            onClick={() => setView('overview')}
          >
            Übersicht
          </button>
          <button
            className={view === 'customers' ? 'nav active' : 'nav'}
            onClick={() => setView('customers')}
          >
            Gäste
          </button>
          <button
            className={view === 'eurowork' ? 'nav active' : 'nav'}
            onClick={() => setView('eurowork')}
          >
            Eurowork
          </button>
          <button
            className={view === 'settings' ? 'nav active' : 'nav'}
            onClick={() => setView('settings')}
          >
            Stammdaten
          </button>
        </nav>

        <div className="spacer" />

        <button className="subtle" onClick={onSignOut}>
          Abmelden
        </button>
      </header>

      {loadError && <div className="banner-error">{loadError}</div>}

      {!loaded ? (
        <FullScreenMessage text="Lädt Ihre Daten…" inline />
      ) : view === 'overview' ? (
        <OverviewPage onOpenEditor={() => setView('editor')} />
      ) : view === 'editor' ? (
        <EditorPage
          onBack={() => setView('overview')}
          onRequireProfile={() => setShowProfileModal(true)}
        />
      ) : view === 'customers' ? (
        <CustomersPage />
      ) : view === 'eurowork' ? (
        <EuroworkPage />
      ) : (
        <SettingsPage />
      )}

      {showProfileModal && (
        <FarmProfileForm
          initial={profile}
          onSave={handleSaveProfile}
          onClose={profile ? () => setShowProfileModal(false) : undefined}
        />
      )}
    </div>
  );
}

function FullScreenMessage({ text, inline }: { text: string; inline?: boolean }) {
  return <div className={inline ? 'empty' : 'fullscreen-msg'}>{text}</div>;
}

function ConfigNotice() {
  return (
    <div className="fullscreen-msg">
      <div className="config-card">
        <h2>Konfiguration fehlt</h2>
        <p>
          Die Supabase-Zugangsdaten sind nicht gesetzt. Legen Sie eine Datei <code>.env.local</code>{' '}
          mit <code>VITE_SUPABASE_URL</code> und <code>VITE_SUPABASE_ANON_KEY</code> an (siehe{' '}
          <code>.env.example</code>) und starten Sie den Build neu.
        </p>
      </div>
    </div>
  );
}
