import { useEffect } from "react";
import { useLogger } from "@/context/LoggerContext";

const Index = () => {
  const { logAction } = useLogger();

  useEffect(() => {
    logAction("Visited Index Page");
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Your Blank App</h1>
        <p className="text-xl text-muted-foreground">Start building your amazing project here!</p>
      </div>
    </div>
  );
};

export default Index;
