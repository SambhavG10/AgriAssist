import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Leaf, LogOut, User as UserIcon, AtSign, Phone, MapPin, Wheat, Save, Mail, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { startRegistration } from '@simplewebauthn/browser';
import { useLogger } from "@/context/LoggerContext";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [primaryCrops, setPrimaryCrops] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useLogger();

  useEffect(() => {
    if (window.PublicKeyCredential) {
      setIsBiometricSupported(true);
    }
    logAction("Visited Profile Page");
  }, [logAction]);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          toast({ title: 'Error fetching profile', description: error.message, variant: 'destructive' });
        } else if (data) {
          setFullName(data.full_name || '');
          setPhone(data.phone || '');
          setLocation(
            typeof data.location === 'object' && data.location !== null
              ? JSON.stringify(data.location)
              : data.location !== undefined && data.location !== null
                ? String(data.location)
                : ''
          );
          setPrimaryCrops(data.primary_crops?.join(', ') || '');
        }
      } else {
        navigate('/login');
      }
      setLoading(false);
    };

    fetchUserAndProfile();
  }, [navigate, toast]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    logAction("Updating Profile...");

    let locationJson: any = location;
    try {
        locationJson = JSON.parse(location);
    } catch (error) {
        // Not a JSON string
    }

    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      full_name: fullName,
      phone,
      location: locationJson,
      primary_crops: primaryCrops.split(',').map(s => s.trim()),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });

    if (error) {
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated successfully!' });
    }
    setLoading(false);
  };

  const handleRegisterBiometrics = async () => {
    if (!user) return;
    logAction("Registering Biometrics...");
    
    try {
      toast({ title: "Starting biometric setup..." });

      // 1. Get WebAuthn registration options
      const resp = await fetch("/api/auth/register-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          fullName: fullName || user.email
        })
      });

      if (!resp.ok) {
        // FIX: Read text ONCE, then try to parse it
        const errorBody = await resp.text(); 
        let errorMessage = `Request failed: ${resp.status}`;
        
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          // If it wasn't JSON, use the raw text (e.g. "Internal Server Error")
          if (errorBody) errorMessage = errorBody;
        }
        
        throw new Error(errorMessage);
      }

      const { options, token } = await resp.json();
      // 2. Start registration (biometric scan)
      const attResp = await startRegistration(options);

      // 3. Verify attestation on backend
      const verifyResp = await fetch("/api/auth/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attResp, token })
      });

      const verifyResult = await verifyResp.json();
      if (!verifyResult.verified) {
        throw new Error("Verification failed");
      }

      // 4. Store biometric hash in profile (as requested)
      // We use the credential ID as the unique hash identifier
      await fetch("/api/auth/store-biometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          biometricHash: attResp.id 
        })
      });

      toast({
        title: "Success!",
        description: "Biometric login enabled successfully."
      });

    } catch (error: any) {
      console.error("Biometric setup failed:", error);
      toast({
        title: "Setup Failed",
        description: error.message || "Could not register biometrics.",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    logAction("Signing Out...");
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in">
       <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center space-x-2 hover-scale self-start">
              <Leaf className="h-7 w-7 sm:h-8 sm:w-8 text-primary animate-float" />
              <span className="text-lg sm:text-xl font-bold text-foreground">AgriAssist</span>
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="h-8 sm:h-9 text-xs sm:text-sm">
                Home
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="h-8 sm:h-9 text-xs sm:text-sm hover:text-red-600">
                <LogOut className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Sign Out</span>
                <span className="inline sm:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl">
        <div className="mb-8 animate-fade-in">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Your Profile</h1>
            <p className="text-muted-foreground text-lg mt-2">Manage your account details and preferences.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <Card className="agri-card shadow-strong hover:shadow-medium transition-all duration-500 hover:scale-105 animate-fade-in">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <Avatar className="w-32 h-32 mb-6 border-4 border-primary/30 hover:border-primary/60 transition-all duration-300 hover:scale-110 shadow-medium">
                            <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${fullName || user?.email}`} alt={fullName} />
                            <AvatarFallback className="text-4xl bg-gradient-primary text-primary-foreground">{fullName?.charAt(0) || user?.email?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <h2 className="text-2xl font-bold text-foreground mb-2">{fullName || 'Anonymous User'}</h2>
                        <p className="text-muted-foreground flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {user?.email}
                        </p>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card className="agri-card shadow-strong hover:shadow-medium transition-all duration-500 animate-fade-in">
                  <CardHeader className="bg-gradient-subtle rounded-t-lg">
                    <CardTitle className="text-2xl">Edit Information</CardTitle>
                    <CardDescription className="text-base">Keep your profile information up to date.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={handleUpdateProfile} className="space-y-8">
                      <div className="relative group">
                        <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                        <Input id="email" type="email" value={user?.email || ''} disabled className="pl-12 h-12 text-lg bg-muted/30 border-2 transition-all duration-300" />
                        <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email Address</Label>
                      </div>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                        <Input id="fullName" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50" />
                        <Label htmlFor="fullName" className="text-sm font-medium text-muted-foreground">Full Name</Label>
                      </div>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                        <Input id="phone" placeholder="Enter your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50" />
                        <Label htmlFor="phone" className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                      </div>
                      <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                        <Input id="location" placeholder="Enter your location" value={location} onChange={(e) => setLocation(e.target.value)} className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50" />
                        <Label htmlFor="location" className="text-sm font-medium text-muted-foreground">Location</Label>
                      </div>
                      <div className="relative group">
                        <Wheat className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                        <Input id="primaryCrops" placeholder="Enter your primary crops" value={primaryCrops} onChange={(e) => setPrimaryCrops(e.target.value)} className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50" />
                        <Label htmlFor="primaryCrops" className="text-sm font-medium text-muted-foreground">Primary Crops</Label>
                      </div>
                      <div className="flex flex-col sm:flex-row justify-end pt-4 gap-4">
                        {isBiometricSupported && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={handleRegisterBiometrics}
                            className="w-full sm:w-auto border-2 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all duration-300"
                          >
                            <Fingerprint className="h-5 w-5 mr-2" />
                            <span className="text-sm">Biometric Setup</span>
                          </Button>
                        )}
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto gradient-primary text-primary-foreground px-8 py-3 text-lg font-semibold hover:scale-105 transition-all duration-300 shadow-strong hover:shadow-medium">
                          <Save className="h-5 w-5 mr-2" />
                          {loading ? 'Updating...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
