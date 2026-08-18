import { Suspense, lazy } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline, Box, CircularProgress } from "@mui/material";
import theme from "./theme";
import { AuthProvider } from "@/context/AuthContext";
import { InventoryProvider } from "@/context/InventoryContext";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/toaster"; // Keeping for smooth transition
import { Toaster as Sonner } from "@/components/ui/sonner";
import ProtectedRoute from "@/components/ProtectedRoute";

// Lazy-load routes so heavy per-page dependencies (exceljs, jspdf, zxing)
// aren't bundled into the initial download needed just to render the login screen.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const InventoryPage = lazy(() => import("@/pages/Inventory"));
const AddItemPage = lazy(() => import("@/pages/AddItem"));
const ItemDetailPage = lazy(() => import("@/pages/ItemDetail"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const TemplatesPage = lazy(() => import("@/pages/Templates"));
const GenerateLabelPage = lazy(() => import("@/pages/GenerateLabel"));
const LoginPage = lazy(() => import("@/pages/Login"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <Box sx={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center' }}>
    <CircularProgress />
  </Box>
);

const AppRoutes = () => (
  <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
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
  </Suspense>
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
