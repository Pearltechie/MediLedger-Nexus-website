import { Router, Route, Switch, useLocation } from "wouter";
import { LandingPage } from "@/pages/LandingPage";
import { AuthPage } from "@/pages/AuthPage";
import { Dashboard } from "@/components/Dashboard";
import { useAppStore } from "@/store/appStore";
import { useEffect } from "react";

// Guard — redirects unauthenticated users away from /dashboard
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isRegistered } = useAppStore();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth");
    } else if (!isRegistered) {
      setLocation("/auth");
    }
  }, [isAuthenticated, isRegistered]);

  if (!isAuthenticated || !isRegistered) return null;
  return <Component />;
}

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/dashboard">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route>
          <LandingPage />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
