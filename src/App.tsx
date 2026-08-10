import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import { InventoryProvider } from "@/context/InventoryContext";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import InventoryPage from "@/pages/Inventory";
import AddItemPage from "@/pages/AddItem";
import ItemDetailPage from "@/pages/ItemDetail";
import SettingsPage from "@/pages/Settings";
import TemplatesPage from "@/pages/Templates";
import GenerateLabelPage from "@/pages/GenerateLabel";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/toaster"; // Keeping for smooth transition
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Security, LoginCallback } from '@okta/okta-react';
import { toRelativeUrl } from '@okta/okta-auth-js';
import { oktaConfig, oktaAuth } from "@/config/okta";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const AppRoutes = () => {
    const navigate = useNavigate();
    const restoreOriginalUri = async (_oktaAuth: any, originalUri: string) => {
        navigate(toRelativeUrl(originalUri || '/', window.location.origin));
    };

    return (
        <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
            <Routes>
                <Route path="/login/callback" element={<LoginCallback />} />
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppShell />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/inventory" element={<InventoryPage />} />
                        <Route path="/inventory/:id" element={<ItemDetailPage />} />
                        <Route path="/add" element={<AddItemPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/labels" element={<GenerateLabelPage />} />
                        <Route path="/templates" element={<TemplatesPage />} />
                    </Route>
                </Route>
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Security>
    );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TooltipProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <InventoryProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </InventoryProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
