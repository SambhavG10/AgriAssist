import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Leaf,
  Mail,
  Lock,
  User,
  MapPin,
  Fingerprint
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  startAuthentication,
  startRegistration
} from "@simplewebauthn/browser";
import { useLogger } from "@/context/LoggerContext";

interface AuthProps {
  mode: "login" | "register";
}

const Auth = ({ mode }: AuthProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  const isLogin = mode === "login";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useLogger();

  useEffect(() => {
    if (window.PublicKeyCredential) {
      setIsBiometricSupported(true);
    }
    logAction(`Visited ${isLogin ? "Login" : "Register"} Page`);
  }, [isLogin, logAction]);

  const generateStrongPassword = () => {
    // crypto.randomUUID() is already strong; add some chars for complexity
    return crypto.randomUUID() + "!Aa1";
  };

  /**
   * NORMAL EMAIL/PASSWORD SUBMIT
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    logAction(`Attempting ${isLogin ? "Login" : "Registration"}...`);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          toast({
            title: "Error signing in",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Signed in successfully!",
            description: "Redirecting you to your dashboard."
          });
          navigate("/dashboard");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              location: location
            }
          }
        });

        if (error) {
          toast({
            title: "Error signing up",
            description: error.message,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Registration Successful",
            description:
              "User registered successfully. You can now log in."
          });
          navigate("/login");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * BIOMETRIC LOGIN
   * - No email required.
   * - If email is typed, it's sent to backend (optional).
   */
  const handleBiometricLogin = async () => {
    logAction("Biometric Login Initiated...");
    try {
      // 1. Get login options from backend
      const resp = await fetch("/api/auth/login-challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          email && email.trim().length > 0 ? { email: email.trim() } : {}
        )
      });

      if (!resp.ok) {
        let msg = `Status: ${resp.status}`;
        try {
          const err = await resp.json();
          msg += ` - ${err.error || JSON.stringify(err)}`;
        } catch {
          const text = await resp.text();
          msg += ` - ${text}`;
        }
        throw new Error(msg);
      }

      const { options, token } = await resp.json();

      // 2. Start WebAuthn auth (biometric)
      const authResp = await startAuthentication(options);

      // 3. Verify on backend
      const payload: any = {
        response: authResp,
        token
      };

      if (email && email.trim().length > 0) {
        payload.email = email.trim();
      }

      const verifyResp = await fetch("/api/auth/login-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const verifyResult = await verifyResp.json();
      if (verifyResult.verified && verifyResult.sessionUrl) {
        window.location.href = verifyResult.sessionUrl;
      } else {
        throw new Error("Verification failed");
      }
    } catch (error: any) {
      const msg =
        error.message || "Could not sign in with biometrics.";
      toast({
        title: "Biometric Login Failed",
        description: msg,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 hover-scale"
          >
            <Leaf className="h-8 w-8 sm:h-10 sm:w-10 text-primary animate-float" />
            <span className="text-2xl sm:text-3xl font-bold text-foreground">
              AgriAssist
            </span>
          </Link>
        </div>

        <Card className="agri-card shadow-strong hover:shadow-medium transition-all duration-500 animate-fade-in">
          <CardHeader className="text-center bg-gradient-subtle rounded-t-lg pb-6 sm:pb-8">
            <CardTitle className="text-2xl sm:text-3xl font-bold">
              {isLogin ? "Welcome Back" : "Create Your Account"}
            </CardTitle>
            <CardDescription className="text-base sm:text-lg mt-2">
              {isLogin
                ? "Sign in to access your agricultural assistant"
                : "Join the farming community and get AI-powered assistance"}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {!isLogin && (
                <div className="space-y-3">
                  <Label
                    htmlFor="fullName"
                    className="text-lg font-medium"
                  >
                    Full Name
                  </Label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label
                  htmlFor="email"
                  className="text-lg font-medium"
                >
                  Email
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="password"
                  className="text-lg font-medium"
                >
                  Password
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={isLogin ? "Enter your password" : "Create a password"}
                    className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-3">
                  <Label
                    htmlFor="location"
                    className="text-lg font-medium"
                  >
                    Location
                  </Label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                    <Input
                      id="location"
                      placeholder="Enter your location (e.g., Kochi, Kerala)"
                      className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full gradient-primary text-primary-foreground hover:scale-105 transition-all duration-300 shadow-strong hover:shadow-medium h-12 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Please wait...</span>
                  </div>
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>

              <div className="mt-4">
                {isBiometricSupported && isLogin && (
                  <>
                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-12 text-lg border-2 hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all duration-300"
                      onClick={handleBiometricLogin}
                      disabled={isLoading}
                    >
                      <Fingerprint className="mr-2 h-5 w-5" />
                      Biometrics / Passkey
                    </Button>
                  </>
                )}
              </div>
            </form>

            <div className="mt-8">
              <Separator className="my-6" />
              <div className="text-center">
                <p className="text-muted-foreground">
                  {isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <Link
                    to={isLogin ? "/register" : "/login"}
                    className="text-primary hover:underline font-semibold text-lg hover:scale-105 inline-block transition-all duration-200"
                  >
                    {isLogin ? "Sign up" : "Sign in"}
                  </Link>
                </p>
              </div>
            </div>

            {isLogin && (
              <div className="text-center mt-6">
                <Link
                  to="/forgot-password"
                  className="text-muted-foreground hover:text-primary transition-all duration-300 hover:scale-105 inline-block"
                >
                  Forgot your password?
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <div className="text-center mt-8 animate-fade-in">
          <p className="text-muted-foreground bg-card/50 backdrop-blur-sm rounded-lg p-4 border border-border">
            🌱 Authentication is now connected to Supabase and supports
            passkey / biometric sign-up and sign-in.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;