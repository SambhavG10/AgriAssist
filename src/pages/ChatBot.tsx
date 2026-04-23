import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Send, 
  Mic, 
  Camera, 
  Bot, 
  User, 
  Leaf,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Trash2,
  Languages,
  Volume2,
  Pause,
  Play,
  Square
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useLogger } from "@/context/LoggerContext";

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  type?: 'text' | 'image' | 'audio';
  status?: 'uploading' | 'uploaded';
}

interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}
const { SpeechRecognition, webkitSpeechRecognition }: IWindow = window as any;
const browserSupportsSpeechRecognition = SpeechRecognition || webkitSpeechRecognition;

const ChatBot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'ml' | 'hi'>('en');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();
  const { logAction } = useLogger();

  // Load user, fetch chat history, and subscribe to real-time updates
  useEffect(() => {
    logAction("Visited AI Assistant");
    
    // Force load voices (needed for some browsers)
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Cleanup speech on unmount
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    let channel: any;

    const setup = async () => {
      console.log('[ChatBot] Starting initialization...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        console.log('[ChatBot] User authenticated:', user.id);
        setUserId(user.id);

        // Initial fetch of messages
        console.log('[ChatBot] Fetching message history...');
        const { data: dbMessages, error } = await supabase
          .from('ai_chat_bot_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error("[ChatBot] Error fetching messages:", error);
          return;
        }

        console.log(`[ChatBot] Loaded ${dbMessages?.length || 0} messages from history.`);

        if (dbMessages && dbMessages.length > 0) {
          const formattedMessages: Message[] = dbMessages.map(msg => ({
            id: msg.id,
            role: (msg.role ?? 'user') as 'user' | 'ai',
            content: msg.content,
            timestamp: msg.created_at,
            type: (msg.type ?? 'text') as 'text' | 'image' | 'audio',
          }));
          setMessages(formattedMessages);
        } else {
          setMessages([
            {
              id: '1',
              role: 'ai',
              content: language === 'en'
                ? 'Hello! I am your agricultural assistant. Do you have any farming questions?'
                : language === 'hi'
                ? 'नमस्ते! मैं आपका कृषि सहायक हूँ। क्या आपके पास खेती से संबंधित कोई प्रश्न हैं?'
                : 'ഹലോ! ഞാൻ നിങ്ങളുടെ കൃഷി സഹായിയാണ്. നിങ്ങൾക്ക് എന്തെങ്കിലും കൃഷി ചോദ്യങ്ങളുണ്ടോ?',
              timestamp: new Date().toISOString(),
              type: 'text'
            }
          ]);
        }

        // Set up real-time subscription
        console.log('[ChatBot] Setting up real-time subscription for:', user.id);
        channel = supabase
          .channel(`ai_chat_bot_messages_for_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ai_chat_bot_messages',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log('[ChatBot] Real-time update received:', payload);
              const newMessage = payload.new as {
                id: string;
                role: 'user' | 'ai';
                content: string;
                created_at: string;
                type: 'text' | 'image' | 'audio';
              };
              setMessages(currentMessages => {
                if (currentMessages.some(m => m.id === newMessage.id)) {
                  return currentMessages;
                }
                return [...currentMessages, {
                  id: newMessage.id,
                  role: newMessage.role,
                  content: newMessage.content,
                  timestamp: newMessage.created_at,
                  type: newMessage.type,
                }];
              });
            }
          )
          .subscribe((status) => {
             console.log('[ChatBot] Subscription status:', status);
          });
      } else {
          console.warn('[ChatBot] No authenticated user found.');
      }
    };

    setup();

    // Cleanup function
    return () => {
      if (channel) {
        console.log('[ChatBot] Cleaning up subscription.');
        supabase.removeChannel(channel);
      }
    };
  }, [language]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any current speaking
    window.speechSynthesis.cancel();
    setIsPaused(false);
    setIsSpeaking(true);
    
    const cleanText = text.replace(/\*/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utteranceRef.current = utterance; // Store in ref to prevent GC
    
    // Detect language from text content
    const hindiRegex = /[\u0900-\u097F]/;
    const malayalamRegex = /[\u0D00-\u0D7F]/;
    
    let targetLang = 'en-US';
    if (hindiRegex.test(cleanText)) {
      targetLang = 'hi-IN';
    } else if (malayalamRegex.test(cleanText)) {
      targetLang = 'ml-IN';
    } else {
      // Fallback to selected language or default to English if no specific script detected
      targetLang = language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'ml-IN';
    }
    
    utterance.lang = targetLang;

    // Attempt to set a specific voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === targetLang) || 
                  voices.find(v => v.lang.startsWith(targetLang.split('-')[0]));
                  
    if (voice) {
        console.log(`[ChatBot] Using voice: ${voice.name} for language: ${targetLang}`);
        utterance.voice = voice;
    } else {
        console.warn(`[ChatBot] No specific voice found for ${targetLang}. Using default.`);
    }
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      console.error("[ChatBot] Speech synthesis error:", event);
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  };

  const togglePauseResume = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const handleSendMessage = async () => {
    const messageToSend = inputMessage.trim();
    if (!messageToSend || !userId) return;

    logAction("Sent Message to AI Assistant");
    console.log('[ChatBot] Attempting to send message:', messageToSend);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageToSend,
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      console.log('[ChatBot] Calling API endpoint /api/chatbot...');
      // Get AI response
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: messageToSend,
          language: language === 'en' ? 'en-US' : language === 'hi' ? 'hi-IN' : 'ml-IN',
        }),
      });

      console.log('[ChatBot] API Response Status:', response.status);



      const data = await response.json();
      console.log('[ChatBot] API Response Data:', data);

      if (!response.ok) {
        // If the backend sent us debug details, use them in the error
        const errorDetail = data.details || data.error || `HTTP error! status: ${response.status}`;
        throw new Error(errorDetail);
      }

      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: data.reply,
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      setMessages(prev => [...prev, aiResponse]);
      speak(data.reply);

      // Save both messages to Supabase in the background
      console.log('[ChatBot] Saving conversation to Supabase...');
      const { error } = await supabase.from('ai_chat_bot_messages').insert([
        { user_id: userId, role: 'user', content: messageToSend, type: 'text' },
        { user_id: userId, role: 'ai', content: data.reply, type: 'text' },
      ]);
      
      if (error) console.error('[ChatBot] DB Insert Error:', error);

    } catch (error) {
      console.error("[ChatBot] Critical error during AI chat:", error);
      const errorMessage: Message = {
        id: 'error-' + Date.now().toString(),
        role: 'ai',
        content: language === 'en' 
          ? "Sorry, I'm having trouble connecting. Please try again later."
          : language === 'hi'
          ? "क्षमा करें, मुझे कनेक्ट करने में समस्या हो रही है। कृपया बाद में पुनः प्रयास करें।"
          : "ക്ഷമിക്കണം, എനിക്ക് കണക്ട് ചെയ്യാൻ പ്രശ്നമുണ്ട്. ദയവായി പിന്നീട് വീണ്ടും ശ്രമിക്കുക.",
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    console.log('[ChatBot] Deleting message:', messageId);
    // Optimistically remove the message from the UI
    setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));

    // If the ID is temporary, it doesn't exist in the DB yet, so we're done.
    if (messageId.startsWith('user-') || messageId.startsWith('ai-') || messageId.startsWith('error-')) {
      console.log('[ChatBot] Message was temporary (local only), skipping DB delete.');
      return;
    }

    // Attempt to delete from Supabase in the background
    if (!userId) return;
    try {
      const { error } = await supabase
        .from('ai_chat_bot_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', userId);
      
      if (error) {
        console.error("[ChatBot] Failed to delete message from database:", error);
      } else {
        console.log("[ChatBot] Message deleted from database successfully.");
      }
    } catch (err) {
      console.error('[ChatBot] Error during message deletion:', err);
    }
  };

  const handleMicClick = async () => {
    if (isRecording) {
      logAction("Stopped Voice Recording");
      console.log('[ChatBot] Stopping microphone recording...');
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      logAction("Started Voice Recording");
      console.log('[ChatBot] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm; codecs=opus' };
      
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        mediaRecorderRef.current = new MediaRecorder(stream, options);
      } else {
        console.warn(`[ChatBot] ${options.mimeType} is not supported, falling back to default.`);
        mediaRecorderRef.current = new MediaRecorder(stream);
      }
      
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      if (!mediaRecorderRef.current) return;

      mediaRecorderRef.current.onstop = async () => {
        console.log('[ChatBot] Recording stopped. Processing audio...');
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(`[ChatBot] Audio Blob created. Size: ${audioBlob.size} bytes, Type: ${mimeType}`);
        
        // Stop all audio tracks to turn off the recording indicator
        stream.getTracks().forEach(track => track.stop());

        if (audioBlob.size === 0) {
          console.warn("[ChatBot] Recording was empty.");
          return;
        }
        
        setIsTranscribing(true);
        setInputMessage("Processing audio...");

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64Audio = (reader.result as string).split(',')[1];
              
              const url = '/api/transcribe';
              
              console.log('[ChatBot] Sending audio to local transcription API...');
              const requestBody = {
                audio: base64Audio,
                mimeType: mimeType
              };

              const response = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
              });

              if (!response.ok) {
                const errorData = await response.json();
                console.error('[ChatBot] Speech API Error:', errorData);
                throw new Error(errorData.error?.message || 'Transcription failed');
              }

              const data = await response.json();
              console.log('[ChatBot] Speech API Response:', data);

              let transcript = data.transcription || "";

              if (!transcript) {
                console.warn('[ChatBot] No transcript returned from API.');
                toast({
                  title: "No speech detected",
                  description: "Please try speaking again.",
                  variant: "destructive",
                });
                setInputMessage("");
                return;
              }
              
              console.log('[ChatBot] Transcript received:', transcript);
              setInputMessage(transcript);
            } catch (error) {
              console.error("[ChatBot] Error inside onloadend:", error);
              toast({
                title: "Transcription Error",
                description: error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
              });
              setInputMessage("");
            } finally {
              setIsTranscribing(false);
            }
          };
        } catch (error) {
          console.error("[ChatBot] Error during voice processing:", error);
          setInputMessage('');
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current.start();
      console.log('[ChatBot] Recording started.');
      setIsRecording(true);
    } catch (error) {
      console.error("[ChatBot] Error accessing microphone:", error);
      alert("Could not access microphone. Please ensure you have given permission.");
    }
  };

  const handleCameraClick = () => {
    console.log('[ChatBot] Opening file picker.');
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) {
        console.warn('[ChatBot] Upload attempted but no file selected or user not logged in.');
        return;
    }

    console.log('[ChatBot] Image selected:', file.name, file.size);

    const tempId = `img-up-${Date.now()}`;
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const imagePreviewUrl = reader.result as string;
      const imageMessage: Message = {
        id: tempId,
        role: 'user',
        content: imagePreviewUrl,
        timestamp: new Date().toISOString(),
        type: 'image',
        status: 'uploading'
      };
      setMessages(prev => [...prev, imageMessage]);
    };
    reader.readAsDataURL(file);

    try {
      console.log('[ChatBot] Uploading to Supabase Storage:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('chat_uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat_uploads')
        .getPublicUrl(filePath);

      console.log('[ChatBot] Upload successful. Public URL:', publicUrl);

      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
        ? { ...msg, content: publicUrl, status: 'uploaded' } 
        : msg
      ));

    } catch (error) {
      console.error("[ChatBot] Error uploading image:", error);
      alert("Failed to upload image. Please check console for details.");
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      console.log('[ChatBot] Message copied to clipboard.');
      toast({
        title: "Copied!",
        description: "The message has been copied to your clipboard.",
      });
    }, (err) => {
      console.error('[ChatBot] Could not copy text: ', err);
      toast({
        title: "Error",
        description: "Failed to copy the message.",
        variant: "destructive",
      });
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
            <Link to="/dashboard" className="flex items-center space-x-2 self-start sm:self-auto">
              <Leaf className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              <span className="text-lg sm:text-xl font-bold text-foreground">AgriAssist</span>
            </Link>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <Select value={language} onValueChange={(value: 'en' | 'ml' | 'hi') => {
                    console.log('[ChatBot] Language switched to:', value);
                    setLanguage(value);
                }}>
                  <SelectTrigger className="w-24 sm:w-32 h-8 sm:h-10">
                    <Languages className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm"><SelectValue /></span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ml">മലയാളം</SelectItem>
                    <SelectItem value="hi">हिंदी</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 whitespace-nowrap">
                  <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1.5 sm:mr-2 ${isRecording ? 'bg-red-500 animate-ping' : (isTranscribing ? 'bg-yellow-500 animate-pulse' : 'bg-primary animate-pulse')}`}></div>
                  {isRecording ? (language === 'en' ? 'Listening...' : language === 'hi' ? 'सुन रहा हूँ...' : 'കേട്ടുകൊണ്ടിരിക്കുന്നു...') : 
                   (isTranscribing ? (language === 'en' ? 'Processing...' : language === 'hi' ? 'प्रक्रिया...' : 'പ്രോസസ്സ്...') :
                   (language === 'en' ? 'AI Online' : language === 'hi' ? 'एआई ऑनलाइन' : 'AI ഓൺലൈൻ'))}
                </Badge>
              </div>
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
                  {language === 'en' ? 'Home' : language === 'hi' ? 'होम' : 'ഹോം'}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Chat Area */}
      <main ref={chatContainerRef} className="flex-grow container mx-auto px-4 py-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'ai' && <Bot className="w-8 h-8 text-primary flex-shrink-0" />}
                
                <div className={`group flex items-center gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'user' && (
                    <div className="order-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteMessage(msg.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  <div className={`relative p-4 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-primary text-primary-foreground order-2' : 'bg-card'}`}>
                    {msg.type === 'image' ? (
                      <div className="relative">
                        <img src={msg.content} alt="User upload" className="rounded-md max-w-xs" />
                        {msg.status === 'uploading' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                            <p className="text-white text-sm">Uploading...</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{msg.content.replace(/\*/g, '')}</p>
                    )}
                    <div className="text-xs opacity-60 mt-2 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                    {msg.role === 'ai' && msg.id !== '1' && !msg.id.startsWith('error-') && (
                      <div className="flex items-center justify-end gap-2 mt-2 border-t border-border pt-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => speak(msg.content)}>
                          <Volume2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyMessage(msg.content)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {msg.role === 'user' && <User className="w-8 h-8 text-muted-foreground flex-shrink-0 order-3" />}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <Bot className="w-8 h-8 text-primary flex-shrink-0 animate-pulse" />
                <div className="p-4 rounded-lg bg-card max-w-lg">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Speech Controls */}
      {(isSpeaking || isPaused) && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-sm font-medium animate-pulse">
            {isPaused ? "Paused" : "Speaking..."}
          </span>
          <div className="flex items-center gap-2">
            <Button 
              variant="secondary" 
              size="icon" 
              className="h-8 w-8 rounded-full" 
              onClick={togglePauseResume}
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button 
              variant="destructive" 
              size="icon" 
              className="h-8 w-8 rounded-full" 
              onClick={stopSpeech}
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <footer className="sticky bottom-0 bg-background/80 backdrop-blur-sm border-t border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <Card className="p-2">
              <div className="flex items-center">
                <Textarea
                  placeholder={
                    language === 'en' 
                      ? "Ask me anything about farming..." 
                      : language === 'hi' 
                      ? "खेती के बारे में मुझसे कुछ भी पूछें..." 
                      : "കൃഷിയെക്കുറിച്ച് എന്തും ചോദിക്കുക..."
                  }
                  className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none resize-none"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || isTranscribing}
                  rows={1}
                />
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <Button variant="ghost" size="icon" onClick={handleMicClick}>
                  <Mic className={`w-5 h-5 ${isRecording ? 'text-red-500' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleCameraClick}>
                  <Camera className="w-5 h-5" />
                </Button>
                <Button onClick={handleSendMessage} disabled={isLoading || isTranscribing || !inputMessage.trim()}>
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </Card>
            <p className="text-xs text-center text-muted-foreground mt-2">
              {language === 'en' 
                ? "AgriAssist can make mistakes. Consider checking important information."
                : language === 'hi'
                ? "AgriAssist गलतियाँ कर सकता है। महत्वपूर्ण जानकारी की जाँच करने पर विचार करें।"
                : "AgriAssist-ന് തെറ്റുകൾ ഉണ്ടാകാം. പ്രധാന വിവരങ്ങൾ പരിശോധിക്കാൻ പരിഗണിക്കുക."
              }
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ChatBot;