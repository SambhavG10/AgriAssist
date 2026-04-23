import React, { useState, useEffect, useRef } from "react";
import { Check, Search, Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

const COMMON_CROPS = [
  "Peas", "Potato", "Pumpkin", "Wheat", "Rice", "Maize", 
  "Cotton", "Sugarcane", "Tea", "Coffee", "Tomato", 
  "Onion", "Garlic", "Ginger", "Chili", "Cabbage",
  "Cauliflower", "Brinjal", "Okra", "Soybean", "Mustard"
].sort();

// "Rice", "Wheat", "Maize", "Cassava", "Sweet Potato", "Potato", "Soybean", "Groundnut",
//   "Tomato", "Onion", "Garlic", "Banana", "Plantain", "Sorghum", "Pearl Millet", "Sugarcane",
//   "Lentil", "Chickpea", "Cabbage", "Spinach", "Cucumber", "Chili", "Okra", "Ginger",
//   "Turmeric", "Mustard", "Sunflower", "Coconut", "Coffee", "Cocoa", "Cauliflower", "Tea",
//   "Pumpkin", "Cotton", "Brinjal", "Peas"
// ];
interface SmartCropInputProps {
  onSelect: (crop: string) => void;
  onCancel: () => void;
}

export const SmartCropInput: React.FC<SmartCropInputProps> = ({ onSelect, onCancel }) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim()) {
      const filtered = COMMON_CROPS.filter(crop =>
        crop.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setIsOpen(true);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0) {
        onSelect(suggestions[selectedIndex]);
      } else if (query.trim()) {
        onSelect(query.trim());
      }
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const highlightMatch = (text: string, match: string) => {
    if (!match) return text;
    const parts = text.split(new RegExp(`(${match})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === match.toLowerCase() ? (
        <span key={i} className="text-primary font-bold">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <div className="relative flex items-center gap-2 animate-in fade-in zoom-in duration-200 z-[200]" ref={containerRef}>
      <div className="relative group">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Search className="h-3.5 w-3.5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter crop name..."
          className="h-8 w-48 text-sm pl-8 pr-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
          autoFocus
        />
        
        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-1 bg-card border-2 border-primary/20 rounded-lg shadow-xl overflow-hidden z-[300] animate-in slide-in-from-top-2 duration-200 ring-4 ring-black/5">
            {suggestions.map((crop, index) => (
              <button
                key={crop}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-primary/10 transition-colors",
                  selectedIndex === index && "bg-primary/10"
                )}
                onClick={() => onSelect(crop)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Leaf className="h-3 w-3 text-primary/60" />
                <span>{highlightMatch(crop, query)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSelect(query.trim())}
          className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-full text-green-600 transition-colors shadow-sm bg-white dark:bg-zinc-900 border border-green-200/50"
          title="Confirm"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={onCancel}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-600 transition-colors shadow-sm bg-white dark:bg-zinc-900 border border-red-200/50"
          title="Cancel"
        >
          <div className="h-4 w-4 flex items-center justify-center font-bold text-xs">✕</div>
        </button>
      </div>
    </div>
  );
};
