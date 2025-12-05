
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Menu, Sparkles, MessageCircle, CheckSquare, X, Settings as SettingsIcon, Key, ChevronDown, CheckCircle, Moon, Sun, Mic, Paperclip, Image as ImageIcon, HeartHandshake, Trash2 } from 'lucide-react';
import { sendMessageToAi, generateDailyTasks, generateMotivation, HARDCODED_GEMINI_KEY } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { TaskList } from './components/TaskList';
import { NotificationToast } from './components/NotificationToast';
import { Message, Task, AppMode, AiSettings, AVAILABLE_MODELS, Attachment } from './types';

// Global declaration for Web Speech API
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

// Gentle notification sound (base64)
const NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Shortened placeholder for concept. In a real app, use a real file.
// A slightly longer beep for effect (still placeholder length for brevity in response, but logic handles play)
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

function App() {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello, my friend. I'm Lumi. ☁️ \n\nI'm here to listen, support you, and help you find a little brightness today. How are you feeling right now?",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskLoading, setIsTaskLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Voice & File State
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | undefined>(undefined);

  // Notification State
  const [activeNotificationTask, setActiveNotificationTask] = useState<Task | null>(null);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('lumi_theme');
    return saved === 'dark';
  });

  // Settings State
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
    const saved = localStorage.getItem('lumi_settings');
    return saved ? JSON.parse(saved) : {
        provider: 'gemini',
        modelId: 'gemini-2.5-flash',
        geminiKey: ''
    };
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // --- Effects ---

  // Persist settings
  useEffect(() => {
    localStorage.setItem('lumi_settings', JSON.stringify(aiSettings));
  }, [aiSettings]);

  // Handle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('lumi_theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('lumi_theme', 'light');
    }
  }, [isDarkMode]);

  // Auto-scroll
  useEffect(() => {
    if (mode === AppMode.CHAT) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode, isTyping, attachment]);

  // Request Notification Permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Reminder Check Interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;

      setTasks(prevTasks => {
        let hasUpdates = false;
        const updatedTasks = prevTasks.map(task => {
          // Check if task has a reminderTime, hasn't been notified yet, isn't completed, and matches current time
          if (task.reminderTime === currentTimeString && !task.notified && !task.completed) {
            hasUpdates = true;
            
            // Trigger In-App Notification
            setActiveNotificationTask(task);
            playNotificationSound();

            // Trigger Browser Notification
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Lumi: ${task.title}`, {
                body: task.description || "It's time for this gentle step.",
                icon: '/manifest-icon-192.png' // Fallback to whatever icon is available
              });
            }

            return { ...task, notified: true };
          }
          return task;
        });

        return hasUpdates ? updatedTasks : prevTasks;
      });

    }, 5000); // Check every 5 seconds for better precision

    return () => clearInterval(intervalId);
  }, []);

  // --- Handlers ---

  const checkApiKey = () => {
    // Check hardcoded key
    if (HARDCODED_GEMINI_KEY && HARDCODED_GEMINI_KEY.length > 5) return true;
    // Check User Settings Key
    if (aiSettings.geminiKey) return true;
    // Check ENV as last resort
    if (process.env.API_KEY) return true;
    
    setSettingsOpen(true);
    return false;
  };

  const handleSendMessage = async () => {
    if ((!inputText.trim() && !attachment) || isTyping) return;

    if (!checkApiKey()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date(),
      attachment: attachment // Pass attachment to message
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setAttachment(undefined); // Clear attachment
    setIsTyping(true);

    try {
      const history = messages.slice(-10); 
      // Pass the attachment to the service
      const responseText = await sendMessageToAi(userMsg.text, history, aiSettings, userMsg.attachment);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      
      if (error.message.includes("Key is missing")) {
        setSettingsOpen(true);
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `I'm having a little trouble connecting. \n\n**Reason:** ${error.message || 'Unknown error'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- Voice Input Logic ---
  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(prev => (prev ? prev + ' ' + transcript : transcript));
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- File Upload Logic ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix for Gemini API (keep it for preview)
      const base64Data = base64String.split(',')[1];
      
      setAttachment({
        type: file.type.startsWith('image') ? 'image' : 'file',
        mimeType: file.type,
        data: base64Data,
        previewUrl: base64String,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = () => {
    setAttachment(undefined);
  };

  // --- Task Management Logic ---

  const handleAddTask = (title: string, reminderTime?: string) => {
    const newTask: Task = {
        id: crypto.randomUUID(),
        title,
        completed: false,
        reminderTime: reminderTime, // Map to new field
        description: "",
        difficulty: 'Gentle',
        notified: false
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const generateTasks = async () => {
    if (!checkApiKey()) return;

    setIsTaskLoading(true);
    // Use the very last user message to gauge sentiment, or a fallback if conversation just started
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.text || "I need a little help getting started";
    
    try {
        const response = await generateDailyTasks(lastUserMessage, aiSettings);
        if (response && response.tasks) {
          const newAiTasks: Task[] = response.tasks.map(t => ({
            id: crypto.randomUUID(),
            title: t.title,
            description: t.description,
            difficulty: t.difficulty as 'Gentle' | 'Moderate' | 'Challenge',
            completed: false,
            notified: false,
            reminderTime: undefined // Explicitly undefined for AI tasks unless user edits (future feature)
          }));
          // Append new AI tasks to existing list
          setTasks(prev => [...prev, ...newAiTasks]);
        }
    } catch (error: any) {
        if (error.message?.includes("Key is missing")) {
            setSettingsOpen(true);
        }
    }
    setIsTaskLoading(false);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
    ));
    // If we completed the active notification task, close the toast
    if (activeNotificationTask && activeNotificationTask.id === id) {
      setActiveNotificationTask(null);
    }
  };

  const handleNotificationComplete = (id: string) => {
    toggleTask(id);
    setActiveNotificationTask(null);
  };

  const handleGetMotivation = async () => {
    if (!checkApiKey()) return;

    setSidebarOpen(false);
    setMode(AppMode.CHAT);
    setIsTyping(true);
    
    try {
        const quote = await generateMotivation(aiSettings);
        const botMsg: Message = {
            id: Date.now().toString(),
            role: 'model',
            text: `✨ ${quote}`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
         if (error.message?.includes("Key is missing")) {
            setSettingsOpen(true);
        }
        const botMsg: Message = {
            id: Date.now().toString(),
            role: 'model',
            text: "I couldn't get a quote right now, but remember: You matter.",
            timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
    }
    setIsTyping(false);
  };

  // --- Render Helpers ---

  const renderSettingsModal = () => {
    if (!settingsOpen) return null;
    
    const hasHardcodedGemini = HARDCODED_GEMINI_KEY && HARDCODED_GEMINI_KEY.length > 5;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}></div>
            <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10 border border-white/50 dark:border-neutral-800">
                <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex justify-between items-center bg-white/50 dark:bg-neutral-900/50">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-neutral-100 flex items-center gap-2">
                        <SettingsIcon size={20} className="text-slate-400"/> Settings
                    </h2>
                    <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-neutral-800 p-1.5 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">

                    {/* Model Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-600 dark:text-neutral-400">Gemini Model</label>
                        <div className="relative">
                            <select 
                                value={aiSettings.modelId}
                                onChange={(e) => setAiSettings({...aiSettings, modelId: e.target.value})}
                                className="w-full appearance-none bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            >
                                {AVAILABLE_MODELS.gemini.map(model => (
                                    <option key={model.id} value={model.id}>{model.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    
                    {/* API Key Status for Gemini */}
                     <div className="space-y-3 animate-fade-in">
                        <label className="text-sm font-semibold text-slate-600 dark:text-neutral-400 flex items-center gap-2">
                            <Key size={16} /> Gemini API Key
                        </label>
                        
                        {hasHardcodedGemini ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/50">
                                <CheckCircle size={14} />
                                <span>Code Key Detected</span>
                            </div>
                        ) : (
                             <input 
                                type="password" 
                                placeholder="Paste Gemini API Key..."
                                value={aiSettings.geminiKey || ''}
                                onChange={(e) => {
                                    setAiSettings({...aiSettings, geminiKey: e.target.value});
                                }}
                                className="w-full bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
                            />
                        )}
                        {!hasHardcodedGemini && (
                            <p className="text-[10px] text-slate-400 px-1">
                                Your key is stored locally in your browser.
                            </p>
                        )}
                     </div>

                </div>

                <div className="p-4 bg-slate-50/50 dark:bg-neutral-800/50 text-center border-t border-slate-100 dark:border-neutral-800">
                    <button 
                        onClick={() => setSettingsOpen(false)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3.5 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95 transition-all"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-rose-50 via-indigo-50 to-teal-50 dark:from-black dark:via-neutral-900 dark:to-black relative font-sans text-slate-800 dark:text-neutral-100 transition-colors duration-500">
      
      {/* Notification Toast */}
      <NotificationToast 
        task={activeNotificationTask} 
        onDismiss={() => setActiveNotificationTask(null)}
        onComplete={handleNotificationComplete}
      />

      {/* Header */}
      <header className="bg-white/60 dark:bg-black/60 backdrop-blur-md border-b border-white/50 dark:border-neutral-900 h-16 flex items-center justify-between px-5 sticky top-0 z-10 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-200/50 dark:shadow-none">
            <HeartHandshake size={22} className="text-white" />
          </div>
          <div>
              <h1 className="font-bold text-lg leading-none text-slate-800 dark:text-neutral-100 tracking-tight">Lumi</h1>
              <p className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase mt-0.5">
                Gentle Companion
              </p>
          </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-neutral-800 dark:text-neutral-400 dark:hover:text-indigo-400 rounded-xl transition-all"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setSettingsOpen(true)} className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-neutral-800 dark:text-neutral-400 dark:hover:text-indigo-400 rounded-xl transition-all">
                <SettingsIcon size={20} />
            </button>
            <button onClick={() => setSidebarOpen(true)} className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-neutral-800 dark:text-neutral-400 dark:hover:text-indigo-400 rounded-xl transition-all">
                <Menu size={20} />
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative scroll-smooth no-scrollbar">
        {mode === AppMode.CHAT ? (
          <div className="max-w-3xl mx-auto px-4 py-6 min-h-full flex flex-col justify-end">
            <div className="flex-1 min-h-[100px]"></div>
            
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            
            {isTyping && (
               <div className="flex w-full mb-6 justify-start animate-pulse">
                <div className="flex items-end gap-2">
                   <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-50 to-teal-100 dark:from-neutral-800 dark:to-neutral-900 border border-teal-200 dark:border-neutral-700 flex items-center justify-center text-teal-600 dark:text-teal-400">
                      <Sparkles size={16} />
                   </div>
                   <div className="bg-white/80 dark:bg-neutral-900 backdrop-blur-sm px-5 py-4 rounded-[24px] rounded-bl-sm text-slate-500 dark:text-neutral-400 text-sm shadow-sm border border-white dark:border-neutral-800">
                      Thinking...
                   </div>
                </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto pt-8 px-4">
            <TaskList 
              tasks={tasks} 
              onToggle={toggleTask} 
              onDelete={handleDeleteTask}
              onAdd={handleAddTask}
              onGenerate={generateTasks} 
              isLoading={isTaskLoading} 
            />
          </div>
        )}
      </main>

      {/* Input Area */}
      {mode === AppMode.CHAT && (
        <div className="p-4 pb-safe bg-gradient-to-t from-white/90 via-white/80 to-transparent dark:from-black/90 dark:via-black/80 backdrop-blur-[1px]">
          <div className="max-w-3xl mx-auto">
            
            {/* Attachment Preview */}
            {attachment && (
                <div className="mb-2 mx-2 bg-white dark:bg-neutral-900 rounded-2xl p-2 inline-flex items-center gap-3 border border-indigo-100 dark:border-neutral-800 shadow-lg animate-fade-in-up">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                        {attachment.type === 'image' ? (
                            <img src={attachment.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <Paperclip size={20} className="text-slate-400" />
                        )}
                    </div>
                    <div className="flex flex-col pr-2">
                        <span className="text-xs font-medium text-slate-700 dark:text-neutral-200 max-w-[150px] truncate">
                            {attachment.name || 'Attachment'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                            Ready to send
                        </span>
                    </div>
                    <button 
                        onClick={removeAttachment}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}

            {/* Input Capsule */}
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-2 rounded-[32px] shadow-xl shadow-indigo-100/50 dark:shadow-none border border-indigo-50/50 dark:border-neutral-800 transition-colors">
                
                {/* Upload Button */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept="image/*,audio/*"
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-neutral-800 dark:hover:text-indigo-400 transition-all active:scale-95"
                    title="Upload image or file"
                >
                    <Paperclip size={20} />
                </button>

                {/* Text Input */}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={isListening ? "Listening..." : "Tell me how you're feeling..."}
                    className="flex-1 bg-transparent text-slate-800 dark:text-neutral-100 px-2 py-3 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-neutral-600 text-[16px]"
                />

                {/* Voice Input */}
                <button 
                    onClick={toggleVoiceInput}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${isListening ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200 dark:shadow-none' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-neutral-800 dark:hover:text-indigo-400'}`}
                >
                   <Mic size={20} />
                </button>

                {/* Send Button */}
                <button
                    onClick={handleSendMessage}
                    disabled={(!inputText.trim() && !attachment) || isTyping}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-neutral-800 disabled:text-slate-400 dark:disabled:text-neutral-600 text-white w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                    <ArrowUp size={20} />
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] transition-opacity"
            onClick={() => setSidebarOpen(false)}
          ></div>
          <div className="relative w-80 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl h-full shadow-2xl p-6 flex flex-col animate-slide-in-right border-l border-white/50 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-bold text-slate-800 dark:text-neutral-100 tracking-tight">Menu</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 bg-slate-50 dark:bg-neutral-800 p-2.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => { setMode(AppMode.CHAT); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${mode === AppMode.CHAT ? 'bg-indigo-50 dark:bg-neutral-800 text-indigo-700 dark:text-indigo-300 font-semibold shadow-sm ring-1 ring-indigo-100 dark:ring-neutral-700' : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${mode === AppMode.CHAT ? 'bg-indigo-200 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200' : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-500'}`}>
                    <MessageCircle size={20} />
                </div>
                <div>
                    <span className="block text-[15px]">Chat</span>
                    <span className="text-[11px] font-normal opacity-70">Talk to Lumi</span>
                </div>
              </button>
              
              <button
                onClick={() => { setMode(AppMode.TASKS); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${mode === AppMode.TASKS ? 'bg-teal-50 dark:bg-neutral-800 text-teal-700 dark:text-teal-300 font-semibold shadow-sm ring-1 ring-teal-100 dark:ring-neutral-700' : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-50 dark:hover:bg-neutral-800'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${mode === AppMode.TASKS ? 'bg-teal-200 dark:bg-teal-900 text-teal-700 dark:text-teal-200' : 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-500'}`}>
                    <CheckSquare size={20} />
                </div>
                <div>
                    <span className="block text-[15px]">Success Tasks</span>
                    <span className="text-[11px] font-normal opacity-70">Small gentle steps</span>
                </div>
              </button>

              <hr className="border-slate-100 dark:border-neutral-800 my-4" />

              <button
                onClick={handleGetMotivation}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-600 dark:text-neutral-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-300 transition-all group"
              >
                 <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles size={20} />
                </div>
                <div>
                    <span className="block text-[15px]">Get Motivation</span>
                    <span className="text-[11px] font-normal opacity-70">A warm thought</span>
                </div>
              </button>
            </div>
            
            <div className="mt-auto text-center">
                 <p className="text-xs text-slate-300 dark:text-neutral-600">Made with warmth 💙</p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {renderSettingsModal()}
    </div>
  );
}

export default App;
