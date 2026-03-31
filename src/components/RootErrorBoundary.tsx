import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Parchment] Uncaught error:', error, info);
  }

  handleRefresh = () => {
    // Unregister SW and reload — forces fresh fetch from server
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      }).finally(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0f0c19',
            color: '#e5e5e5',
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
            textAlign: 'center',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '2rem' }}>📜</div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#888', margin: 0, maxWidth: '20rem' }}>
            Parchment ran into an unexpected error. Tap the button below to reload — this clears the cache and fetches the latest version.
          </p>
          <button
            onClick={this.handleRefresh}
            style={{
              marginTop: '0.5rem',
              padding: '0.625rem 1.5rem',
              backgroundColor: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reload Parchment
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
