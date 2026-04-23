import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calculator, 
  Sprout, 
  Thermometer, 
  ArrowRightLeft,
  ChevronRight,
  TrendingUp,
  Droplets,
  Package,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";

export const FarmersToolkit = () => {
  // NPK Calc State
  const [landSize, setLandSize] = useState("");
  const [npkResult, setNpkResult] = useState<{n: number, p: number, k: number} | null>(null);

  // Seed Calc State
  const [seedCrop, setSeedCrop] = useState("Rice");
  const [seedArea, setSeedArea] = useState("");
  const [seedResult, setSeedResult] = useState<number | null>(null);

  // Risk Calc State
  const [temp, setTemp] = useState("");
  const [humidity, setHumidity] = useState("");
  const [riskResult, setRiskResult] = useState<{level: string, color: string, advice: string} | null>(null);

  // Unit Converter State
  const [unitValue, setUnitValue] = useState("");
  const [fromUnit, setFromUnit] = useState("Acres");
  const [convertedValue, setConvertedValue] = useState<number | null>(null);

  const calculateNPK = () => {
    const val = parseFloat(landSize);
    if (isNaN(val)) return;
    setNpkResult({ n: Math.round(val * 45), p: Math.round(val * 25), k: Math.round(val * 20) });
  };

  const calculateSeed = () => {
    const val = parseFloat(seedArea);
    if (isNaN(val)) return;
    // Basic heuristics: Rice ~50kg/acre, Wheat ~40kg/acre, Maize ~8kg/acre
    let rate = 50;
    if (seedCrop === "Wheat") rate = 40;
    if (seedCrop === "Maize") rate = 8;
    if (seedCrop === "Cotton") rate = 2;
    setSeedResult(Math.round(val * rate));
  };

  const calculateRisk = () => {
    const t = parseFloat(temp);
    const h = parseFloat(humidity);
    if (isNaN(t) || isNaN(h)) return;
    
    if (t > 35 && h > 70) {
        setRiskResult({ level: "CRITICAL", color: "text-red-600", advice: "High risk of fungal rot. Check moisture levels immediately." });
    } else if (t > 30 && h > 60) {
        setRiskResult({ level: "MEDIUM", color: "text-amber-600", advice: "Moderate risk. Ensure proper ventilation in fields." });
    } else {
        setRiskResult({ level: "LOW", color: "text-emerald-600", advice: "Conditions are optimal for current crop cycle." });
    }
  };

  const convertUnits = () => {
    const val = parseFloat(unitValue);
    if (isNaN(val)) return;
    setConvertedValue(fromUnit === "Acres" ? val * 0.404 : val / 0.404);
  };

  return (
    <Card className="agri-card border-none shadow-2xl bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl flex flex-col h-full">
      <CardHeader className="pb-4 shrink-0">
        <CardTitle className="text-xl font-black flex items-center gap-3 text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">
          <span className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-600 shadow-sm border border-blue-500/10">
            <Calculator className="h-6 w-6" />
          </span>
          Agri Toolkit
        </CardTitle>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-4 md:gap-5 flex-1 p-6">
        {/* NPK Calculator */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-[120px] flex-col gap-3 rounded-[2rem] border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-emerald-400 outline-none hover:shadow-lg transition-all group">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl group-hover:scale-110 transition-transform">
                <Sprout className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">NPK Calculator</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 dark:bg-zinc-950 backdrop-blur-xl rounded-[2.5rem] border-zinc-200">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">NPK Requirement</DialogTitle>
                <DialogDescription className="font-medium text-zinc-500">Calculate essential nutrients for your land size.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Land Size (Acres)</Label>
                <Input type="number" value={landSize} onChange={e => setLandSize(e.target.value)} placeholder="Enter acreage..." className="h-12 rounded-xl font-bold" />
              </div>
              <Button onClick={calculateNPK} className="w-full h-12 bg-emerald-600 rounded-xl font-bold">Generate Estimate</Button>
              {npkResult && (
                <div className="grid grid-cols-3 gap-3 animate-in zoom-in-95">
                    {[
                        {v: npkResult.n, l: "N", c: "text-blue-600", b: "bg-blue-50/50"},
                        {v: npkResult.p, l: "P", c: "text-amber-600", b: "bg-amber-50/50"},
                        {v: npkResult.k, l: "K", c: "text-emerald-600", b: "bg-emerald-50/50"}
                    ].map(i => (
                        <div key={i.l} className={i.b + " p-4 rounded-2xl text-center border"}>
                            <div className={"text-xl font-black " + i.c}>{i.v}kg</div>
                            <div className="text-[9px] font-black text-zinc-400 mt-1 uppercase">{i.l}</div>
                        </div>
                    ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Seed Calculator */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-[120px] flex-col gap-3 rounded-[2rem] border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-blue-400 outline-none hover:shadow-lg transition-all group">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Seed Estimator</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 dark:bg-zinc-950 backdrop-blur-xl rounded-[2.5rem] border-zinc-200">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Seed Quantity</DialogTitle>
                <DialogDescription className="font-medium text-zinc-500">Calculate required seed weight for planting.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Crop</Label>
                    <Select value={seedCrop} onValueChange={setSeedCrop}>
                        <SelectTrigger className="h-12 rounded-xl font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Rice">Rice</SelectItem>
                            <SelectItem value="Wheat">Wheat</SelectItem>
                            <SelectItem value="Maize">Maize</SelectItem>
                            <SelectItem value="Cotton">Cotton</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Area (Acres)</Label>
                    <Input type="number" value={seedArea} onChange={e => setSeedArea(e.target.value)} placeholder="Area..." className="h-12 rounded-xl font-bold" />
                </div>
              </div>
              <Button onClick={calculateSeed} className="w-full h-12 bg-blue-600 rounded-xl font-bold">Estimate Weight</Button>
              {seedResult !== null && (
                <div className="p-6 bg-blue-50 rounded-2xl text-center animate-in zoom-in-95 border border-blue-100">
                    <div className="text-4xl font-black text-blue-600">{seedResult}kg</div>
                    <div className="text-[10px] font-black text-zinc-400 mt-1 uppercase tracking-widest">Total Seed Required</div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Moisture/Risk Calculator */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-[120px] flex-col gap-3 rounded-[2rem] border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-red-400 outline-none hover:shadow-lg transition-all group">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl group-hover:scale-110 transition-transform">
                <Droplets className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Risk Assessment</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 dark:bg-zinc-950 backdrop-blur-xl rounded-[2.5rem] border-zinc-200">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Harvesting Risk</DialogTitle>
                <DialogDescription className="font-medium text-zinc-500">Analyze environment for harvesting hazards.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Temp (°C)</Label>
                    <Input type="number" value={temp} onChange={e => setTemp(e.target.value)} placeholder="30" className="h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black tracking-widest text-zinc-400 uppercase">Humidity (%)</Label>
                    <Input type="number" value={humidity} onChange={e => setHumidity(e.target.value)} placeholder="65" className="h-12 rounded-xl font-bold" />
                </div>
              </div>
              <Button onClick={calculateRisk} className="w-full h-12 bg-red-600 rounded-xl font-bold text-white shadow-lg shadow-red-100">Analyze Risk</Button>
              {riskResult && (
                <div className="p-5 bg-zinc-50 rounded-2xl space-y-2 border animate-in slide-in-from-top-2">
                    <div className={"text-[10px] font-black uppercase tracking-widest " + riskResult.color}>{riskResult.level} RISK LEVEL</div>
                    <p className="text-xs font-bold text-zinc-600 leading-relaxed">{riskResult.advice}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Unit Converter */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-[120px] flex-col gap-3 rounded-[2rem] border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-amber-400 outline-none hover:shadow-lg transition-all group">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl group-hover:scale-110 transition-transform">
                <ArrowRightLeft className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400">Unit Converter</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 dark:bg-zinc-950 backdrop-blur-xl rounded-[2.5rem] border-zinc-200">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Land Converter</DialogTitle>
                <DialogDescription className="font-medium text-zinc-500">Quickly toggle between primary units.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="flex gap-4">
                 <Input type="number" value={unitValue} onChange={e => setUnitValue(e.target.value)} placeholder="Value..." className="h-12 rounded-xl font-bold flex-1" />
                 <Button variant="outline" onClick={() => setFromUnit(fromUnit === "Acres" ? "Hectares" : "Acres")} className="h-12 min-w-[100px] rounded-xl font-bold">{fromUnit}</Button>
              </div>
              <Button onClick={convertUnits} className="w-full h-12 bg-amber-600 rounded-xl font-bold text-white shadow-lg shadow-amber-100">Convert</Button>
              {convertedValue !== null && (
                 <div className="p-6 bg-amber-50 rounded-2xl text-center border border-amber-100">
                    <div className="text-4xl font-black text-amber-600">{convertedValue.toFixed(3)}</div>
                    <div className="text-[10px] font-black text-zinc-400 mt-1 uppercase tracking-widest">{fromUnit === "Acres" ? "Hectares" : "Acres"}</div>
                 </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
