import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastHost } from './context/AppContext.jsx';
import PublicLayout from './layouts/PublicLayout.jsx';
import AuthLayout from './layouts/AuthLayout.jsx';
import OnboardingLayout from './layouts/OnboardingLayout.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import { page, RouteBoundary } from './routes/lazyPage.jsx';
import { publicRoutes, authRoutes, onboardingRoutes, coopRoutes, investorRoutes, adminRoutes, farmerRoutes } from './routes/manifest.js';

function Element({ file }) {
  const C = page(file);
  const { pathname } = useLocation();
  return <RouteBoundary key={pathname}><C /></RouteBoundary>;
}

const build = (list) => list.map((r) => {
  const routeProps = r.index ? { index: true } : { path: r.path };

  return (
    <Route
      key={`${r.index ? 'index' : r.path || 'route'}:${r.file}`}
      {...routeProps}
      element={<Element file={r.file} />}
    />
  );
});

export default function App() {
  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Routes>
        <Route element={<PublicLayout />}>{build(publicRoutes)}</Route>
        <Route element={<AuthLayout />}>{build(authRoutes)}</Route>
        <Route element={<OnboardingLayout />}>{build(onboardingRoutes)}</Route>
        <Route path="/coop" element={<DashboardLayout role="cooperative" />}>{build(coopRoutes)}</Route>
        <Route path="/investor" element={<DashboardLayout role="investor" />}>{build(investorRoutes)}</Route>
        <Route path="/admin" element={<DashboardLayout role="admin" />}>{build(adminRoutes)}</Route>
        <Route path="/farmer" element={<DashboardLayout role="farmer" />}>{build(farmerRoutes)}</Route>
        <Route path="/onboarding/status" element={<Navigate to="/login" replace />} />
        <Route element={<PublicLayout />}>
          <Route path="*" element={<Element file="shared/NotFound" />} />
        </Route>
      </Routes>
      <ToastHost />
    </>
  );
}
