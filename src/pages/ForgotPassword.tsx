import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLogger } from "@/context/LoggerContext";

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const { logAction } = useLogger();

  useEffect(() => {
    logAction("Visited Forgot Password Page");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    logAction("Requested Password Reset");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Error sending reset link",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Reset link sent!",
        description: "Please check your email for a link to reset your password.",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <Link to="/" className="inline-flex items-center space-x-2 hover-scale">
            <Leaf className="h-10 w-10 text-primary animate-float" />
            <span className="text-3xl font-bold text-foreground">AgriAssist</span>
          </Link>
        </div>

        <Card className="agri-card shadow-strong hover:shadow-medium transition-all duration-500 animate-fade-in">
          <CardHeader className="text-center bg-gradient-subtle rounded-t-lg pb-8">
            <CardTitle className="text-3xl font-bold">
              Forgot Your Password?
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Enter your email and we'll send you a reset link.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-lg font-medium">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email" 
                    className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full gradient-primary text-primary-foreground hover:scale-105 transition-all duration-300 shadow-strong hover:shadow-medium h-12 text-lg font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>

            <div className="text-center mt-6">
              <Link 
                to="/login" 
                className="text-primary hover:underline font-semibold text-lg hover:scale-105 inline-block transition-all duration-200"
              >
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
