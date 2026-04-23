import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  MessageCircle,
  Users,
  Leaf,
  Heart,
  Share2,
  LogOut,
  HelpCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NewDiscussionDialog } from "@/components/NewDiscussionDialog";
import { useLogger } from "@/context/LoggerContext";

// Define a type for the discussion post
export type Post = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  replies_count: number;
  crop_type: string | null;
  user_id: string;
  profiles: {
    full_name: string | null;
    location: { city?: string; state?: string } | null;
  } | null;
};

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
      "Select the language you want to use for this community walkthrough. You can change it anytime from this step.",
    steps: [
      {
        title: "New Discussion",
        body: "Start a new discussion to ask questions or share something with the community.",
      },
      {
        title: "All Discussions",
        body: "View all discussions from the community in one place.",
      },
      {
        title: "Popular",
        body: "See discussions that are getting the most attention and engagement.",
      },
      {
        title: "My Posts",
        body: "Quickly access discussions that you have created.",
      },
      {
        title: "Popular Topics",
        body: "Browse the most talked-about topics in the community.",
      },
      {
        title: "Community Stats",
        body: "See how active the community is with members, discussions, and answered questions.",
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
      "इस समुदाय मार्गदर्शिका के लिए भाषा चुनें। आप कभी भी इसी चरण से इसे बदल सकते हैं।",
    steps: [
      {
        title: "नई चर्चा",
        body: "समुदाय से प्रश्न पूछने या कुछ साझा करने के लिए नई चर्चा शुरू करें।",
      },
      {
        title: "सभी चर्चाएँ",
        body: "समुदाय की सभी चर्चाएँ एक ही जगह देखें।",
      },
      {
        title: "लोकप्रिय",
        body: "वे चर्चाएँ देखें जिन्हें सबसे अधिक ध्यान और प्रतिक्रिया मिल रही है।",
      },
      {
        title: "मेरी पोस्ट",
        body: "आपके द्वारा बनाई गई चर्चाओं तक जल्दी पहुँचें।",
      },
      {
        title: "लोकप्रिय विषय",
        body: "समुदाय में सबसे ज्यादा चर्चा किए गए विषयों को ब्राउज़ करें।",
      },
      {
        title: "समुदाय आँकड़े",
        body: "समुदाय कितना सक्रिय है, जैसे सदस्य, चर्चाएँ और उत्तर दिए गए प्रश्न देखें।",
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
      "ഈ കമ്മ്യൂണിറ്റി ഗൈഡിനായി നിങ്ങള്‍ ഉപയോഗിക്കാന്‍ ആഗ്രഹിക്കുന്ന ഭാഷ തിരഞ്ഞെടുക്കുക. ഈ ചുവടിൽ നിന്ന് നിങ്ങൾക്ക് എപ്പോൾ വേണമെങ്കിലും മാറ്റാം.",
    steps: [
      {
        title: "പുതിയ ചര്‍ച്ച",
        body: "ചോദ്യങ്ങള്‍ ചോദിക്കാനോ എന്തെങ്കിലുമൊന്നും പങ്കിടാനോ പുതിയ ചര്‍ച്ച ആരംഭിക്കുക.",
      },
      {
        title: "എല്ലാ ചര്‍ച്ചകളും",
        body: "കമ്മ്യൂണിറ്റിയിലെ എല്ലാ ചര്‍ച്ചകളും ഒരേ സ്ഥലത്ത് കാണുക.",
      },
      {
        title: "ജനപ്രിയം",
        body: "ഏറ്റവും കൂടുതല്‍ ശ്രദ്ധയും പ്രതികരണവും ലഭിക്കുന്ന ചര്‍ച്ചകള്‍ കാണുക.",
      },
      {
        title: "എന്റെ പോസ്റ്റുകള്‍",
        body: "നിങ്ങള്‍ സൃഷ്ടിച്ച ചര്‍ച്ചകളിലേക്ക് പെട്ടെന്ന് എത്തുക.",
      },
      {
        title: "ജനപ്രിയ വിഷങ്ങള്‍",
        body: "കമ്മ്യൂണിറ്റിയില്‍ ഏറ്റവും കൂടുതല്‍ ചര്‍ച്ച ചെയ്യപ്പെടുന്ന വിഷങ്ങള്‍ ബ്രൗസ് ചെയ്യുക.",
      },
      {
        title: "കമ്മ്യൂണിറ്റി സ്ഥിതിവിവരക്കണക്കുകള്‍",
        body: "അംഗങ്ങള്‍, ചര്‍ച്ചകള്‍, മറുപടി ലഭിച്ച ചോദ്യങ്ങള്‍ എന്നിവയിലൂടെ കമ്മ്യൂണിറ്റി എത്ര സജീവമാണെന്ന് കാണുക.",
      },
    ],
  },
};

const Community = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [discussions, setDiscussions] = useState<Post[]>([]);
  const [filteredDiscussions, setFilteredDiscussions] = useState<Post[]>([]);
  const [isNewDiscussionOpen, setIsNewDiscussionOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { logAction } = useLogger();

  /* ========= GUIDE LANGUAGE STATE ========= */
  const [guideLanguage, setGuideLanguage] = useState<GuideLanguage>("en");
  const gt = GUIDE_TRANSLATIONS[guideLanguage];

  /* ========= GUIDE STATE & REFS ========= */
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  const guideButtonRef = useRef<HTMLButtonElement | null>(null);
  const newDiscussionRef = useRef<HTMLButtonElement | null>(null);
  const allTabRef = useRef<HTMLButtonElement | null>(null);
  const popularTabRef = useRef<HTMLButtonElement | null>(null);
  const myPostsTabRef = useRef<HTMLButtonElement | null>(null);
  const popularTopicsRef = useRef<HTMLDivElement | null>(null);

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
        id: "new-discussion",
        title: gt.steps[0].title,
        body: gt.steps[0].body,
        ref: newDiscussionRef,
        isLanguageStep: false,
      },
      {
        id: "all",
        title: gt.steps[1].title,
        body: gt.steps[1].body,
        ref: allTabRef,
        isLanguageStep: false,
      },
      {
        id: "popular",
        title: gt.steps[2].title,
        body: gt.steps[2].body,
        ref: popularTabRef,
        isLanguageStep: false,
      },
      {
        id: "my-posts",
        title: gt.steps[3].title,
        body: gt.steps[3].body,
        ref: myPostsTabRef,
        isLanguageStep: false,
      },
      {
        id: "popular-topics",
        title: gt.steps[4].title,
        body: gt.steps[4].body,
        ref: popularTopicsRef,
        isLanguageStep: false,
      },
    ],
    [gt]
  );

  // ====== AUTO-OPEN GUIDE ON FIRST VISIT (per account) ======
  useEffect(() => {
    logAction("Visited Community Page");
    const checkCommunityGuide = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting user for community guide:", error);
        return;
      }
      if (!user) return;

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("has_seen_community_guide")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      if (profile && !profile.has_seen_community_guide) {
        setGuideStep(0);
        setGuideOpen(true);

        try {
          await supabase
            .from("profiles")
            .update({ has_seen_community_guide: true })
            .eq("user_id", user.id);
        } catch (e) {
          console.error("Failed to update profile for community guide:", e);
        }
      }
    };

    checkCommunityGuide();
  }, []);

  // Position tooltip near current step element
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
    const padding = 16;

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
  };

  const nextGuideStep = () => {
    if (guideStep < guideSteps.length - 1) {
      setGuideStep((s) => s + 1);
    } else {
      setGuideOpen(false);
      setGuideStep(0);
    }
  };

  const prevGuideStep = () => {
    if (guideStep > 0) {
      setGuideStep((s) => s - 1);
    }
  };

  /* ========= DATA FETCHING ========= */

  const fetchDiscussions = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }

    const { data: postsData, error: postsError } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
      return;
    }

    if (postsData) {
      const userIds = postsData.map((post) => post.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, location")
        .in("user_id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        setDiscussions(postsData.map((p) => ({ ...p, profiles: null })));
        setFilteredDiscussions(postsData.map((p) => ({ ...p, profiles: null })) as Post[]);
        return;
      }

      const profilesMap = new Map(profilesData.map((p) => [p.user_id, p]));
      const combinedData = postsData.map((post) => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || null,
      }));

      setDiscussions(combinedData as Post[]);
      setFilteredDiscussions(combinedData as Post[]);
    }
  };

  useEffect(() => {
    fetchDiscussions();

    const channel = supabase.channel("community-posts-realtime");

    channel
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_posts" },
        () => {
          fetchDiscussions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (searchQuery) {
      logAction(`Searching Community for: "${searchQuery}"`);
    }
    const filtered = discussions.filter(
      (discussion) =>
        discussion.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        discussion.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (discussion.crop_type &&
          discussion.crop_type
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    );
    setFilteredDiscussions(filtered);
  }, [searchQuery, discussions]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const popularTopics = [
    { id: 1, title: "Rice Cultivation", count: 245, color: "bg-primary" },
    { id: 2, title: "Pest Control", count: 189, color: "bg-secondary" },
    { id: 3, title: "Organic Farming", count: 156, color: "bg-accent" },
    { id: 4, title: "Coconut Growing", count: 134, color: "bg-primary/70" },
  ];

  const currentGuideStep = guideSteps[guideStep];
  const isLanguageStep = currentGuideStep.isLanguageStep;

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in">
      {/* Navigation */}
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
              {/* Guide button + icon (step 0) */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openGuide}
                  className="hover:scale-105 transition-all duration-300"
                  ref={guideButtonRef}
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

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 animate-fade-in">
              <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Community Forum
                </h1>
                <p className="text-muted-foreground text-lg">
                  Connect with fellow farmers and share knowledge
                </p>
              </div>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                <Button
                  ref={newDiscussionRef}
                  className="gradient-primary text-primary-foreground hover:scale-105 hover:shadow-strong transition-all duration-300 px-6 py-3 text-lg font-semibold"
                  onClick={() => setIsNewDiscussionOpen(true)}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  New Discussion
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Show guide for new discussion"
                  onMouseEnter={() => openGuideAtStep(1)}
                  onMouseLeave={closeGuide}
                  className="hover:bg-transparent"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search and Tabs */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search discussions by title, content, or crop type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger
                  value="all"
                  ref={allTabRef}
                  className="flex items-center justify-center gap-1"
                >
                  <span>All Discussions</span>
                  <HelpCircle
                    className="h-3 w-3 text-muted-foreground"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      openGuideAtStep(2);
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      closeGuide();
                    }}
                  />
                </TabsTrigger>
                <TabsTrigger
                  value="popular"
                  ref={popularTabRef}
                  className="flex items-center justify-center gap-1"
                >
                  <span>Popular</span>
                  <HelpCircle
                    className="h-3 w-3 text-muted-foreground"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      openGuideAtStep(3);
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      closeGuide();
                    }}
                  />
                </TabsTrigger>
                <TabsTrigger
                  value="my-posts"
                  ref={myPostsTabRef}
                  className="flex items-center justify-center gap-1"
                >
                  <span>My Posts</span>
                  <HelpCircle
                    className="h-3 w-3 text-muted-foreground"
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                      openGuideAtStep(4);
                    }}
                    onMouseLeave={(e) => {
                      e.stopPropagation();
                      closeGuide();
                    }}
                  />
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="space-y-4">
                  {filteredDiscussions.map((discussion, index) => (
                    <Link
                      key={discussion.id}
                      to={`/community/${discussion.id}`}
                      className="block w-full no-underline text-current group"
                    >
                      <Card
                        className="agri-card shadow-medium hover:shadow-strong hover:scale-[1.02] transition-all duration-500 ease-in-out hover:border-primary/50 animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardContent className="p-4 sm:p-8">
                          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-medium group-hover:scale-110 transition-transform duration-300">
                              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg mb-1 group-hover:text-primary transition-colors">
                                    {discussion.title}
                                  </CardTitle>
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      {discussion.profiles?.full_name ||
                                        "Anonymous"}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {new Date(
                                        discussion.created_at
                                      ).toLocaleDateString()}
                                    </span>
                                    {discussion.crop_type && (
                                      <Badge variant="secondary">
                                        #{discussion.crop_type}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground ml-4 flex-shrink-0">
                                  <div className="flex items-center gap-1.5">
                                    <Heart className="h-4 w-4" />
                                    <span>{discussion.likes_count}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <MessageCircle className="h-4 w-4" />
                                    <span>{discussion.replies_count}</span>
                                  </div>
                                </div>
                              </div>
                              <p className="line-clamp-2 text-sm mt-3 text-muted-foreground">
                                {discussion.content}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="popular">
                <p className="text-center text-muted-foreground py-8">
                  Popular discussions coming soon.
                </p>
              </TabsContent>

              <TabsContent value="my-posts">
                <div className="space-y-4">
                  {discussions.filter((d) => d.user_id === userId).length >
                  0 ? (
                    discussions
                      .filter((d) => d.user_id === userId)
                      .map((discussion) => (
                        <Link
                          key={discussion.id}
                          to={`/community/${discussion.id}`}
                          className="block w-full no-underline text-current group"
                        >
                          <Card className="transition-all duration-300 ease-in-out hover:shadow-lg hover:border-primary/30">
                            <CardContent className="p-6">
                              <div className="flex items-start space-x-4">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <MessageCircle className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <CardTitle className="text-lg mb-1 group-hover:text-primary transition-colors">
                                        {discussion.title}
                                      </CardTitle>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">
                                          {discussion.profiles?.full_name ||
                                            "Anonymous"}
                                        </span>
                                        <span>•</span>
                                        <span>
                                          {new Date(
                                            discussion.created_at
                                          ).toLocaleDateString()}
                                        </span>
                                        {discussion.crop_type && (
                                          <Badge variant="secondary">
                                            #{discussion.crop_type}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-muted-foreground ml-4 flex-shrink-0">
                                      <div className="flex items-center gap-1.5">
                                        <Heart className="h-4 w-4" />
                                        <span>{discussion.likes_count}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <MessageCircle className="h-4 w-4" />
                                        <span>{discussion.replies_count}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="line-clamp-2 text-sm mt-3 text-muted-foreground">
                                    {discussion.content}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                      <p className="mb-2">
                        You haven't created any posts yet.
                      </p>
                      <Button onClick={() => setIsNewDiscussionOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Post
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:mt-24">
            {/* Popular Topics */}
            <Card className="agri-card relative" ref={popularTopicsRef}>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 hover:bg-transparent"
                aria-label="Show guide for popular topics"
                onMouseEnter={() => openGuideAtStep(5)}
                onMouseLeave={closeGuide}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <CardHeader>
                <CardTitle className="text-lg">Popular Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {popularTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-smooth"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${topic.color}`}
                        ></div>
                        <span className="text-sm font-medium text-foreground">
                          {topic.title}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {topic.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Community Stats (no guide icon) */}
            <Card className="agri-card">
              <CardHeader>
                <CardTitle className="text-lg">Community Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      1,247
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Active Members
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary">
                      3,456
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Discussions
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent-foreground">
                      89%
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Questions Answered
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="agri-card">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsNewDiscussionOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Start Discussion
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Find Experts
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Knowledge
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* GUIDE OVERLAY + TOOLTIP (same style as your fixed Dashboard) */}
      {guideOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Dim background, non-interactive */}
          <div className="absolute inset-0 bg-black/60 pointer-events-none" />

          {/* Solid popup card */}
          <div
            className="absolute bg-card border border-border rounded-xl shadow-xl p-4 w-[320px] pointer-events-auto bg-opacity-100"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            <p className="text-xs text-muted-foreground mb-2">
              {gt.stepPrefix} {guideStep + 1} {gt.stepOf} {guideSteps.length}
            </p>

            <div className="flex items-start gap-3 mb-3">
              <img
                src="/Mascot.png"
                alt="Guide helper"
                className="h-16 w-auto rounded-md flex-shrink-0"
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

      <NewDiscussionDialog
        open={isNewDiscussionOpen}
        onOpenChange={setIsNewDiscussionOpen}
        onPostCreated={fetchDiscussions}
      />
    </div>
  );
};

export default Community;
