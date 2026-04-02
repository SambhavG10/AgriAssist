import { useEffect, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Users,
  Bot,
  TrendingUp,
  Cloud,
  Leaf,
  ArrowRight,
  Calendar,
  MapPin,
  LogOut,
  Settings,
  HelpCircle,
  AlertTriangle,
  Check,
  ChevronsUpDown,
  Plus,
  X,
  LineChart,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BiometricRegistration } from "@/components/BiometricRegistration";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchMarketPrices, MarketRecord } from "@/services/marketData";
import { useLogger } from "@/context/LoggerContext";
import GTranslateWidget from "@/components/GTranslateWidget";
import predictionData from "@/data/prediction.json";

interface Profile {
  full_name: string;
  location: string | { city: string; state: string };
  primary_crops: string[];
  has_seen_dashboard_guide?: boolean;
}

interface WeatherData {
  main: {
    temp: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  }[];
  name: string;
}

type GuideLanguage = "en" | "hi" | "ml";

const GUIDE_LANGUAGE_LABELS: Record<GuideLanguage, string> = {
  en: "English",
  hi: "हिन्दी",
  ml: "മലയാളം",
};

const COMMON_LOCATIONS = [
  "Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Bhopal", "Patna", "Ranchi", "Raipur", "Shimla", "Dehradun", "Srinagar", "Thiruvananthapuram", "Bhubaneswar", "Guwahati", "Panaji", "Gandhinagar", "Indore", "Ludhiana", "Kanpur", "Varanasi", "Agra", "Visakhapatnam", "Coimbatore", "Mysore", "Nagpur"
].sort();

const GUIDE_TRANSLATIONS: Record<
  GuideLanguage,
  {
    stepPrefix: string;
    stepOf: string;
    skip: string;
    back: string;
    next: string;
    done: string;
    languageStepTitle: string;
    languageStepBody: string;
    steps: { title: string; body: string }[];
  }
> = {
  en: {
    stepPrefix: "Step",
    stepOf: "of",
    skip: "Skip",
    back: "Back",
    next: "Next",
    done: "Done",
    languageStepTitle: "Choose your guide language",
    languageStepBody:
      "Select the language you want to use for this walkthrough. You can change it anytime from this step.",
    steps: [
      {
        title: "Profile",
        body: "Manage your personal details, farm information, and crops.",
      },
      {
        title: "AI Assistant",
        body: "Ask farming questions and get AI-powered answers.",
      },
      {
        title: "Community",
        body: "Connect with other farmers and share experiences.",
      },
      {
        title: "Scheme",
        body: "Scheme on one click.",
      },
      {
        title: "Market Prices",
        body: "Check the latest market prices for your crops.",
      },
      {
        title: "Sign Out",
        body: "Securely log out of your account when you’re done.",
      },
    ],
  },
  hi: {
    stepPrefix: "चरण",
    stepOf: "में से",
    skip: "छोड़ें",
    back: "वापस",
    next: "अगला",
    done: "समाप्त",
    languageStepTitle: "मार्गदर्शिका की भाषा चुनें",
    languageStepBody:
      "इस मार्गदर्शिका के लिए भाषा चुनें। आप कभी भी इसी चरण से इसे बदल सकते हैं।",
    steps: [
      {
        title: "प्रोफ़ाइल",
        body: "अपने व्यक्तिगत विवरण, खेत की जानकारी और फ़सलों को प्रबंधित करें।",
      },
      {
        title: "एआई सहायक",
        body: "खेती से जुड़े प्रश्न पूछें और एआई से उत्तर प्राप्त करें।",
      },
      {
        title: "समुदाय",
        body: "अन्य किसानों से जुड़ें और अनुभव साझा करें।",
      },
      {
        title: "चैट रूम",
        body: "विभिन्न खेती विषयों पर रियल-टाइम चर्चा में शामिल हों।",
      },
      {
        title: "बाज़ार भाव",
        body: "अपनी फ़सलों के ताज़ा बाज़ार भाव देखें।",
      },
      {
        title: "साइन आउट",
        body: "काम पूरा होने पर सुरक्षित रूप से लॉग आउट करें।",
      },
    ],
  },
  ml: {
    stepPrefix: "ചുവട്",
    stepOf: "ഇൽ നിന്ന്",
    skip: "സ്കിപ്പ്",
    back: "തിരികെ",
    next: "അടുത്തത്",
    done: "പൂർത്തിയായി",
    languageStepTitle: "ഗൈഡിന്റെ ഭാഷ തിരഞ്ഞെടുക്കുക",
    languageStepBody:
      "ഈ ഗൈഡിനായി നിങ്ങൾക്ക് വേണ്ട ഭാഷ തിരഞ്ഞെടുക്കുക. ഈ ചുവടിൽ നിന്ന് നിങ്ങൾക്ക് എപ്പോൾ വേണമെങ്കിലും മാറ്റാം.",
    steps: [
      {
        title: "പ്രൊഫൈൽ",
        body: "നിങ്ങളുടെ വ്യക്തിഗത വിവരങ്ങളും ഫാം വിവരങ്ങളും വിളകളും നിയന്ത്രിക്കുക.",
      },
      {
        title: "എ.ഐ. അസിസ്റ്റന്റ്",
        body: "കൃഷിയെക്കുറിച്ചുള്ള ചോദ്യങ്ങൾ ചോദിച്ച് എ.ഐ. മറുപടി നേടുക.",
      },
      {
        title: "കമ്മ്യൂണിറ്റി",
        body: "മറ്റു കർഷകരുമായി ബന്ധപ്പെടുകയും അനുഭവങ്ങൾ പങ്കിടുകയും ചെയ്യുക.",
      },
      {
        title: "ചാറ്റ് റൂമുകൾ",
        body: "വിവിധ കൃഷി വിഷയങ്ങളിൽ തത്സമയ ചർച്ചകളിൽ ചേരുക.",
      },
      {
        title: "മാർക്കറ്റ് നിരക്കുകൾ",
        body: "നിങ്ങളുടെ വിളകളുടെ പുതിയ മാർക്കറ്റ് നിരക്കുകൾ കാണുക.",
      },
      {
        title: "സൈൻ ഔട്ട്",
        body: "പണി കഴിഞ്ഞാൽ സുരക്ഷിതമായി ലോഗ് ഔട്ട് ചെയ്യുക.",
      },
    ],
  },
};

