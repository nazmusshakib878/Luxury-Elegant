'use client';

import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '1rem', margin: '0.5rem 0', borderRadius: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', color: '#991b1b', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 600 }}>Artisanal item temporarily unavailable</div>
          <div style={{ color: '#7f1d1d', fontSize: '0.75rem', marginTop: '0.25rem' }}>{this.state.error?.message || 'Rendering error'}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
