import { useState, useEffect, useRef, useMemo } from "react";
import { useLogger } from "@/context/LoggerContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  MapPin,
  TrendingUp,
  Leaf,
  LogOut,
  Loader2,
  HelpCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchMarketPrices, MarketRecord } from "@/services/marketData";
import { useToast } from "@/hooks/use-toast";

interface DisplayMarketData {
  id: string;
  crop: string;
  variety: string;
  district: string;
  state: string;
  price: number;
}

/* ========= GUIDE LANGUAGE + TRANSLATIONS ========= */

type GuideLanguage = "en" | "hi" | "ml";

const GUIDE_LANGUAGE_LABELS: Record<GuideLanguage, string> = {
  en: "English",
  hi: "हिन्दी",
  ml: "മലയാളം",
};

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
      "Select the language you want to use for this page walkthrough. You can change it anytime from this step.",
    steps: [
      {
        title: "Market Prices",
        body: "Welcome to the Market Prices page! Here you can find live rates for various crops.",
      },
      {
        title: "Search Crops",
        body: "Use this search bar to quickly find specific crops by name.",
      },
      {
        title: "Filter by State",
        body: "Filter the list to show prices only for a specific state.",
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
      "इस पेज की मार्गदर्शिका के लिए भाषा चुनें। आप कभी भी इसी चरण से इसे बदल सकते हैं।",
    steps: [
      {
        title: "मार्केट प्राइस",
        body: "मार्केट प्राइस पेज पर आपका स्वागत है! यहाँ आप विभिन्न फ़सलों के लाइव भाव देख सकते हैं।",
      },
      {
        title: "फ़सल खोजें",
        body: "किसी विशेष फ़सल को नाम से जल्दी ढूँढने के लिए इस सर्च बार का उपयोग करें।",
      },
      {
        title: "राज्य के अनुसार फ़िल्टर",
        body: "केवल किसी खास राज्य के दाम देखने के लिए यहाँ से फ़िल्टर करें।",
      },
    ],
  },
  ml: {
    stepPrefix: "ചുവട്",
    stepOf: "ൽ നിന്ന്",
    skip: "സ്കിപ്പ്",
    back: "തിരികെ",
    next: "അടുത്തത്",
    done: "പൂർത്തിയായി",
    languageStepTitle: "ഗൈഡിന്റെ ഭാഷ തിരഞ്ഞെടുക്കുക",
    languageStepBody:
      "ഈ പേജിലെ ഗൈഡിനായി നിങ്ങൾ ഉപയോഗിക്കാൻ ആഗ്രഹിക്കുന്ന ഭാഷ തിരഞ്ഞെടുക്കുക. ഈ ചുവടിൽ നിന്ന് നിങ്ങൾക്ക് എപ്പോഴും മാറ്റാം.",
    steps: [
      {
        title: "മാർക്കറ്റ് നിരക്കുകൾ",
        body: "മാർക്കറ്റ് നിരക്കുകൾ പേജിലേക്കു സ്വാഗതം! ഇവിടെ വിവിധ വിളകളുടെ ലൈവ് നിരക്കുകൾ കാണാം.",
      },
      {
        title: "വിള തിരയുക",
        body: "ഒരു പ്രത്യേക വിളയുടെ പേര് നൽകി വേഗത്തിൽ കണ്ടെത്താൻ ഈ തിരച്ചിൽ ബാർ ഉപയോഗിക്കുക.",
      },
      {
        title: "സ്റ്റേറ്റ് പ്രകാരം ഫിൽട്ടർ",
        body: "ഒരു പ്രത്യേക സ്റ്റേറ്റിലെ നിരക്കുകൾ മാത്രം കാണാൻ ഇവിടെ നിന്ന് ഫിൽട്ടർ ചെയ്യാം.",
      },
    ],
  },
};

