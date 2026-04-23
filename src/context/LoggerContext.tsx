import React, { createContext, useContext, useState, useRef, ReactNode, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface LoggerContextType {
  logAction: (message: string, userId?: string | null) => void;
}

const LoggerContext = createContext<LoggerContextType | undefined>(undefined);

export const LoggerProvider = ({ children }: { children: ReactNode }) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const logAction = useCallback(async (message: string, explicitUserId?: string | null) => {
    
    // --- 1. UI LOGIC (The Popup) ---
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToastMessage(message);
    timerRef.current = setTimeout(() => {
      setToastMessage(null);
      timerRef.current = null;
    }, 5000);

    // --- 2. SEND TO SEPARATE NODE SERVER (Fire and Forget) ---
    try {
      let userId = explicitUserId;
      
      // If userId is not provided, we try to get it, but we don't block the UI
      if (userId === undefined) {
         // We can check if we have a session in memory without making a network call if possible,
         // or just skip it for now to avoid the "fetching from supabase" issue.
         // For now, let's try to get it but catch errors silently.
         try {
            const { data } = await supabase.auth.getSession();
            userId = data.session?.user?.id || null;
         } catch (e) {
            // ignore
         }
      }

      const logEntry = {
        message,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: userId || null
      };

      // Log to console for debugging
      console.log("Audit Log:", logEntry);

      // Send to local node server
      fetch('http://localhost:3000/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      }).catch(() => {
        // Silently fail if the local logging server is not running to avoid console errors
      });

    } catch (err) {
      console.error("Logging error:", err);
    }
  }, []);

  return (
    <LoggerContext.Provider value={{ logAction }}>
      {children}
      <AuditPopup message={toastMessage} />
    </LoggerContext.Provider>
  );
};

export const useLogger = () => {
  const context = useContext(LoggerContext);
  if (!context) throw new Error("useLogger must be used within a LoggerProvider");
  return context;
};

const AuditPopup = ({ message }: { message: string | null }) => {
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#0f172a',
      color: '#fff', padding: '12px 20px', borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', borderLeft: '4px solid #22c55e',
      zIndex: 9999, fontSize: '14px', fontFamily: 'sans-serif',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>
        System Log
      </div>
      {message}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
