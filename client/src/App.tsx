import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import ClientNew from "./pages/ClientNew";
import ClientEdit from "./pages/ClientEdit";
import Profile from "./pages/Profile";
import Contracts from "./pages/Contracts";
import Logs from "./pages/Logs";
import Construction from "./pages/Construction";
import Calendar from "./pages/Calendar";
import Tasks from "./pages/Tasks";
import OnboardingWizard from "./pages/OnboardingWizard";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AcceptInvite from "./pages/AcceptInvite";
import Users from "./pages/Users";
import Notifications from "./pages/Notifications";
import WorkflowSettings from "./pages/WorkflowSettings";
import AuthGuard from "./components/AuthGuard";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/forgot-password"} component={ForgotPassword} />
      <Route path={"/reset-password"} component={ResetPassword} />
      <Route path={"/invite"} component={AcceptInvite} />
      <Route path={"/onboarding"} component={OnboardingWizard} />
      <Route path={"/dashboard"}>
        <AuthGuard>
          <Dashboard />
        </AuthGuard>
      </Route>
      <Route path={"/clients"}>
        <AuthGuard><Clients /></AuthGuard>
      </Route>
      <Route path={"/clients/new"}>
        <AuthGuard><ClientNew /></AuthGuard>
      </Route>
      <Route path={"/clients/:id/edit"}>
        <AuthGuard><ClientEdit /></AuthGuard>
      </Route>
      <Route path={"/clients/:id"}>
        <AuthGuard><ClientProfile /></AuthGuard>
      </Route>
      <Route path={"/logs"}>
        <AuthGuard><Logs /></AuthGuard>
      </Route>
      <Route path={"/construction"}>
        <AuthGuard><Construction /></AuthGuard>
      </Route>
      <Route path={"/calendar"}>
        <AuthGuard><Calendar /></AuthGuard>
      </Route>
      <Route path={"/tasks"}>
        <AuthGuard><Tasks /></AuthGuard>
      </Route>
      <Route path={"/notifications"}>
        <AuthGuard><Notifications /></AuthGuard>
      </Route>
      <Route path={"/profile"}>
        <AuthGuard><Profile /></AuthGuard>
      </Route>
      <Route path={"/contracts"}>
        <AuthGuard><Contracts /></AuthGuard>
      </Route>
      <Route path={"/users"}>
        <AuthGuard><Users /></AuthGuard>
      </Route>
      <Route path={"/workflow"}>
        <AuthGuard><WorkflowSettings /></AuthGuard>
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
