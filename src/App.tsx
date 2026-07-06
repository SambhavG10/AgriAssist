import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import ChatBot from "./pages/ChatBot";
import ChatRooms from "./pages/FarmerScheme";
import MarketPrices from "./pages/MarketPrices";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PostDetails from "./pages/PostDetails";
import ChatRoom from "./pages/ChatRoom";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { LoggerProvider } from "./context/LoggerContext";
import GTranslateWidget from "./components/GTranslateWidget";

import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Add a global Auth Interceptor to strictly enforce valid JWTs
// When transitioning Supabase projects (like we did), localStorage holds old project JWTs.
// This throws 401 Unauthorized errors deep inside edge functions. This interceptor instantly purges the cached JWT.
const AuthInterceptor = () => {
  useEffect(() => {
    const purgeInvalidSession = async () => {
      try {
        const { error } = await supabase.auth.getUser();
        if (error && error.name !== 'AuthSessionMissingError' && !error.message.includes('Auth session missing')) {
          console.warn("Invalid session detected. Purging localStorage cache...");
          await supabase.auth.signOut();
          localStorage.clear();
          // Optionally reload to clean state
          window.location.reload();
        }
      } catch (err) {
        console.error("Auth bounds error:", err);
      }
    };
    purgeInvalidSession();
  }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      
      <LoggerProvider>
        <BrowserRouter>
          <AuthInterceptor />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth mode="login" />} />
            <Route path="/register" element={<Auth mode="register" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/:id" element={<PostDetails />} />
            <Route path="/chat" element={<ChatBot />} />
            <Route path="/chat-rooms" element={<ChatRooms />} />
            <Route path="/chat-rooms/:id" element={<ChatRoom />} />

            <Route path="/market-prices" element={<MarketPrices />} />
            <Route path="/profile" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LoggerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
