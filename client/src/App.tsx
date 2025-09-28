import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MobileLayout from "@/components/layout/MobileLayout";
import { I18nProvider } from "@/contexts/I18nContext";

// Import all pages
import Home from "@/pages/Home";
import Voice from "@/pages/Voice";
import Chat from "@/pages/Chat";
import ProviderSearch from "@/pages/ProviderSearch";
import ResourceSearch from "@/pages/ResourceSearch";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import ProviderClaim from "@/pages/ProviderClaim";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <MobileLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/voice" component={Voice} />
        <Route path="/chat" component={Chat} />
        <Route path="/search/providers" component={ProviderSearch} />
        <Route path="/search/resources" component={ResourceSearch} />
        <Route path="/login" component={Login} />
        <Route path="/profile" component={Profile} />
        <Route path="/admin" component={Admin} />
        <Route path="/providers/claim" component={ProviderClaim} />
        <Route component={NotFound} />
      </Switch>
    </MobileLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
