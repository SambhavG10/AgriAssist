import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Bot, Leaf, Users, ShieldCheck, BarChart, CloudRain } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-agriculture.jpg";
import { useEffect } from "react";
import { useLogger } from "@/context/LoggerContext";

// Custom hook for observing elements
import { useInView } from 'react-intersection-observer';
import GTranslateWidget from "@/components/GTranslateWidget";

const AnimatedSection = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <div
      ref={ref}
      className={`${className} transition-all duration-1000 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      {children}
    </div>
  );
};

const Landing = () => {
  const { logAction } = useLogger();

  useEffect(() => {
    logAction("Visited Landing Page");
  }, [logAction]);

  const features = [
    {
      icon: <Bot className="w-8 h-8 text-primary" />,
      title: "AI-Powered Guidance",
      description: "Get instant, expert advice on crop management, pest control, and soil health from our advanced AI.",
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Community Connection",
      description: "Join a network of fellow farmers to share knowledge, ask questions, and grow together.",
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-primary" />,
      title: "Disease Detection",
      description: "Upload a photo of a plant leaf and let our AI identify potential diseases, helping you act fast.",
    },
    {
      icon: <BarChart className="w-8 h-8 text-primary" />,
      title: "Market Insights",
      description: "Stay updated with real-time market prices for your crops to maximize your profits.",
    },
    {
      icon: <CloudRain className="w-8 h-8 text-primary" />,
      title: "Hyperlocal Weather",
      description: "Receive accurate weather forecasts tailored to your specific location to plan your farming activities.",
    },
    {
      icon: <Leaf className="w-8 h-8 text-primary" />,
      title: "Sustainable Practices",
      description: "Learn and implement eco-friendly farming techniques for long-term soil health and better yields.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">AgriAssist</span>
          </Link>
          <nav className="flex items-center space-x-2">
            <GTranslateWidget/>
            <Link to="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button>
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
          <img 
            src={heroImage} 
            alt="Lush green field under a clear sky" 
            className="w-full h-[70vh] object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <AnimatedSection className="text-center text-white p-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 text-shadow-lg">
                Smarter Farming, Greener Future
              </h1>
              <p className="max-w-2xl mx-auto text-lg md:text-xl mb-8 text-shadow">
                Leverage the power of AI to get instant insights, connect with a community of experts, and cultivate a more prosperous harvest.
              </p>
              <Link to="/register">
                <Button size="lg">Join the Agricultural Revolution</Button>
              </Link>
            </AnimatedSection>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Your All-in-One Digital Farming Companion
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From planting to profit, AgriAssist provides the tools you need to succeed in modern agriculture.
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <AnimatedSection key={index}>
                  <Card className="h-full hover:border-primary transition-colors duration-300">
                    <CardHeader>
                      <div className="mb-4">{feature.icon}</div>
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-secondary/50">
          <AnimatedSection className="container text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Ready to Grow with Confidence?
            </h2>
            <p className="mt-4 mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
              Create your free account today and unlock a world of agricultural intelligence.
            </p>
            <Link to="/register">
              <Button size="lg">
                Sign Up for Free <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </AnimatedSection>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col sm:flex-row items-center justify-between py-8">
          <div className="flex items-center space-x-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="font-bold">AgriAssist</span>
          </div>
          <p className="text-sm text-muted-foreground mt-4 sm:mt-0">
            © {new Date().getFullYear()} AgriAssist. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;