const getAdverseCondition = (weather: WeatherData) => {
  if (!weather.weather || weather.weather.length === 0) return null;
  const id = weather.weather[0].id;
  const main = weather.weather[0].main;

  // Thunderstorm (2xx)
  if (id >= 200 && id < 300)
    return {
      type: "Thunderstorm Alert",
      message: "Thunderstorm detected! Take necessary precautions.",
      color: "text-red-700",
      bg: "bg-red-100",
      border: "border-red-200",
    };
  
  // Drizzle (3xx) - usually mild, but can be noted if needed. 
  // We'll skip alert for light drizzle unless user wants it.

  // Rain (5xx)
  // 500: light rain, 501: moderate rain -> maybe no alert?
  // 502: heavy intensity rain, 503: very heavy rain, 504: extreme rain
  // 511: freezing rain
  // 520: light intensity shower rain, 521: shower rain, 522: heavy intensity shower rain, 531: ragged shower rain
  if ([502, 503, 504, 511, 522, 531].includes(id))
    return {
      type: "Heavy Rain Alert",
      message: "Heavy rain detected! Protect your crops from waterlogging.",
      color: "text-orange-700",
      bg: "bg-orange-100",
      border: "border-orange-200",
    };

  // Snow (6xx)
  if (id >= 600 && id < 700)
    return {
      type: "Snow Alert",
      message: "Snowfall detected! Check for frost damage.",
      color: "text-blue-700",
      bg: "bg-blue-100",
      border: "border-blue-200",
    };

  // Atmosphere (7xx)
  // 711: Smoke, 721: Haze, 731: Dust, 741: Fog, 751: Sand, 761: Dust, 762: Ash, 771: Squall, 781: Tornado
  if (id === 771 || id === 781)
    return {
      type: "Severe Weather Alert",
      message: "Severe weather conditions (Squall/Tornado)! Seek shelter.",
      color: "text-red-800",
      bg: "bg-red-200",
      border: "border-red-300",
    };

  if ([731, 751, 761, 762].includes(id))
    return {
      type: "Dust/Sand Storm Alert",
      message: "Dust/Sand storm detected! Protect sensitive crops.",
      color: "text-yellow-700",
      bg: "bg-yellow-100",
      border: "border-yellow-200",
    };

  return null;
};

