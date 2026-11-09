import React from 'react';

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
  }

  private resetData = async () => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    try {
      indexedDB.deleteDatabase('StudyPlatformDB');
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return <FatalScreen message={this.state.error.message} onReset={this.resetData} />;
  }
}

export function FatalScreen({ message, onReset }: { message?: string; onReset?: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: "'Noto Sans Georgian', system-ui, sans-serif",
        background: '#f8fafc',
        color: '#0f172a',
      }}
    >
      <div style={{ maxWidth: 440, textAlign: 'center' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>რაღაც შეცდომა მოხდა</h1>
        <p style={{ color: '#475569', marginBottom: 20 }}>
          გვერდის ჩატვირთვა ვერ მოხერხდა. სცადეთ განახლება.
        </p>
        {message && (
          <pre style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'pre-wrap', marginBottom: 20 }}>{message}</pre>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer' }}
          >
            განახლება
          </button>
          {onReset && (
            <button
              onClick={onReset}
              style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', cursor: 'pointer' }}
            >
              მონაცემების გასუფთავება
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
