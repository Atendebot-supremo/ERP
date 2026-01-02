import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useSimpleAuth } from "./contexts/AuthContext";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import SetupContracts from "./pages/SetupContracts";
import Services from "./pages/Services";
import Expenses from "./pages/Expenses";
import ClientDetails from "./pages/ClientDetails";
import Home from "./pages/Home";
import DREContabil from "./pages/DREContabil";
import Login from "./pages/Login";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useSimpleAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!isAuthenticated) {
    setLocation("/login");
    return null;
  }

  return <Route component={Component} {...rest} />;
}

function Router() {
  const { isAuthenticated, isLoading } = useSimpleAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      {isAuthenticated ? (
        <>
          <Route path={"/"} component={Dashboard} />
          <Route path={"/clients"} component={Clients} />
          <Route path={"/clients/:id"} component={ClientDetails} />
          <Route path={"/setup-contracts"} component={SetupContracts} />
          <Route path={"/services"} component={Services} />
          <Route path={"/expenses"} component={Expenses} />
          <Route path={"/dre-contabil"} component={DREContabil} />
          <Route path={"/404"} component={NotFound} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path={"*"} component={Login} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="light">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
