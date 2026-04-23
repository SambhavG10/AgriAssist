import React from "react";
import { 
  Calendar, 
  Droplets, 
  Sprout, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCcw,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchAIAdvisory, AIAdvisoryData } from "@/services/aiAdvisory";

interface CropAdvisoryProps {
  crops?: string[];
  location?: string;
}

type AdvisoryCache = Record<string, AIAdvisoryData>;

export const CropAdvisory: React.FC<CropAdvisoryProps> = ({ crops = [], location }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [cache, setCache] = React.useState<AdvisoryCache>({});
  const [loading, setLoading] = React.useState(false);
  const [prefetching, setPrefetching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const activeCrops = crops.length > 0 ? (crops as string[]).filter(c => c && c.trim() !== "") : ["Rice"];
  const currentCrop = activeCrops[currentIndex % activeCrops.length];

  const hasLocation = location && location.trim() !== "" && location !== "Location not specified";

  // Cache-aware fetch function (Updated for localStorage persistence)
  const getAdviceForCrop = async (cropName: string, force = false): Promise<AIAdvisoryData | null> => {
    if (!hasLocation) return null;
    
    // Create a deterministic cache key
    const cacheKey = `agri_adv_${cropName}_${location}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    if (!force) {
      // 1. Check local state cache
      if (cache[cropName]) return cache[cropName];
      
      // 2. Check localStorage for persistent cross-session data
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCache(prev => ({ ...prev, [cropName]: parsed }));
          return parsed;
        } catch (e) {
          console.error("Cache corrupted:", e);
          localStorage.removeItem(cacheKey);
        }
      }
    }

    // 3. Fetch from AI if not found or if forced
    try {
      const advice = await fetchAIAdvisory(cropName, location);
      setCache(prev => ({ ...prev, [cropName]: advice }));
      localStorage.setItem(cacheKey, JSON.stringify(advice));
      return advice;
    } catch (err: any) {
      console.error(`Error fetching AI for ${cropName}:`, err);
      throw err;
    }
  };

  // Main effect to load current crop data
  React.useEffect(() => {
    if (!hasLocation) {
      setCache({});
      return;
    }

    if (cache[currentCrop]) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await getAdviceForCrop(currentCrop);
      } catch (err: any) {
        setError(err.message || "Failed to fetch AI advice.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentCrop, location, hasLocation]);

  // Background synchronization removed per user request for lazy loading
  React.useEffect(() => {
    // Background sync disabled to save API usage and ensure data is only fetched when visible.
  }, []);

  const nextCrop = () => {
    setCurrentIndex((prev) => (prev + 1) % activeCrops.length);
  };

  const prevCrop = () => {
    setCurrentIndex((prev) => (prev - 1 + activeCrops.length) % activeCrops.length);
  };

  const currentData = cache[currentCrop];

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-zinc-950 overflow-hidden group min-h-[350px] relative">
      <CardHeader className="pb-3 border-b border-green-100 dark:border-green-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-green-800 dark:text-green-400">
              <span className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg group-hover:scale-110 transition-transform">🌾</span>
              Your {currentCrop} Guide
            </CardTitle>
            
            {activeCrops.length > 1 && (
              <div className="flex items-center gap-1 ml-4 bg-white/50 dark:bg-zinc-900/50 rounded-full p-1 border border-green-200 dark:border-green-800">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={prevCrop} disabled={loading}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[10px] font-bold px-2 text-green-700 dark:text-green-400">
                  {currentIndex + 1} / {activeCrops.length}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={nextCrop} disabled={loading}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin text-green-600" />}
                {!hasLocation ? (
                <Badge variant="destructive" className="animate-pulse">
                    Location Missing
                </Badge>
                ) : error && !currentData ? (
                    <Badge variant="destructive">Error</Badge>
                ) : currentData ? (
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800 text-green-700 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> AI READY
                </Badge>
                ) : (
                <Badge variant="secondary" className="animate-pulse">
                    Analyzing...
                </Badge>
                )}
            </div>
          </div>
        </div>
        {!hasLocation ? (
          <p className="text-[10px] text-red-500 font-bold mt-1">⚠️ Please update your profile location for AI advice.</p>
        ) : (
          <p className="text-[10px] text-muted-foreground italic mt-1">Based on location: {location}</p>
        )}
      </CardHeader>
      
      <CardContent className="p-0 relative min-h-[250px]">
        {/* Missing Location Overlay */}
        {!hasLocation && (
           <div className="absolute inset-0 bg-zinc-50/80 dark:bg-zinc-950/80 backdrop-blur-sm z-20 flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-3">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Location Missing</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                AI cannot provide advice without knowing your field's location.
              </p>
              <Button variant="outline" size="sm" className="text-[10px] h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={() => window.location.href='/profile'}>
                Set Location in Profile
              </Button>
            </div>
          </div>
        )}

        {/* Error State Overlay */}
        {error && hasLocation && !currentData && (
           <div className="absolute inset-0 bg-white/90 dark:bg-zinc-950/90 z-20 flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Fetch Failed</h3>
                <p className="text-[10px] text-red-500 font-mono bg-red-50 dark:bg-red-950/30 p-2 rounded border border-red-100 break-words overflow-y-auto max-h-[100px]">
                    {error}
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => getAdviceForCrop(currentCrop, true)}>
                <RefreshCcw className="h-3 w-3" /> Retry Fetch
              </Button>
            </div>
          </div>
        )}

        {/* Loading State Overlay */}
        {loading && !currentData && (
          <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold animate-pulse text-green-800 dark:text-green-400">CONNECTING TO AI AGENT...</p>
            </div>
          </div>
        )}
        
        {/* Real Data Display */}
        {currentData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-green-100 dark:divide-green-900/50 transition-all duration-300">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                <Calendar className="h-4 w-4 text-green-600" />
                Timeline
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest">Optimal Sowing</span>
                  <span className="text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 px-3 py-1.5 rounded-lg border border-green-100 dark:border-green-800/50">{currentData.sowing}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest">Harvest Time</span>
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-lg border border-amber-100 dark:border-amber-800/50">{currentData.harvest}</span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                <Droplets className="h-4 w-4 text-blue-600" />
                Irrigation
              </div>
              <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 min-h-[100px]">
                <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed font-medium capitalize">
                  {currentData.irrigation}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                <Sprout className="h-4 w-4 text-emerald-600" />
                Growth Stages
              </div>
              <div className="flex flex-wrap gap-2">
                {currentData.stages.map((stage) => (
                  <Badge key={stage} variant="secondary" className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/50 px-2.5 py-0.5 font-bold uppercase">
                    {stage}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Local Risks
              </div>
              <div className="space-y-2.5">
                {currentData.diseases.map((disease) => (
                  <div key={disease} className="text-[11px] flex items-start gap-2 text-zinc-600 dark:text-zinc-400 group/item hover:text-red-600 transition-colors cursor-default">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1 shrink-0 group-hover/item:scale-125 transition-transform" />
                    <span className="font-medium">{disease}</span>
                  </div>
                ))}
              </div>
              <button className="text-[10px] text-primary hover:underline flex items-center gap-1 font-black pt-2 uppercase tracking-tighter">
                AI Pest Scan <ExternalLink className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        ) : (
          !loading && !error && hasLocation && (
            <div className="h-full flex items-center justify-center text-zinc-400 italic text-xs">
              Initializing AI synchronization...
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
};
