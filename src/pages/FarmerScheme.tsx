import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// JSON data (decision tree + schemes)
import decisionTreeJson from "@/data/decisionTree.json";
import schemesJson from "@/data/schemes.json";

/* ========= TYPES FOR SCHEMES ========= */

type SchemeDetails = {
  id: string;
  name: string;
  ministry: string;
  description: string;
  maxIncome?: number | null;
  maxLandHa?: number | null;
  locationNotes?: string | null;
  eligibleCrops?: string[];
  benefits?: string;
  howToApply?: string;
};

const schemes = schemesJson as SchemeDetails[];

const schemeMap: Record<string, SchemeDetails> = Object.fromEntries(
  schemes.map((s) => [s.id, s])
);

/* ========= TYPES FOR TREE ========= */

type ConditionalScheme = {
  scheme_id: string;
  condition: string;
};

type LeafNode = {
  type: "leaf";
  sno: number;
  core_schemes: string[];
  conditional_schemes: ConditionalScheme[];
};

type DecisionNode = {
  type: "decision";
  field: string;
  yes: TreeNode;
  no: TreeNode;
  field_type?: string;
  question?: string;
};

type TreeNode = LeafNode | DecisionNode;

// cast JSON into typed node


const decisionTree = decisionTreeJson as unknown as TreeNode;

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
      "Select the language you want to use for this schemes walkthrough. You can change it anytime from this step.",
    steps: [
      {
        title: "Schemes Eligibility Checker",
        body: "This page helps you quickly find major central schemes you may be eligible for.",
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
      "इस योजना मार्गदर्शिका के लिए भाषा चुनें। आप कभी भी इसी चरण से इसे बदल सकते हैं।",
    steps: [
      {
        title: "योजना पात्रता जांच",
        body: "यह पेज आपको जल्दी से उन प्रमुख केंद्रीय योजनाओं को दिखाएगा जिनके लिए आप पात्र हो सकते हैं।",
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
      "ഈ പദ്ധതി ഗൈഡിനായി നിങ്ങൾക്ക് ഇഷ്ടമുള്ള ഭാഷ തിരഞ്ഞെടുക്കുക. ഈ ചുവടിൽ നിന്ന് നിങ്ങൾക്ക് എപ്പോൾ വേണമെങ്കിലും മാറ്റാം.",
    steps: [
      {
        title: "പദ്ധതി അർഹത പരിശോധന",
        body: "നിങ്ങൾക്ക് ലഭിക്കാവുന്ന പ്രധാന കേന്ദ്രപദ്ധതികൾ എളുപ്പത്തിൽ കണ്ടെത്താൻ ഈ പേജ് സഹായിക്കും.",
      },
    ],
  },
};

/* ========= TREE EVALUATOR ========= */

function getEligibleSchemes(
  answers: Record<string, boolean>
): LeafNode | null {
  function walk(node: TreeNode | undefined | null): LeafNode | null {
    if (!node) return null;
    if (node.type === "leaf") return node as LeafNode;

    const decision = node as DecisionNode;
    const value = answers[decision.field];

    if (typeof value !== "boolean") {

      throw new Error(`Missing boolean answer for: ${decision.field}`);
    }

    return value ? walk(decision.yes) : walk(decision.no);
  }

  return walk(decisionTree);
}

/* ========= COMPONENT ========= */

const FarmerScheme = () => {
  const navigate = useNavigate();

  // Form state
  const [hasOwnLand, setHasOwnLand] = useState<boolean | null>(null);
  const [landUpto2ha, setLandUpto2ha] = useState<boolean | null>(null);
  const [inNEState, setInNEState] = useState<boolean | null>(null);
  const [inOrganicClusterNE, setInOrganicClusterNE] = useState<boolean | null>(
    null
  );

  const [result, setResult] = useState<LeafNode | null>(null);
  const [error, setError] = useState<string>("");

  const allFilled =
    hasOwnLand !== null &&
    landUpto2ha !== null &&
    inNEState !== null &&
    inOrganicClusterNE !== null;

  // GUIDE language
  const [guideLanguage, setGuideLanguage] = useState<GuideLanguage>("en");
  const gt = GUIDE_TRANSLATIONS[guideLanguage];

  // GUIDE state
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [guideInitialized, setGuideInitialized] = useState(false);
  const [hasSeenGuide, setHasSeenGuide] = useState(false);

  // Refs for steps (only language + header)
  const guideButtonRef = useRef<HTMLButtonElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  const guideSteps = useMemo(
    () => [
      {
        id: "language",
        title: gt.languageStepTitle,
        body: gt.languageStepBody,
        ref: guideButtonRef,
        isLanguageStep: true,
      },
      {
        id: "header",
        title: gt.steps[0].title,
        body: gt.steps[0].body,
        ref: headerRef,
        isLanguageStep: false,
      },
    ],
    [gt]
  );

  const currentGuideStep = guideSteps[guideStep];
  const isLanguageStep = currentGuideStep.isLanguageStep;

  // ========= MARK GUIDE AS SEEN IN SUPABASE =========
  const markSchemesGuideSeen = async () => {
    try {
      if (hasSeenGuide) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ has_seen_chatrooms_guide: true }) // reusing same flag as before
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to update has_seen_chatrooms_guide:", error);
        return;
      }

      setHasSeenGuide(true);
    } catch (e) {
      console.error("Error marking schemes guide seen:", e);
    }
  };

  // ========= CHECK PROFILE & AUTO-OPEN GUIDE =========
  useEffect(() => {
    const checkProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("has_seen_chatrooms_guide")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile for schemes guide:", error);
        } else if (data) {
          setHasSeenGuide(data.has_seen_chatrooms_guide || false);
          if (!data.has_seen_chatrooms_guide && !guideInitialized) {
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
    markSchemesGuideSeen();
  };

  const nextGuideStep = () => {
    if (guideStep < guideSteps.length - 1) {
      setGuideStep((s) => s + 1);
    } else {
      setGuideOpen(false);
      setGuideStep(0);
      markSchemesGuideSeen();
    }
  };

  const prevGuideStep = () => {
    if (guideStep > 0) setGuideStep((s) => s - 1);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  /* ========= HANDLE CHECK SCHEMES ========= */

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  const handleCheckSchemes = () => {
    setError("");
    setResult(null);

    if (!allFilled) {
      setError("Please answer all questions before checking schemes.");
      return;
    }

    try {
      const leaf = getEligibleSchemes({
        has_own_land: hasOwnLand as boolean,
        land_upto_2ha: landUpto2ha as boolean,
        in_NE_state: inNEState as boolean,
        in_organic_cluster_NE: inOrganicClusterNE as boolean,
      });
      setResult(leaf);
      setActiveSlideIndex(0); // reset slideshow to first scheme
    } catch (e) {
      console.error(e);
      setError("Something went wrong while evaluating schemes.");
    }
  };

  /* ========= BUILD SLIDES FROM RESULT ========= */

  type SlideItem =
    | {
      kind: "core";
      id: string;
    }
    | {
      kind: "conditional";
      id: string;
      condition: string;
    };

  const slides: SlideItem[] = useMemo(() => {
    if (!result) return [];
    const coreSlides: SlideItem[] =
      result.core_schemes?.map((id) => ({ kind: "core", id })) || [];
    const condSlides: SlideItem[] =
      result.conditional_schemes?.map((c) => ({
        kind: "conditional",
        id: c.scheme_id,
        condition: c.condition,
      })) || [];
    return [...coreSlides, ...condSlides];
  }, [result]);

  useEffect(() => {
    if (slides.length > 0 && activeSlideIndex >= slides.length) {
      setActiveSlideIndex(0);
    }
  }, [slides, activeSlideIndex]);

  const hasSlides = slides.length > 0;
  const currentSlide = hasSlides ? slides[activeSlideIndex] : null;

  /* ========= YES / NO RADIO RENDER ========= */

  const renderYesNoGroup = (
    label: string,
    value: boolean | null,
    setValue: (v: boolean) => void,
    name: string
  ) => (
    <div className="mb-4">
      <p className="font-medium mb-2">{label}</p>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            value="yes"
            checked={value === true}
            onChange={() => setValue(true)}
          />
          <span>Yes</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            value="no"
            checked={value === false}
            onChange={() => setValue(false)}
          />
          <span>No</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in">
      {/* Navigation (same pattern as ChatRooms) */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 hover-scale"
            >
              <Leaf className="h-8 w-8 text-primary animate-float" />
              <span className="text-xl font-bold text-foreground">
                AgriAssist
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              {/* Guide button + hover ? for language step */}
              <div className="flex items-center space-x-1">
                <Button
                  ref={guideButtonRef}
                  variant="outline"
                  size="sm"
                  onClick={openGuide}
                  className="hover:scale-105 transition-all duration-300"
                >
                  Guide
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Show guide language step"
                  onMouseEnter={() => openGuideAtStep(0)}
                  onMouseLeave={closeGuide}
                  className="hover:bg-transparent"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
              <Link to="/dashboard">
                <Button
                  variant="outline"
                  size="sm"
                  className="hover:scale-105 transition-all duration-300"
                >
                  Dashboard
                </Button>
              </Link>
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

      {/* Main content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div
          ref={headerRef}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in"
        >
          <div className="flex items-center gap-2 mb-2 md:mb-0">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Schemes Eligibility Checker
            </h1>
            {/* Only guide for scheme checker here */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Show guide for schemes intro"
              onMouseEnter={() => openGuideAtStep(1)}
              onMouseLeave={closeGuide}
              className="hover:bg-transparent"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
          <Badge variant="secondary" className="mt-2 md:mt-0">
            Central Government Schemes
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Questions + button */}
          <Card className="agri-card shadow-medium hover:shadow-strong transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Farmer Details</CardTitle>
            </CardHeader>
            <CardContent>
              {renderYesNoGroup(
                "1. Do you (or your family) have cultivable land recorded in your name?",
                hasOwnLand,
                setHasOwnLand,
                "has_own_land"
              )}

              {renderYesNoGroup(
                "2. Is your total cultivable landholding up to 2 hectares?",
                landUpto2ha,
                setLandUpto2ha,
                "land_upto_2ha"
              )}

              {renderYesNoGroup(
                "3. Do you live and farm in a North Eastern state?",
                inNEState,
                setInNEState,
                "in_NE_state"
              )}

              {renderYesNoGroup(
                "4. Are you part of an approved organic farming cluster / FPO in North East India (MOVCD-NER)?",
                inOrganicClusterNE,
                setInOrganicClusterNE,
                "in_organic_cluster_NE"
              )}

              {error && (
                <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCheckSchemes}
                  disabled={!allFilled}
                  className={`mt-1 flex-1 ${allFilled ? "" : "opacity-60 cursor-not-allowed"
                    }`}
                >
                  Available Schemes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results: SLIDESHOW */}
          <Card className="agri-card shadow-medium hover:shadow-strong transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-lg">Results & Reference</CardTitle>
            </CardHeader>
            <CardContent>
              {!result ? (
                <p className="text-sm text-muted-foreground">
                  Fill in your details on the left and click{" "}
                  <strong>Available Schemes</strong> to see results here.
                </p>
              ) : !hasSlides ? (
                <p className="text-sm text-muted-foreground">
                  No schemes were matched for this combination. Please review
                  your inputs.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Decision tree leaf reference (SNO):{" "}
                    <span className="font-semibold text-foreground">
                      {result.sno}
                    </span>
                  </p>

                  {/* Slide itself */}
                  {currentSlide && (
                    <div className="border rounded-lg p-4 mb-3 bg-muted/40">
                      {(() => {
                        const details = schemeMap[currentSlide.id];

                        if (!details) {
                          return (
                            <p className="text-sm">
                              No detailed data available for scheme ID:{" "}
                              <span className="font-mono">
                                {currentSlide.id}
                              </span>
                            </p>
                          );
                        }

                        return (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h2 className="text-base font-semibold">
                                  {details.name}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                  {details.ministry}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  currentSlide.kind === "core"
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {currentSlide.kind === "core"
                                  ? "Core Scheme"
                                  : "Conditional Scheme"}
                              </Badge>
                            </div>

                            {currentSlide.kind === "conditional" && (
                              <p className="text-xs text-muted-foreground mb-2">
                                <span className="font-semibold">
                                  Extra condition:
                                </span>{" "}
                                {currentSlide.condition}
                              </p>
                            )}

                            {details.description && (
                              <p className="text-sm mb-2">
                                {details.description}
                              </p>
                            )}

                            <div className="space-y-1 text-xs text-muted-foreground">
                              {details.maxIncome != null && (
                                <p>
                                  <span className="font-semibold">
                                    Max income to avail:
                                  </span>{" "}
                                  ≤ ₹
                                  {details.maxIncome.toLocaleString("en-IN")}
                                  {" / year"}
                                </p>
                              )}
                              {details.maxLandHa != null && (
                                <p>
                                  <span className="font-semibold">
                                    Land limit:
                                  </span>{" "}
                                  ≤ {details.maxLandHa} ha
                                </p>
                              )}
                              {details.locationNotes && (
                                <p>
                                  <span className="font-semibold">
                                    Location:
                                  </span>{" "}
                                  {details.locationNotes}
                                </p>
                              )}
                              {details.eligibleCrops &&
                                details.eligibleCrops.length > 0 && (
                                  <p>
                                    <span className="font-semibold">
                                      Crop types:
                                    </span>{" "}
                                    {details.eligibleCrops.join(", ")}
                                  </p>
                                )}
                              {details.benefits && (
                                <p>
                                  <span className="font-semibold">
                                    Main benefits:
                                  </span>{" "}
                                  {details.benefits}
                                </p>
                              )}
                              {details.howToApply && (
                                <p>
                                  <span className="font-semibold">
                                    How to apply:
                                  </span>{" "}
                                  {details.howToApply}
                                </p>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* Slideshow controls */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setActiveSlideIndex((prev) =>
                            prev === 0 ? slides.length - 1 : prev - 1
                          )
                        }
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setActiveSlideIndex((prev) =>
                            prev === slides.length - 1 ? 0 : prev + 1
                          )
                        }
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Scheme {activeSlideIndex + 1} of {slides.length}
                    </p>
                  </div>

                  {/* Dot indicators */}
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlideIndex(idx)}
                        className={`h-2 w-2 rounded-full ${idx === activeSlideIndex
                          ? "bg-primary"
                          : "bg-muted-foreground/40"
                          }`}
                        aria-label={`Go to scheme ${idx + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* GUIDE OVERLAY (only language + schemes intro) */}
      {guideOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Dim background */}
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />

          {/* Tooltip card */}
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
                  {guideStep === guideSteps.length - 1
                    ? gt.done
                    : gt.next}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmerScheme;