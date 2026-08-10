import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./theme";
import { AuthProvider } from "@/context/AuthContext";
import { InventoryProvider } from "@/context/InventoryContext";
import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import InventoryPage from "@/pages/Inventory";
import AddItemPage from "@/pages/AddItem";
import ItemDetailPage from "@/pages/ItemDetail";
import SettingsPage from "@/pages/Settings";
import TemplatesPage from "@/pages/Templates";
import GenerateLabelPage from "@/pages/GenerateLabel";
import LoginPage from "@/pages/Login";
import NotFound from "./pages/NotFound";
import { Toaster } from "@/components/ui/toaster"; // Keeping for smooth transition
import { Toaster as Sonner } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
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
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <InventoryProvider>
              <Toaster />
              <Sonner />
              <AppRoutes />
            </InventoryProvider>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
