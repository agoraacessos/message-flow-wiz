import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Messages from "./pages/Messages";
import Campaigns from "./pages/Campaigns";
import ConversationRecovery from "./pages/ConversationRecovery";
import FieldSettings from "./pages/FieldSettings";
import NotFound from "./pages/NotFound";
import { useSupabaseSync } from "./hooks/useSupabaseSync";
import { useConversationRecoveryMonitor } from "./hooks/useConversationRecoveryMonitor";

const queryClient = new QueryClient();

const App = () => {
  // Sincronização automática com Supabase
  useSupabaseSync();
  
  // Monitor de recuperação de conversas
  useConversationRecoveryMonitor();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/campaigns" element={<Campaigns />} />
            <Route path="/conversation-recovery" element={<ConversationRecovery />} />
            <Route path="/field-settings" element={<FieldSettings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
