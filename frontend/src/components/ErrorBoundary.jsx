import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('GAME CRASH:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div data-testid="error-boundary" className="fixed inset-0 z-[999] bg-black text-red-300 p-6 overflow-auto font-mono-stat text-xs">
          <div className="text-lg font-bold mb-2">Runtime Error</div>
          <pre className="whitespace-pre-wrap">{String(this.state.error?.stack || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