const MarketPrices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [marketData, setMarketData] = useState<DisplayMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logAction } = useLogger();

  // GUIDE language
  const [guideLanguage, setGuideLanguage] = useState<GuideLanguage>("en");
  const gt = GUIDE_TRANSLATIONS[guideLanguage];

  useEffect(() => {
    logAction("Visited Market Prices Page");
  }, []);

  // Log search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm) {
        logAction(`Searched Market Prices: ${searchTerm}`);
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Log filter
  useEffect(() => {
    if (locationFilter !== "all") {
      logAction(`Filtered Market Prices by State: ${locationFilter}`);
    }
  }, [locationFilter]);

  // ========= GUIDE STATE & REFS =========
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [guideInitialized, setGuideInitialized] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  const languageRef = useRef<HTMLButtonElement | null>(null);
  const introRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<HTMLDivElement | null>(null);

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
        id: "intro",
        title: gt.steps[0].title,
        body: gt.steps[0].body,
        ref: introRef,
        isLanguageStep: false,
      },
      {
        id: "search",
        title: gt.steps[1].title,
        body: gt.steps[1].body,
        ref: searchRef,
        isLanguageStep: false,
      },
      {
        id: "state",
        title: gt.steps[2].title,
        body: gt.steps[2].body,
        ref: stateRef,
        isLanguageStep: false,
      },
    ],
    [gt]
  );

  const currentGuideStep = guideSteps[guideStep];
  const isLanguageStep = currentGuideStep.isLanguageStep;

  // ========= MARK GUIDE AS SEEN IN SUPABASE =========
  const markMarketGuideSeen = async () => {
    try {
      if (hasSeenGuide) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ has_seen_market_guide: true })
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to update has_seen_market_guide:", error);
        return;
      }

      setHasSeenGuide(true);
    } catch (e) {
      console.error("Error marking market guide seen:", e);
    }
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

  const openGuideAtStep = (index: number) => {
    setGuideStep(index);
    setGuideOpen(true);
  };

  const closeGuide = () => {
    setGuideOpen(false);
    setGuideStep(0);
    markMarketGuideSeen();
  };

  const nextGuideStep = () => {
    if (guideStep < guideSteps.length - 1) {
      setGuideStep((s) => s + 1);
    } else {
      setGuideOpen(false);
      setGuideStep(0);
      markMarketGuideSeen();
    }
  };

  const prevGuideStep = () => {
    if (guideStep > 0) setGuideStep((s) => s - 1);
  };

  // ========= CHECK PROFILE & AUTO-OPEN GUIDE =========
  useEffect(() => {
    const checkProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("has_seen_market_guide")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setHasSeenGuide(data.has_seen_market_guide || false);
          if (!data.has_seen_market_guide && !guideInitialized) {
            setGuideStep(0);
            setGuideOpen(true);
          }
        }
      }
      setGuideInitialized(true);
    };

    if (!guideInitialized) {
      checkProfile();
    }
  }, [guideInitialized]);

  // ========= DATA FETCH =========
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const records: MarketRecord[] = await fetchMarketPrices();
        console.log("MarketPrices - Full records array from Edge:", records);

        const formattedData: DisplayMarketData[] = records.map(
          (record, index) => ({
            id: `${record.state}-${record.district}-${record.market}-${record.commodity}-${index}`,
            crop: record.commodity || "Unknown",
            variety: record.variety || "Unknown",
            district: record.district || "Unknown",
            state: record.state || "Unknown",
            price: Number(record.modal_price || record.min_price || record.max_price || 0) / 100,
          })
        );
        console.log("MarketPrices - Formatted internal state structure:", formattedData);
        setMarketData(formattedData);
      } catch (error: any) {
        console.error("Error loading market data:", error);
        toast({
          title: "Error",
          description: `Failed to fetch market prices: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const filteredData = marketData.filter(
    (item) =>
      item.crop.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (locationFilter === "all" || item.state === locationFilter)
  );

  const locations = [
    "all",
    ...Array.from(new Set(marketData.map((item) => item.state))),
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in">
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 hover-scale self-start"
            >
              <Leaf className="h-7 w-7 sm:h-8 sm:w-8 text-primary animate-float" />
              <span className="text-lg sm:text-xl font-bold text-foreground">
                AgriAssist
              </span>
            </Link>
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4 mt-2 sm:mt-0">
              {/* Guide button + icon (language step 0) */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openGuide}
                  className="hover:scale-105 transition-all duration-300"
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="hover:scale-105 transition-all duration-300"
              >
                Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="hover:scale-105 transition-all duration-300 hover:text-red-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-4 sm:p-6 lg:p-8">
        <header
          className="mb-8 text-center animate-fade-in"
          ref={introRef}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Market Prices
            </h1>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Show guide for market prices intro"
              onMouseEnter={() => openGuideAtStep(1)}
              onMouseLeave={closeGuide}
              className="hover:bg-transparent"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Stay updated with the latest agricultural commodity prices across
            different regions.
          </p>
        </header>

        <Card className="agri-card shadow-strong hover:shadow-medium transition-all duration-500 animate-fade-in">
          <CardHeader className="bg-gradient-subtle rounded-t-lg pb-8">
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              Live Market Rates
            </CardTitle>
            <div className="mt-6 flex flex-col sm:flex-row gap-6">
              <div className="relative flex-1 group" ref={searchRef}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                <Input
                  placeholder="Search by crop name..."
                  className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                  aria-label="Show guide for crop search"
                  onMouseEnter={() => openGuideAtStep(2)}
                  onMouseLeave={closeGuide}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative flex-1 group" ref={stateRef}>
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary group-focus-within:scale-110 transition-transform duration-200" />
                <Select
                  value={locationFilter}
                  onValueChange={setLocationFilter}
                >
                  <SelectTrigger className="pl-12 h-12 text-lg border-2 focus:ring-2 focus:ring-primary/20 transition-all duration-300 hover:border-primary/50">
                    <SelectValue placeholder="Filter by state" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc === "all" ? "All States" : loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-transparent"
                  aria-label="Show guide for state filter"
                  onMouseEnter={() => openGuideAtStep(3)}
                  onMouseLeave={closeGuide}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-lg text-muted-foreground">
                  Loading market data...
                </span>
              </div>
            ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 no-scrollbar">
              <Table className="min-w-[600px] sm:min-w-full">
                <TableHeader>
                  <TableRow className="hover:bg-muted/50">
                    <TableHead className="text-lg font-semibold">
                      Crop
                    </TableHead>
                    <TableHead className="text-lg font-semibold">
                      Variety
                    </TableHead>
                    <TableHead className="text-lg font-semibold">
                      District
                    </TableHead>
                    <TableHead className="text-lg font-semibold">
                      State
                    </TableHead>
                    <TableHead className="text-right text-lg font-semibold">
                      Price (per Kg)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length > 0 ? (
                    filteredData.map((item, index) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/30 transition-all duration-300 hover:scale-[1.01] animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell className="font-semibold text-lg">
                          {item.crop}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.variety}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.district}
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          {item.state}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xl text-primary">
                          ₹{item.price.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No market data found. Please check your API key or try a
                        different search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GUIDE OVERLAY (same style pattern as other pages) */}
      {guideOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Dim background */}
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />

          {/* Tooltip */}
          <div
            className="absolute bg-card border rounded-xl shadow-xl p-4 w-[320px] pointer-events-auto bg-opacity-100"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            <p className="text-xs text-muted-foreground mb-1">
              {gt.stepPrefix} {guideStep + 1} {gt.stepOf} {guideSteps.length}
            </p>

            <div className="flex items-start gap-3 mb-3">
              <img
                src="/Mascot.png"
                alt="Guide helper"
                className="h-16 w-auto rounded-md flex-shrink-0"
              />
              <div className="flex-1">
                <h2 className="font-semibold text-sm mb-1">
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
              <Button size="sm" variant="ghost" onClick={closeGuide}>
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
                  {guideStep === guideSteps.length - 1 ? gt.done : gt.next}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketPrices;