const Dashboard = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [openLocation, setOpenLocation] = useState(false);
  const [cropPrices, setCropPrices] = useState<Record<string, number>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const [newCrop, setNewCrop] = useState("");
  const [isAddingCrop, setIsAddingCrop] = useState(false);

  // Predictive Model State
  const [predictionOpen, setPredictionOpen] = useState(false);
  const [predState, setPredState] = useState("");
  const [predStartMonth, setPredStartMonth] = useState("");
  const [predEndMonth, setPredEndMonth] = useState("");
  const [predictionResult, setPredictionResult] = useState<string | null>(null);
  const [showPredictionOverlay, setShowPredictionOverlay] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePredictionSubmit = async () => {
    if (!predState || !predStartMonth || !predEndMonth) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    
    logAction(`Ran Predictive Model: ${predState}, ${predStartMonth} to ${predEndMonth}`);
    toast({
      title: "Gathering Data...",
      description: `Fetching weather and soil data for ${predState}...`,
    });

    try {
        // 1. Fetch Weather (Temperature)
        const weatherRes = await fetch(`/api/weather?location=${encodeURIComponent(predState)}`);
        let temperature = 25; // Default fallback
        if (weatherRes.ok) {
            const weatherData = await weatherRes.json();
            if (weatherData.main && weatherData.main.temp) {
                temperature = weatherData.main.temp;
            }
        }

        // 2. Fetch Soil Data from JSON
        // @ts-ignore
        const soilData = predictionData[predState] || {};
        
        const { N, P, K, pH, rainfall, humidity } = soilData;

        // 3. Prepare Model Input
        const modelInput = {
            state: predState,
            start_month: predStartMonth,
            end_month: predEndMonth,
            temperature: temperature,
            N, 
            P, 
            K, 
            pH, 
            rainfall, 
            humidity
        };

        console.log("Model Input Prepared:", modelInput);

        // 4. Give to Model
        const API_URL ="http://127.0.0.1:8000"; // Replace with your actual API endpoint

        try {
            const payload = {
                N: Number(N),
                P: Number(P),
                K: Number(K),
                temperature: Number(temperature),
                humidity: Number(humidity),
                ph: Number(pH),
                rainfall: Number(rainfall)
            };
      
            const res = await fetch(API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
            });
            
            if (!res.ok) {
                throw new Error(`Server error: ${res.status}`);
            }
      
            const data = await res.json();
            
            const result = data.prediction || data.crop || JSON.stringify(data);
            setPredictionResult(result);
            setShowPredictionOverlay(true);
            setPredictionOpen(false);
            
            toast({
                title: "Prediction Complete",
                description: "Check the result on screen.",
            });

        } catch (apiError) {
            console.error("Prediction API Error:", apiError);
            
            // Fallback to simulation if API fails
            console.log("Falling back to simulation mode...");
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
            
            const mockCrops = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Tea", "Coffee"];
            const randomCrop = mockCrops[Math.floor(Math.random() * mockCrops.length)];
            
            setPredictionResult(randomCrop);
            setShowPredictionOverlay(true);
            setPredictionOpen(false);

            toast({
                title: "Prediction (Simulation)",
                description: "API unreachable. Showing simulated result.",
            });
        }

    } catch (error) {
        console.error("Prediction Error:", error);
        toast({
            title: "Error",
            description: "Failed to generate prediction.",
            variant: "destructive",
        });
    }

    setPredictionOpen(false);
  };

  const handleAddCrop = async () => {
    if (!newCrop.trim() || !profile) return;
    
    const currentCrops = profile.primary_crops || [];
    // Check if crop already exists (case-insensitive)
    if (currentCrops.some(c => c.toLowerCase() === newCrop.trim().toLowerCase())) {
        toast({
            title: "Duplicate Crop",
            description: "This crop is already in your list.",
            variant: "destructive",
        });
        return;
    }

    const updatedCrops = [...currentCrops, newCrop.trim()];
    // Remove duplicates and empty strings just in case
    const uniqueCrops = Array.from(new Set(updatedCrops)).filter(c => c && c.trim() !== "");

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({ primary_crops: uniqueCrops })
            .eq('user_id', user.id);

        if (error) throw error;

        setProfile({ ...profile, primary_crops: uniqueCrops });
        setNewCrop("");
        setIsAddingCrop(false);
        toast({
            title: "Success",
            description: "Crop added successfully",
        });
    } catch (error) {
        console.error("Error updating crops:", error);
        toast({
            title: "Error",
            description: "Failed to update crops",
            variant: "destructive",
        });
    }
  };

  const handleRemoveCrop = async (cropToRemove: string) => {
    if (!profile) return;
    
    const updatedCrops = (profile.primary_crops || []).filter(c => c !== cropToRemove);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('profiles')
            .update({ primary_crops: updatedCrops })
            .eq('user_id', user.id);

        if (error) throw error;

        setProfile({ ...profile, primary_crops: updatedCrops });
        toast({
            title: "Removed",
            description: "Crop removed successfully",
        });
    } catch (error) {
        console.error("Error removing crop:", error);
        toast({
            title: "Error",
            description: "Failed to remove crop",
            variant: "destructive",
        });
    }
  };
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [guideLanguage, setGuideLanguage] = useState<GuideLanguage>("en");
  const gt = GUIDE_TRANSLATIONS[guideLanguage];

  // ========= GUIDE STATE & REFS =========
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [guideInitialized, setGuideInitialized] = useState(false);

  const languageRef = useRef<HTMLButtonElement | null>(null);
  const profileRef = useRef<HTMLButtonElement | null>(null);
  const aiRef = useRef<HTMLDivElement | null>(null);
  const communityRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const marketRef = useRef<HTMLDivElement | null>(null);
  const logoutRef = useRef<HTMLButtonElement | null>(null);
  const hasLoggedInit = useRef(false);
  const { logAction } = useLogger();

  const guideSteps = useMemo(
    () => [
      {
        id: "language",
        title: gt.languageStepTitle,
        body: gt.languageStepBody,
        ref: languageRef,
        isLanguageStep: true,
      },
      {
        id: "profile",
        title: gt.steps[0].title,
        body: gt.steps[0].body,
        ref: profileRef,
        isLanguageStep: false,
      },
      {
        id: "ai",
        title: gt.steps[1].title,
        body: gt.steps[1].body,
        ref: aiRef,
        isLanguageStep: false,
      },
      {
        id: "community",
        title: gt.steps[2].title,
        body: gt.steps[2].body,
        ref: communityRef,
        isLanguageStep: false,
      },
      {
        id: "chat",
        title: gt.steps[3].title,
        body: gt.steps[3].body,
        ref: chatRef,
        isLanguageStep: false,
      },
      {
        id: "market",
        title: gt.steps[4].title,
        body: gt.steps[4].body,
        ref: marketRef,
        isLanguageStep: false,
      },
      {
        id: "logout",
        title: gt.steps[5].title,
        body: gt.steps[5].body,
        ref: logoutRef,
        isLanguageStep: false,
      },
    ],
    [gt]
  );

  const markDashboardGuideSeen = async () => {
    try {
      if (profile?.has_seen_dashboard_guide) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ has_seen_dashboard_guide: true })
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to update has_seen_dashboard_guide:", error);
        return;
      }

      setProfile((prev) =>
        prev ? { ...prev, has_seen_dashboard_guide: true } : prev
      );
    } catch (e) {
      console.error("Error marking dashboard guide seen:", e);
    }
  };

  const openGuideAtStep = (index: number) => {
    setGuideStep(index);
    setGuideOpen(true);
  };

  // ========= POSITION TOOLTIP =========
  useEffect(() => {
    if (!guideOpen) return;

    const step = guideSteps[guideStep];
    const el = step.ref.current;
    if (!el) {
      setTooltipPos({
        top: window.scrollY + window.innerHeight / 2 - 120,
        left: window.scrollX + window.innerWidth / 2 - 160,
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const tooltipWidth = 340;
    const padding = 12;

    let left = rect.left + window.scrollX;

    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    setTooltipPos({
      top: rect.bottom + window.scrollY + 8,
      left,
    });
  }, [guideOpen, guideStep, guideSteps]);

  const openGuide = () => {
    setGuideStep(0);
    setGuideOpen(true);
  };

  const closeGuide = () => {
    setGuideOpen(false);
    setGuideStep(0);
  };

  const nextGuideStep = () => {
    if (guideStep < guideSteps.length - 1) {
      setGuideStep((s) => s + 1);
    } else {
      setGuideOpen(false);
      setGuideStep(0);
      markDashboardGuideSeen();
    }
  };

  const prevGuideStep = () => {
    if (guideStep > 0) setGuideStep((s) => s - 1);
  };

  // ========= AUTO-OPEN GUIDE FIRST TIME =========
  useEffect(() => {
    if (!profile) return;
    if (guideInitialized) return;

    if (!profile.has_seen_dashboard_guide) {
      setGuideStep(0);
      setGuideOpen(true);
    }

    setGuideInitialized(true);
  }, [profile, guideInitialized]);

  useEffect(() => {
    const fetchProfileAndWeather = async () => {
      try {
        if (!hasLoggedInit.current) {
          logAction("Initializing Dashboard: Verifying User Session...");
          hasLoggedInit.current = true;
        }

        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (user) {
          logAction("User Authenticated. Fetching Profile Data...", user.id);
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (error) {
            console.error("Error fetching profile:", error);
            toast({
              title: "Error",
              description: "Could not fetch your profile data.",
              variant: "destructive",
            });
          } else {
            let locationStr: string | null = null;
            if (
              typeof data.location === "object" &&
              data.location !== null &&
              "city" in data.location
            ) {
              locationStr =
                typeof data.location.city === "string"
                  ? data.location.city
                  : String(data.location.city);
            } else if (typeof data.location === "string") {
              try {
                const parsed = JSON.parse(data.location);
                if (parsed && typeof parsed === "object" && "city" in parsed) {
                  locationStr =
                    typeof parsed.city === "string"
                      ? parsed.city
                      : String(parsed.city);
                } else {
                  locationStr = data.location;
                }
              } catch {
                locationStr = data.location;
              }
            }

            function normalizeLocation(
              loc: any
            ): string | { city: string; state: string } {
              if (typeof loc === "string") {
                try {
                  const parsed = JSON.parse(loc);
                  if (
                    parsed &&
                    typeof parsed === "object" &&
                    "city" in parsed &&
                    "state" in parsed
                  ) {
                    return {
                      city: String(parsed.city),
                      state: String(parsed.state),
                    };
                  }
                  return loc;
                } catch {
                  return loc;
                }
              }
              if (
                typeof loc === "object" &&
                loc !== null &&
                "city" in loc &&
                "state" in loc
              ) {
                return { city: String(loc.city), state: String(loc.state) };
              }
              return String(loc);
            }
            setProfile({
              full_name: data.full_name,
              location: normalizeLocation(data.location),
              primary_crops: data.primary_crops || [],
              has_seen_dashboard_guide: data.has_seen_dashboard_guide ?? false,
            });

            if (locationStr) {
              setSelectedLocation(locationStr);
            }
          }
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Dashboard initialization error:", error);
        toast({
          title: "Error",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndWeather();
  }, [navigate, toast, logAction]);

  useEffect(() => {
    const fetchWeather = async () => {
      if (!selectedLocation) return;
      try {
        logAction(`Connecting to Weather API for ${selectedLocation}...`);
        const response = await fetch(
          `/api/weather?location=${encodeURIComponent(selectedLocation)}`
        );
        if (response.ok) {
          const weatherData = await response.json();
          setWeather(weatherData);
        } else {
          const errorData = await response.json();
          console.error("Error fetching weather:", errorData);
          toast({
            title: "Weather Error",
            description: errorData.message || "Could not fetch weather data.",
            variant: "destructive",
          });
        }
      } catch (e) {
        console.error("Failed to fetch weather", e);
        toast({
          title: "Weather Error",
          description: "An unexpected error occurred while fetching weather data.",
          variant: "destructive",
        });
      }
    };

    fetchWeather();
  }, [selectedLocation, toast, logAction]);

  // Check for weather alerts and show toast
  useEffect(() => {
    if (weather) {
      const alert = getAdverseCondition(weather);
      if (alert) {
        toast({
          title: alert.type,
          description: alert.message,
          variant: "destructive", // Use destructive for high visibility
          duration: 6000,
        });
      }
    }
  }, [weather, toast]);

  useEffect(() => {
    const loadCropPrices = async () => {
      const validCrops = profile?.primary_crops?.filter(c => c && c.trim() !== "") || [];

      if (validCrops.length > 0) {
        setPricesLoading(true);
        try {
          const records: MarketRecord[] = await fetchMarketPrices(100);
          const prices: Record<string, number> = {};

          validCrops.forEach((crop) => {
            const cropRecords = records.filter((r) =>
              r.commodity.toLowerCase().includes(crop.toLowerCase())
            );

            if (cropRecords.length > 0) {
              const total = cropRecords.reduce(
                (sum, r) => sum + Number(r.modal_price),
                0
              );
              prices[crop] = total / cropRecords.length;
            }
          });
          setCropPrices(prices);
        } catch (error) {
          console.error("Error fetching crop prices:", error);
        } finally {
          setPricesLoading(false);
        }
      }
    };

    loadCropPrices();
  }, [profile]);

  const handleSignOut = async () => {
    logAction("Terminating Session: Signing out...");
    await supabase.auth.signOut();
    navigate("/login");
  };

  const recentActivity = [
    {
      id: 1,
      type: "chat",
      title: "Asked about leaf spot disease",
      time: "2 hours ago",
    },
    {
      id: 2,
      type: "forum",
      title: "Posted in Rice Cultivation group",
      time: "1 day ago",
    },
    {
      id: 3,
      type: "ai",
      title: "Got pest identification help",
      time: "3 days ago",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const currentGuideStep = guideSteps[guideStep];
  const isLanguageStep = currentGuideStep.isLanguageStep;

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Leaf className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">
                AgriAssist
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Settings</DialogTitle>
                    <DialogDescription>
                      Manage your account settings and preferences.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <h3 className="text-sm font-medium mb-2">Security</h3>
                    <BiometricRegistration />
                  </div>
                </DialogContent>
              </Dialog>

              {/* Guide button + icon (language step 0) */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openGuide}
                  ref={languageRef}
                >
                  Guide
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onMouseEnter={() => openGuideAtStep(0)}
                  onMouseLeave={closeGuide}
                  aria-label="Show guide language step"
                  className="hover:bg-transparent"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* Profile button + icon (step 1) */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/profile")}
                  ref={profileRef}
                >
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onMouseEnter={() => openGuideAtStep(1)}
                  onMouseLeave={closeGuide}
                  aria-label="Show guide for profile"
                  className="hover:bg-transparent"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* Sign Out button + icon (step 6) */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  ref={logoutRef}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onMouseEnter={() => openGuideAtStep(6)}
                  onMouseLeave={closeGuide}
                  aria-label="Show guide for sign out"
                  className="hover:bg-transparent"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
              <GTranslateWidget/>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back, {profile?.full_name || "User"}!
              </h1>
              <div className="flex items-center space-x-4 text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {typeof profile?.location === "object" &&
                    profile.location ? (
                      `${profile.location.city}, ${profile.location.state}`
                    ) : typeof profile?.location === "string" ? (
                      profile.location
                    ) : (
                      "No location set"
                    )}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Today,{" "}
                    {new Date().toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {profile?.primary_crops?.filter(c => c && c.trim() !== "").map((crop) => (
                <Badge
                  key={crop}
                  variant="secondary"
                  className="bg-primary/10 text-primary flex items-center gap-1 pr-1"
                >
                  {crop}
                  <button 
                    onClick={() => handleRemoveCrop(crop)}
                    className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              
              {isAddingCrop ? (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                    <input
                        type="text"
                        value={newCrop}
                        onChange={(e) => setNewCrop(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCrop();
                            if (e.key === 'Escape') setIsAddingCrop(false);
                        }}
                        placeholder="Crop name..."
                        className="h-6 w-32 text-xs rounded-md border border-input bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                        autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleAddCrop}>
                        <Check className="h-4 w-4 text-green-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsAddingCrop(false)}>
                        <X className="h-4 w-4 text-red-500" />
                    </Button>
                </div>
              ) : (
                <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 px-2 text-xs border-dashed"
                    onClick={() => setIsAddingCrop(true)}
                >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Crop
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/chat" onClick={() => logAction("Navigating to AI Assistant...")}>
            <Card
              className="agri-card hover:shadow-medium transition-smooth cursor-pointer relative"
              ref={aiRef}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 hover:bg-transparent"
                onMouseEnter={() => openGuideAtStep(2)}
                onMouseLeave={closeGuide}
                aria-label="Show guide for AI assistant"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                    <Bot className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      AI Assistant
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Ask farming questions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/community" onClick={() => logAction("Connecting to Community Forum...")}>
            <Card
              className="agri-card hover:shadow-medium transition-smooth cursor-pointer relative"
              ref={communityRef}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 hover:bg-transparent"
                onMouseEnter={() => openGuideAtStep(3)}
                onMouseLeave={closeGuide}
                aria-label="Show guide for community"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-secondary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Community
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Connect with farmers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/chat-rooms" onClick={() => logAction("Loading Real-time Schemes...")}>
            <Card
              className="agri-card hover:shadow-medium transition-smooth cursor-pointer relative"
              ref={chatRef}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 hover:bg-transparent"
                onMouseEnter={() => openGuideAtStep(4)}
                onMouseLeave={closeGuide}
                aria-label="Show guide for Schemes"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Schemes
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Schemes at one click
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/market-prices" onClick={() => logAction("Fetching Latest Market Prices (APIs)...")}>
            <Card
              className="agri-card hover:shadow-medium transition-smooth cursor-pointer relative"
              ref={marketRef}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 hover:bg-transparent"
                onMouseEnter={() => openGuideAtStep(5)}
                onMouseLeave={closeGuide}
                aria-label="Show guide for market prices"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Market Prices
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Check current rates
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Dialog open={predictionOpen} onOpenChange={setPredictionOpen}>
            <DialogTrigger asChild>
              <Card
                className="agri-card hover:shadow-medium transition-smooth cursor-pointer relative"
                onClick={() => logAction("Opened Predictive Model Form")}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <LineChart className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        Predictive Model
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Forecast crop yields
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Predictive Model Input</DialogTitle>
                <DialogDescription>
                  Enter the details below to generate a cultivation forecast.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="state">Location (State)</Label>
                  <Select value={predState} onValueChange={setPredState}>
                    <SelectTrigger id="state">
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-month">Start Month</Label>
                    <Select value={predStartMonth} onValueChange={setPredStartMonth}>
                      <SelectTrigger id="start-month">
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-month">End Month</Label>
                    <Select value={predEndMonth} onValueChange={setPredEndMonth}>
                      <SelectTrigger id="end-month">
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handlePredictionSubmit}>Generate Prediction</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Weather Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Weather
                  </CardTitle>
                  <Cloud className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <Popover open={openLocation} onOpenChange={setOpenLocation}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openLocation}
                          className="w-full justify-between"
                        >
                          {selectedLocation
                            ? selectedLocation
                            : "Select location..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput placeholder="Search location..." />
                          <CommandList>
                            <CommandEmpty>No location found.</CommandEmpty>
                            <CommandGroup>
                              {selectedLocation &&
                                !COMMON_LOCATIONS.includes(selectedLocation) && (
                                  <CommandItem
                                    key={selectedLocation}
                                    value={selectedLocation}
                                    onSelect={(currentValue) => {
                                      setSelectedLocation(selectedLocation);
                                      setOpenLocation(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedLocation === selectedLocation
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {selectedLocation}
                                  </CommandItem>
                                )}
                              {COMMON_LOCATIONS.map((loc) => (
                                <CommandItem
                                  key={loc}
                                  value={loc}
                                  onSelect={(currentValue) => {
                                    setSelectedLocation(loc);
                                    setOpenLocation(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedLocation === loc
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {loc}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  {weather ? (
                    <div className="flex items-center space-x-4">
                      <img
                        src={`http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                        alt={weather.weather[0].description}
                        className="w-16 h-16"
                      />
                      <div>
                        <div className="text-4xl font-bold">
                          {Math.round(weather.main.temp)}°C
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">
                          {weather.weather[0].description} in {weather.name}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {profile?.location
                        ? "Loading weather..."
                        : "Set your location in profile to see weather."}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Tip of the Day Card */}
              <Card className="agri-card">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Tip of the Day
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Use drip irrigation to save water and reduce weed growth.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="agri-card mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Recent Activity
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 sm:space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-smooth"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        {activity.type === "chat" && (
                          <MessageCircle className="h-4 w-4 text-primary" />
                        )}
                        {activity.type === "forum" && (
                          <Users className="h-4 w-4 text-primary" />
                        )}
                        {activity.type === "ai" && (
                          <Bot className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.time}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Crop Analytics */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Crop Analytics
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {profile?.primary_crops && profile.primary_crops.filter(c => c && c.trim() !== "").length > 0 ? (
                  <div className="space-y-4">
                    {profile.primary_crops.filter(c => c && c.trim() !== "").map((crop) => {
                      const price = cropPrices[crop];
                      return (
                        <div key={crop}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium">{crop}</span>
                            <span className="text-sm font-bold text-primary">
                              {pricesLoading ? (
                                <span className="text-xs text-muted-foreground animate-pulse">
                                  Loading...
                                </span>
                              ) : price ? (
                                `₹${(price / 100).toFixed(2)}/kg`
                              ) : (
                                "N/A"
                              )}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div
                              className="bg-primary h-2.5 rounded-full transition-all duration-500"
                              style={{ width: price ? "100%" : "0%" }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Avg. Market Price
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add primary crops to your profile to see analytics.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* GUIDE OVERLAY + TOOLTIP */}
      {guideOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Dim background, but non-interactive so ? hover still works */}
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />

          <div
            className="absolute bg-card border border-border rounded-xl shadow-xl p-4 w-[320px] pointer-events-auto bg-opacity-100"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            <p className="text-xs text-muted-foreground mb-2">
              {gt.stepPrefix} {guideStep + 1} {gt.stepOf}{" "}
              {guideSteps.length}
            </p>

            <div className="flex items-start gap-3 mb-3">
              <img
                src="/Mascot.png"
                alt="Guide helper"
                className="h-20 w-auto rounded-md flex-shrink-0"
              />
              <div className="flex-1">
                <h2 className="font-semibold text-sm mb-2">
                  {isLanguageStep
                    ? gt.languageStepTitle
                    : currentGuideStep.title}
                </h2>
                <p className="text-xs mb-3">
                  {isLanguageStep
                    ? gt.languageStepBody
                    : currentGuideStep.body}
                </p>

                {isLanguageStep && (
                  <div className="flex flex-wrap gap-2">
                    {(["en", "hi", "ml"] as GuideLanguage[]).map((lang) => (
                      <Button
                        key={lang}
                        size="sm"
                        variant={
                          guideLanguage === lang ? "default" : "outline"
                        }
                        onClick={() => setGuideLanguage(lang)}
                      >
                        {GUIDE_LANGUAGE_LABELS[lang]}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  closeGuide();
                  markDashboardGuideSeen();
                }}
              >
                {gt.skip}
              </Button>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={guideStep === 0}
                  onClick={prevGuideStep}
                >
                  {gt.back}
                </Button>
                <Button size="sm" onClick={nextGuideStep}>
                  {guideStep === guideSteps.length - 1
                    ? gt.done
                    : gt.next}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Overlay */}
      {showPredictionOverlay && predictionResult && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer animate-in fade-in duration-300"
          onClick={() => setShowPredictionOverlay(false)}
        >
          <div className="transform transition-all animate-in zoom-in-95 duration-300">
            <div className="bg-background/95 p-12 rounded-3xl shadow-2xl border-2 border-primary/20 text-center max-w-3xl mx-4 backdrop-blur-md">
              <h3 className="text-3xl font-medium text-muted-foreground mb-6">Recommended Crop</h3>
              <h1 className="text-7xl font-black text-primary tracking-tight mb-4 drop-shadow-sm">
                {predictionResult}
              </h1>
              <p className="text-base text-muted-foreground mt-8 font-medium">
                Click anywhere to close
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard