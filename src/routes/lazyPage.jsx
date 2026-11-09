import { Component, lazy } from 'react';

// Pages are loaded on demand. import.meta.glob keeps the build static (no dynamic string imports at runtime).
const modules = import.meta.glob('../pages/**/*.jsx');
const cache = {};

export function page(file) {
  if (!cache[file]) {
    const loader = modules[`../pages/${file}.jsx`] || modules['../pages/shared/NotFound.jsx'];
    cache[file] = lazy(loader);
  }
  return cache[file];
}

// Keeps one broken page from blanking the whole app. Resets when the route changes (keyed by path).
export class RouteBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { if (typeof console !== 'undefined') console.error('Page error:', error); }
  render() {
    if (this.state.error) {
      return (
        <div className="page" style={{ alignItems: 'center', paddingTop: 80, textAlign: 'center' }}>
          <h1>Something went wrong on this page</h1>
          <p className="muted">The rest of the portal is still working. Try going back or reloading.</p>
          <button className="btn btn--primary" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
