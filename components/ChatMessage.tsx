import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { Bot, User, Sparkles } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
        
        {/* Avatar */}
        <div className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm
            ${isUser 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gradient-to-tr from-teal-400 to-emerald-400 text-white'}
        `}>
          {isUser ? <User size={16} /> : <Sparkles size={16} />}
        </div>

        {/* Bubble */}
        <div 
          className={`
            relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm
            ${isUser 
              ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm' 
              : 'bg-white/80 backdrop-blur-sm border border-white text-slate-700 rounded-2xl rounded-bl-sm'}
          `}
        >
          <div className="markdown-content">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
          <span className={`text-[10px] absolute -bottom-5 ${isUser ? 'right-0 text-slate-400' : 'left-0 text-slate-400'} opacity-60`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};
