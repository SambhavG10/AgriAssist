import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Leaf, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLogger } from "@/context/LoggerContext";

const ResetPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useLogger();

  useEffect(() => {
    logAction("Visited Reset Password Page");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please ensure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading(true);
    logAction("Attempting Password Reset");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: "Error resetting password",
        description: error.message,
        variant: "destructive",
      });
    } else {
      logAction("Password Reset Successfully");
      toast({
        title: "Password reset successfully!",
        description: "You can now sign in with your new password.",
      });
      navigate('/login');
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
              Reset Your Password
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Enter a new password for your account.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="password" className="text-lg font-medium">New Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your new password" 
                    className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-lg font-medium">Confirm New Password</Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="Confirm your new password" 
                    className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    <span>Resetting...</span>
                  </div>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
