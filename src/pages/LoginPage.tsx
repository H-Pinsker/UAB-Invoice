import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { logoUrl } from '../lib/logo';

export function LoginPage() {
  const { signIn, sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error);
  };

  const handleReset = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Bitte zuerst Ihre E-Mail-Adresse eingeben.');
      return;
    }
    setBusy(true);
    const { error } = await sendPasswordReset(email);
    setBusy(false);
    if (error) setError(error);
    else setInfo('Falls ein Konto existiert, wurde eine E-Mail zum Zurücksetzen gesendet.');
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <img className="login-logo" src={logoUrl} alt="Urlaub am Bauernhof" />
        <h1>Anmelden</h1>
        <p className="login-sub">Bitte melden Sie sich an, um Ihre Rechnungen zu verwalten.</p>

        <label>
          E-Mail
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Passwort
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <div className="login-error">{error}</div>}
        {info && <div className="login-info">{info}</div>}

        <button type="submit" className="primary login-submit" disabled={busy}>
          {busy ? 'Anmelden…' : 'Anmelden'}
        </button>

        <button type="button" className="link-btn" onClick={handleReset} disabled={busy}>
          Passwort vergessen?
        </button>
      </form>
    </div>
  );
}
