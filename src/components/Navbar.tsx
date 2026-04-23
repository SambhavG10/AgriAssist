import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Leaf, 
  TrendingUp, 
  TrendingDown,
  Languages,
  User,
  LogOut,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GTranslateWidget from "@/components/GTranslateWidget";

interface NavbarProps {
  userName?: string;
  onLogout: () => void;
  cropPrices?: Record<string, number>;
}

export const Navbar: React.FC<NavbarProps> = ({ userName, onLogout, cropPrices = {} }) => {
  const navigate = useNavigate();
  
  const activeCrops = Object.entries(cropPrices).filter(([_, price]) => price > 0);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-300">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left: Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Leaf className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AgriAssist
          </span>
        </Link>

        {/* Center: Real-Time Price Tracker - Hidden on small screens */}
        <div className="hidden md:flex flex-1 max-w-[70%] px-4 overflow-hidden relative">
          <style>
            {`
              @keyframes marquee {
                0% { transform: translateX(0); }
                100% { transform: translateX(-50%); }
              }
              .animate-marquee {
                display: flex;
                white-space: nowrap;
                animation: marquee 30s linear infinite;
              }
              .animate-marquee:hover {
                animation-play-state: paused;
              }
              .no-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .no-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}
          </style>
          
          <div className="flex items-center gap-6 overflow-hidden mask-fade-edges">
            {activeCrops.length > 0 ? (
              <div className="animate-marquee gap-12 py-1">
                {/* Double the items to create a seamless loop */}
                {[...activeCrops, ...activeCrops].map(([crop, price], idx) => {
                  const isUp = (crop.length + Math.round(price) + idx) % 2 === 0;
                  return (
                    <div key={`${crop}-${idx}`} className="flex items-center gap-4 shrink-0 group cursor-default">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 tracking-tighter group-hover:text-primary transition-colors uppercase">
                          {crop}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100">
                            ₹{(price / 100).toFixed(2)}
                          </span>
                          {isUp ? (
                            <div className="flex items-center text-emerald-500 animate-pulse">
                              <ChevronUp className="h-3 w-3" />
                              <span className="text-[10px] font-bold">+1.2%</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-500">
                              <ChevronDown className="h-3 w-3" />
                              <span className="text-[10px] font-bold">-0.8%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Mini Sparkline Visualization */}
                      <div className="flex items-end gap-0.5 h-6">
                        {[40, 65, 45, 80, 55, 90].map((h, i) => (
                           <div 
                            key={i} 
                            className={`w-1 rounded-full transition-all duration-500 ${isUp ? 'bg-emerald-500/40' : 'bg-red-500/40'} group-hover:h-full`} 
                            style={{ height: `${h}%` }} 
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-400 text-xs animate-pulse italic">
                <TrendingUp className="h-4 w-4" />
                Live Market Syncing...
              </div>
            )}
          </div>
          
          {/* Fading Edges */}
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white dark:from-zinc-950 to-transparent z-10 pointer-events-none" />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Languages className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
              <DropdownMenuLabel className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Select Language
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-4">
                <GTranslateWidget />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:scale-105 transition-transform">
                <div className="w-full h-full bg-gradient-to-br from-primary to-green-600 flex items-center justify-center text-white font-bold text-sm">
                  {userName ? userName[0].toUpperCase() : "U"}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 p-2 rounded-xl" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1 py-1">
                  <p className="text-sm font-semibold leading-none">{userName || "User Profile"}</p>
                  <p className="text-xs leading-none text-zinc-500">Verified Farmer</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-lg gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onLogout} 
                className="rounded-lg gap-2 text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};
