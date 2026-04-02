import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLogger } from '@/context/LoggerContext';
import { Fingerprint, Check, Plus } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';

export const BiometricRegistration = () => {
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const { toast } = useToast();
  const { logAction } = useLogger();

  useEffect(() => {
    if (!window.PublicKeyCredential) {
      setIsSupported(false);
      return;
    }
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check our custom table
    const { data } = await supabase
      .from('user_authenticators')
      .select('id')
      .eq('user_id', user.id);

    if (data && data.length > 0) {
      setIsRegistered(true);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    logAction("Started Biometric Registration");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) throw new Error('User not found');

      // 1. Get options
      const resp = await fetch('/api/auth/register-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });

      if (!resp.ok) throw new Error('Failed to get registration options');
      const { options, token } = await resp.json();

      // 2. Start registration
      const attResp = await startRegistration(options);

      // 3. Verify
      const verifyResp = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: attResp, token }),
      });

      const verifyResult = await verifyResp.json();

      if (verifyResult.verified) {
        logAction("Biometric Registration Successful");
        toast({
          title: "Success",
          description: "Biometrics registered successfully!",
        });
        setIsRegistered(true);
      } else {
        throw new Error('Verification failed');
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register biometrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm opacity-70">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-muted rounded-full">
            <Fingerprint className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-muted-foreground">Biometric Login</h3>
            <p className="text-sm text-muted-foreground">
              Biometrics are not supported on this device.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-full ${isRegistered ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
          {isRegistered ? <Check className="h-6 w-6" /> : <Fingerprint className="h-6 w-6" />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Biometric Login</h3>
          <p className="text-sm text-muted-foreground">
            {isRegistered 
              ? "Biometrics enabled. You can add more devices." 
              : "Use your fingerprint or face ID to log in securely."}
          </p>
        </div>
        <Button onClick={handleRegister} disabled={loading} variant={isRegistered ? "outline" : "default"}>
          {loading ? "Processing..." : (isRegistered ? <><Plus className="w-4 h-4 mr-2"/> Add Device</> : "Setup")}
        </Button>
      </div>
    </div>
  );
};
