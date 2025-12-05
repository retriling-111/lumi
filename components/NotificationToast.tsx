
import React, { useEffect, useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Task } from '../types';

interface NotificationToastProps {
  task: Task | null;
  onDismiss: () => void;
  onComplete: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ task, onDismiss, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (task) {
      setVisible(true);
      // Play a gentle sound if desired
      // const audio = new Audio('/notification.mp3');
      // audio.play().catch(e => console.log('Audio play failed', e));
    } else {
      setVisible(false);
    }
  }, [task]);

  if (!task && !visible) return null;

  return (
    <div 
      className={`
        fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm
        transition-all duration-500 transform
        ${task ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
      `}
    >
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md shadow-2xl border border-indigo-100 dark:border-neutral-800 rounded-2xl p-4 flex items-start gap-4 ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center animate-bounce-subtle">
          <Bell size={20} fill="currentColor" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-800 dark:text-neutral-100 mb-0.5">Reminder</h4>
          <p className="text-sm text-slate-600 dark:text-neutral-300 truncate font-medium">{task?.title}</p>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mt-0.5">{task?.description || "It's time for this gentle step."}</p>
          
          <div className="flex gap-3 mt-3">
            <button 
              onClick={() => task && onComplete(task.id)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <Check size={14} /> Complete
            </button>
            <button 
              onClick={onDismiss}
              className="flex-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 text-xs font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <X size={14} /> Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
