import { Router, Route, Switch } from "wouter";
import { LandingPage } from "@/pages/LandingPage";
import { Dashboard } from "@/components/Dashboard";

function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/dashboard" component={Dashboard} />
        <Route>
          <LandingPage />
        </Route>
      </Switch>
    </Router>
  );
}

export default App;
