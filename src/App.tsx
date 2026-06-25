import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import SiteFooter from "./components/SiteFooter.tsx";

const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Resumo = lazy(() => import("./pages/Resumo.tsx"));
const Pagamento = lazy(() => import("./pages/Pagamento.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const Campanhas = lazy(() => import("./pages/Campanhas.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/resumo" element={<Resumo />} />
            <Route path="/pagamento" element={<Pagamento />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <SiteFooter />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
