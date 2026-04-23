import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronRight, 
  Plus, 
  Trash2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
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

interface Task {
  id: string;
  title: string;
  crop: string;
  date: string;
  priority: "High" | "Medium" | "Low";
  completed: boolean;
}

const STORAGE_KEY = "agri_calendar_tasks";

const DEFAULT_TASKS: Task[] = [
  { id: "1", title: "Apply nitrogen fertilizer", crop: "Rice", date: "22 Apr", priority: "High", completed: false },
  { id: "2", title: "Inspect for Stem Borer", crop: "Maize", date: "24 Apr", priority: "Medium", completed: false },
  { id: "3", title: "Complete weeding phase 2", crop: "Wheat", date: "26 Apr", priority: "Low", completed: true },
];

export const AgriCalendar = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newCrop, setNewCrop] = useState("");
  const [newPriority, setNewPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load tasks
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTasks(JSON.parse(saved));
      } catch (e) {
        setTasks(DEFAULT_TASKS);
      }
    } else {
      setTasks(DEFAULT_TASKS);
    }
    setIsLoaded(true);
  }, []);

  // Save tasks
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, isLoaded]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addTask = () => {
    if (!newTitle || !newCrop) return;
    const task: Task = {
      id: Date.now().toString(),
      title: newTitle,
      crop: newCrop,
      date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "short" }),
      priority: newPriority,
      completed: false
    };
    setTasks([task, ...tasks]);
    setNewTitle("");
    setNewCrop("");
    setIsDialogOpen(false);
  };

  const clearCompleted = () => {
    setTasks(tasks.filter(t => !t.completed));
  };

  return (
    <Card className="agri-card border-none shadow-2xl bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl flex flex-col h-full">
      <CardHeader className="pb-4 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black flex items-center gap-3 text-zinc-800 dark:text-zinc-100 uppercase tracking-tight">
            <span className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-600 shadow-sm border border-emerald-500/10">
              <CalendarIcon className="h-6 w-6" />
            </span>
            Farm Schedule
          </CardTitle>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 dark:shadow-none">
                <Plus className="h-4 w-4 mr-1" /> New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 dark:bg-zinc-950 backdrop-blur-xl border-zinc-200 dark:border-zinc-800 rounded-[2.5rem]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">Plan New Activity</DialogTitle>
                <DialogDescription className="font-medium text-zinc-500">Add a seasonal task to your farm calendar.</DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Activity Title</Label>
                  <Input 
                    placeholder="e.g. Weed control in Sector B" 
                    value={newTitle} 
                    onChange={e => setNewTitle(e.target.value)}
                    className="h-12 bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Crop Type</Label>
                        <Input 
                            placeholder="Rice, Maize..." 
                            value={newCrop} 
                            onChange={e => setNewCrop(e.target.value)}
                            className="h-12 bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Priority</Label>
                        <Select value={newPriority} onValueChange={(v: any) => setNewPriority(v)}>
                            <SelectTrigger className="h-12 bg-zinc-50/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button onClick={addTask} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-100">
                    Confirm Schedule
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-4 px-6 scrollbar-hide">
        {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center space-y-3">
                <AlertCircle className="h-10 w-10 text-zinc-200" />
                <p className="text-sm font-medium text-zinc-400">No active tasks. Start by adding one!</p>
            </div>
        ) : (
            tasks.sort((a,b) => Number(a.completed) - Number(b.completed)).map((task) => (
            <div 
                key={task.id}
                className={cn(
                "group relative flex items-start gap-4 p-5 rounded-[2rem] border transition-all duration-500 cursor-pointer",
                task.completed 
                    ? "bg-zinc-50/20 dark:bg-zinc-900/10 border-transparent opacity-60" 
                    : "bg-white dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 hover:border-emerald-400/30 hover:shadow-[0_15px_30px_-10px_rgba(34,197,94,0.1)] hover:-translate-y-0.5"
                )}
                onClick={() => toggleTask(task.id)}
            >
                <div className="pt-0.5">
                {task.completed ? (
                    <div className="p-1 px-1 bg-emerald-500/10 rounded-full">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    </div>
                ) : (
                    <Circle className="h-6 w-6 text-zinc-200 dark:text-zinc-800 group-hover:text-emerald-400 transition-colors" />
                )}
                </div>
                
                <div className="flex-1 min-w-0 pr-8">
                <h4 className={cn(
                    "text-[15px] font-bold transition-all leading-tight",
                    task.completed ? "line-through text-zinc-400" : "text-zinc-800 dark:text-zinc-100"
                )}>
                    {task.title}
                </h4>
                <div className="flex items-center gap-3 mt-1.5">
                    <div className="px-2 py-0.5 bg-emerald-500/5 rounded-md text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                        {task.crop}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                        <Clock className="h-3 w-3" /> {task.date}
                    </div>
                </div>
                </div>

                <div className="absolute top-5 right-5 flex items-center gap-2">
                    {!task.completed && (
                        <div className={cn(
                        "w-2 h-2 rounded-full",
                        task.priority === "High" ? "bg-red-500 animate-pulse" :
                        task.priority === "Medium" ? "bg-amber-500" :
                        "bg-blue-500"
                        )} />
                    )}
                    <button 
                        onClick={(e) => deleteTask(e, task.id)}
                        className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
            ))
        )}
      </CardContent>

      {tasks.some(t => t.completed) && (
        <div className="p-4 pt-0 shrink-0">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearCompleted}
                className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-red-500 hover:bg-red-50/50 transition-all border border-dashed border-zinc-100 hover:border-red-200 rounded-xl"
            >
                Clear Completed Tasks
            </Button>
        </div>
      )}
    </Card>
  );
};
