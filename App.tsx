import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, Sparkles, MessageCircle, CheckSquare, X, Settings as SettingsIcon, Brain, Key, ChevronDown } from 'lucide-react';
import { sendMessageToAi, generateDailyTasks, generateMotivation } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { TaskList } from './components/TaskList';
import { Message, Task, AppMode, AiSettings, AVAILABLE_MODELS } from './types';

function App() {
  // --- State ---
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi there. I'm Lumi. I'm here to listen if you want to talk, or just keep you company. How are you feeling right now? 🌿",
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

  // Settings State
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => {
    const saved = localStorage.getItem('lumi_settings');
    return saved ? JSON.parse(saved) : {
        provider: 'gemini',
        modelId: 'gemini-2.5-flash',
        openaiKey: ''
    };
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  // Persist settings
  useEffect(() => {
    localStorage.setItem('lumi_settings', JSON.stringify(aiSettings));
  }, [aiSettings]);

  // Auto-scroll
  useEffect(() => {
    if (mode === AppMode.CHAT) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode, isTyping]);

  // --- Handlers ---

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Pass current messages history for context (excluding the just added one for simplicity in slicing, but logic handles it)
      const history = messages.slice(-10); // Keep last 10 messages for context
      const responseText = await sendMessageToAi(userMsg.text, history, aiSettings);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `I'm having trouble connecting to ${aiSettings.provider === 'openai' ? 'OpenAI' : 'my servers'}. ${error.message || ''}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const generateTasks = async () => {
    setIsTaskLoading(true);
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.text || "feeling a bit unmotivated";
    
    const response = await generateDailyTasks(lastUserMessage, aiSettings);
    if (response && response.tasks) {
      const newTasks = response.tasks.map(t => ({
        ...t,
        difficulty: t.difficulty as 'Gentle' | 'Moderate' | 'Challenge',
        completed: false
      }));
      setTasks(newTasks);
    }
    setIsTaskLoading(false);
  };

  const toggleTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks[index].completed = !newTasks[index].completed;
    setTasks(newTasks);
  };

  const handleGetMotivation = async () => {
    setSidebarOpen(false);
    setMode(AppMode.CHAT);
    setIsTyping(true);
    
    const quote = await generateMotivation(aiSettings);
    const botMsg: Message = {
        id: Date.now().toString(),
        role: 'model',
        text: `Here is a thought for you: \n\n> "${quote}"`,
        timestamp: new Date()
    };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  // --- Render Helpers ---

  const renderSettingsModal = () => {
    if (!settingsOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSettingsOpen(false)}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative z-10">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <SettingsIcon size={20} className="text-slate-400"/> Settings
                    </h2>
                    <button onClick={() => setSettingsOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Provider Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                            <Brain size={16} /> AI Provider
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                            <button 
                                onClick={() => setAiSettings({...aiSettings, provider: 'gemini', modelId: AVAILABLE_MODELS.gemini[0].id})}
                                className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${aiSettings.provider === 'gemini' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Gemini
                            </button>
                            <button 
                                onClick={() => setAiSettings({...aiSettings, provider: 'openai', modelId: AVAILABLE_MODELS.openai[0].id})}
                                className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${aiSettings.provider === 'openai' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                OpenAI
                            </button>
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-600">Model</label>
                        <div className="relative">
                            <select 
                                value={aiSettings.modelId}
                                onChange={(e) => setAiSettings({...aiSettings, modelId: e.target.value})}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {AVAILABLE_MODELS[aiSettings.provider].map(model => (
                                    <option key={model.id} value={model.id}>{model.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* OpenAI Key Input */}
                    {aiSettings.provider === 'openai' && (
                        <div className="space-y-3 animate-fade-in">
                            <label className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                                <Key size={16} /> API Key
                            </label>
                            <input 
                                type="password" 
                                placeholder="sk-..."
                                value={aiSettings.openaiKey || ''}
                                onChange={(e) => setAiSettings({...aiSettings, openaiKey: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                            />
                            <p className="text-[10px] text-slate-400">Your key is stored locally in your browser.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 text-center">
                    <button 
                        onClick={() => setSettingsOpen(false)}
                        className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-indigo-50 to-teal-50 relative font-sans text-slate-800">
      
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md border-b border-white/50 h-16 flex items-center justify-between px-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles size={20} />
          </div>
          <div>
              <h1 className="font-bold text-lg leading-none text-slate-800">Lumi</h1>
              <p className="text-[10px] font-medium text-slate-400 tracking-wide uppercase">
                {aiSettings.provider === 'gemini' ? 'Gemini Powered' : 'OpenAI Powered'}
              </p>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setSettingsOpen(true)} className="p-2 text-slate-500 hover:bg-white/50 rounded-xl transition-all">
                <SettingsIcon size={22} />
            </button>
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-500 hover:bg-white/50 rounded-xl transition-all">
                <Menu size={22} />
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
                   <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                      <Sparkles size={16} />
                   </div>
                   <div className="bg-white/80 backdrop-blur-sm px-4 py-3 rounded-2xl rounded-bl-none text-slate-400 text-sm shadow-sm border border-white">
                      Lumi is thinking...
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
              onGenerate={generateTasks} 
              isLoading={isTaskLoading} 
            />
          </div>
        )}
      </main>

      {/* Input Area */}
      {mode === AppMode.CHAT && (
        <div className="p-4 pb-safe bg-gradient-to-t from-white via-white/90 to-transparent">
          <div className="max-w-3xl mx-auto flex items-center gap-3 bg-white p-2 rounded-[2rem] shadow-xl shadow-indigo-100 border border-indigo-50">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Tell me how you're feeling..."
              className="flex-1 bg-transparent text-slate-800 px-4 py-2 focus:outline-none placeholder:text-slate-400 ml-2"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white w-10 h-10 flex items-center justify-center rounded-full transition-all shadow-md active:scale-95"
            >
              <Send size={18} />
            </button>
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
          <div className="relative w-72 bg-white/95 backdrop-blur-xl h-full shadow-2xl p-6 flex flex-col animate-slide-in-right border-l border-white/50">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-bold text-slate-800">Menu</h2>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => { setMode(AppMode.CHAT); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${mode === AppMode.CHAT ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === AppMode.CHAT ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                    <MessageCircle size={18} />
                </div>
                Chat
              </button>
              
              <button
                onClick={() => { setMode(AppMode.TASKS); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${mode === AppMode.TASKS ? 'bg-teal-50 text-teal-700 font-semibold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mode === AppMode.TASKS ? 'bg-teal-200 text-teal-700' : 'bg-slate-100 text-slate-500'}`}>
                    <CheckSquare size={18} />
                </div>
                Success Tasks
              </button>

              <hr className="border-slate-100 my-4" />

              <button
                onClick={handleGetMotivation}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-all group"
              >
                 <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles size={18} />
                </div>
                Get Motivation
              </button>
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
