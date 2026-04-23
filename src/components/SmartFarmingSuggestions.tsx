import React from "react";
import { 
  CloudRain, 
  Leaf, 
  TrendingUp, 
  RefreshCcw, 
  Landmark,
  ArrowRight,
  Sparkles,
  Sprout
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Link } from "react-router-dom";

interface Suggestion {
  icon: any;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  path: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: CloudRain,
    title: "Weather Advice",
    description: "Moderate rain expected. Reduce irrigation to prevent waterlogging.",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    path: "/dashboard"
  },
  {
    icon: Leaf,
    title: "Sustainable Mulching",
    description: "Use organic mulching to retain soil moisture and suppress weeds.",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    path: "/chat"
  },
  {
    icon: TrendingUp,
    title: "Market Flash",
    description: "Tomato prices are rising by 15%. Consider harvesting soon.",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    path: "/market-prices"
  },
  {
    icon: RefreshCcw,
    title: "Crop Rotation",
    description: "Plant Legumes next to naturally restore soil nitrogen.",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    path: "/chat"
  },
  {
    icon: Landmark,
    title: "Govt. Schemes",
    description: "PM-Kisan Maandhan registration is open for small farmers.",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    path: "/chat-rooms"
  },
  {
    icon: Sprout,
    title: "Pest Protection",
    description: "Early signs of whitefly detected in neighboring districts. Monitor your fields.",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    path: "/chat"
  }
];

export const SmartFarmingSuggestions = () => {
  return (
    <Card className="border-none shadow-none bg-transparent overflow-visible">
      <CardHeader className="px-0 pb-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black flex items-center gap-3 text-zinc-800 dark:text-zinc-100 uppercase tracking-tighter">
            <span className="p-2.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg shadow-green-200 dark:shadow-none text-white">
              <Sparkles className="h-5 w-5" />
            </span>
            Smart Suggestions
          </CardTitle>
          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 font-bold px-3 py-1 animate-pulse hidden sm:flex">
            LIVE ANALYTICS
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {SUGGESTIONS.map((item, index) => (
            <Link 
              to={item.path}
              key={index}
              className="flex items-start gap-4 p-5 rounded-[2rem] bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl border border-zinc-100 dark:border-zinc-800 hover:border-emerald-400/50 hover:shadow-[0_15px_30px_-10px_rgba(34,197,94,0.12)] transition-all duration-500 group relative overflow-hidden"
            >
              {/* Subtle background glow on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${item.bgColor}`} />
              
              <div className={`p-3.5 rounded-2xl ${item.bgColor} ${item.color} group-hover:scale-110 transition-transform duration-500 shadow-sm relative z-10 shrink-0`}>
                <item.icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 space-y-1 relative z-10">
                <h4 className="font-bold text-sm flex items-center justify-between text-zinc-800 dark:text-zinc-100">
                  {item.title}
                  <ArrowRight className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-2 group-hover:translate-x-0" />
                </h4>
                <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium line-clamp-2">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
