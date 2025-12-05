
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { HeartHandshake, User, Sparkles } from 'lucide-react';

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
            flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center shadow-sm border 
            ${isUser 
                ? 'bg-indigo-100 text-indigo-600 border-white/50 dark:bg-neutral-800 dark:text-indigo-300 dark:border-neutral-700' 
                : 'bg-gradient-to-tr from-teal-300 to-emerald-300 text-white dark:from-teal-700 dark:to-emerald-700 dark:text-teal-100 border-white/50 dark:border-transparent'}
        `}>
          {isUser ? <User size={18} /> : <HeartHandshake size={18} />}
        </div>

        {/* Bubble */}
        <div 
          className={`
            relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all overflow-hidden
            ${isUser 
              ? 'bg-indigo-600 text-white rounded-[24px] rounded-br-sm' 
              : 'bg-white/90 dark:bg-neutral-900 backdrop-blur-sm text-slate-700 dark:text-neutral-200 rounded-[24px] rounded-bl-sm border border-indigo-50/50 dark:border-neutral-800'}
          `}
        >
          {/* Attachment Display */}
          {message.attachment && (
            <div className="mb-3 rounded-lg overflow-hidden border border-white/20 dark:border-white/10">
              {message.attachment.type === 'image' && (
                <img 
                  src={message.attachment.previewUrl || message.attachment.data} 
                  alt="Attachment" 
                  className="max-w-full h-auto max-h-[200px] object-cover"
                />
              )}
            </div>
          )}

          <div className="markdown-content">
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
          <span className={`text-[10px] absolute -bottom-5 ${isUser ? 'right-1 text-indigo-300/80 dark:text-neutral-500' : 'left-1 text-slate-400/80 dark:text-neutral-500'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};