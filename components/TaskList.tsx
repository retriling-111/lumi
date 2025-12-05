
import React, { useState } from 'react';
import { Task } from '../types';
import { CheckCircle2, Circle, Sparkles, Plus, Clock, Trash2, X, BellRing } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string, reminderTime?: string) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onToggle, onDelete, onAdd, onGenerate, isLoading }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskReminderTime, setNewTaskReminderTime] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      onAdd(newTaskTitle, newTaskReminderTime || undefined);
      setNewTaskTitle('');
      setNewTaskReminderTime('');
      setIsAdding(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto animate-fade-in pb-20">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-neutral-100 mb-2 tracking-tight">Your Gentle Steps</h2>
        <p className="text-slate-500 dark:text-neutral-400 text-sm">Small actions, one at a time.</p>
      </div>

      {/* Manual Add Task Form */}
      <div className="mb-8">
        {!isAdding ? (
           <button 
             onClick={() => setIsAdding(true)}
             className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-neutral-800 text-slate-400 dark:text-neutral-500 hover:border-indigo-300 dark:hover:border-indigo-800 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2 font-medium bg-white/50 dark:bg-neutral-900/50"
           >
             <Plus size={20} /> Add a task for yourself
           </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl shadow-lg border border-indigo-100 dark:border-neutral-800 animate-fade-in-up">
            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">New Task</span>
                <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300">
                    <X size={18} />
                </button>
            </div>
            
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="What would you like to do?"
              className="w-full bg-transparent text-lg text-slate-800 dark:text-neutral-100 placeholder:text-slate-300 dark:placeholder:text-neutral-600 border-none focus:outline-none mb-4"
              autoFocus
            />
            
            <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-50 dark:bg-neutral-800 rounded-xl px-3 py-2 flex items-center gap-2 border border-slate-100 dark:border-neutral-700 focus-within:border-indigo-400 dark:focus-within:border-indigo-800 transition-colors">
                    <Clock size={16} className="text-slate-400" />
                    <input 
                        type="time" 
                        value={newTaskReminderTime}
                        onChange={(e) => setNewTaskReminderTime(e.target.value)}
                        className="bg-transparent text-sm text-slate-600 dark:text-neutral-300 focus:outline-none w-full"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={!newTaskTitle.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-3">
        {tasks.length === 0 && !isAdding && (
             <div className="text-center py-10 opacity-60">
                <p className="text-slate-400 dark:text-neutral-600 italic">No tasks yet. Take a breath.</p>
             </div>
        )}

        {tasks.map((task) => (
            <div
              key={task.id}
              className={`
                group relative overflow-hidden p-4 rounded-2xl border transition-all duration-300
                ${task.completed 
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100/50 dark:border-emerald-900/30 opacity-60' 
                  : 'bg-white dark:bg-neutral-900 border-white dark:border-neutral-800 hover:border-indigo-200 dark:hover:border-neutral-700 shadow-sm'}
              `}
            >
              <div className="flex items-start gap-3">
                <button 
                    onClick={() => onToggle(task.id)}
                    className={`mt-0.5 transition-all duration-300 ${task.completed ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-300 dark:text-neutral-600 hover:text-indigo-500 dark:hover:text-indigo-400'}`}
                >
                  {task.completed ? <CheckCircle2 size={24} fill="currentColor" className="text-emerald-500 dark:text-emerald-400" /> : <Circle size={24} />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-medium text-[15px] truncate pr-2 transition-all ${task.completed ? 'text-emerald-800 dark:text-emerald-400 line-through decoration-emerald-300/50' : 'text-slate-800 dark:text-neutral-200'}`}>
                      {task.title}
                    </h3>
                  </div>
                  
                  {(task.description || task.reminderTime) && (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                          {task.reminderTime && (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${task.completed ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20 dark:text-indigo-300'}`}>
                                  <BellRing size={10} /> {task.reminderTime}
                              </span>
                          )}
                          {task.description && (
                              <p className={`text-xs truncate max-w-full ${task.completed ? 'text-emerald-600/60 dark:text-emerald-400/50' : 'text-slate-400 dark:text-neutral-500'}`}>
                                {task.description}
                              </p>
                          )}
                      </div>
                  )}
                </div>

                <button 
                    onClick={() => onDelete(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400 dark:text-neutral-600 dark:hover:text-rose-400 transition-all p-1"
                >
                    <Trash2 size={16} />
                </button>
              </div>
            </div>
        ))}
      </div>
      
      {/* AI Suggestions Button */}
      <div className="mt-8 flex justify-center">
         <button
          onClick={onGenerate}
          disabled={isLoading}
          className="group text-slate-400 hover:text-indigo-600 dark:text-neutral-500 dark:hover:text-indigo-400 text-sm font-medium transition-colors flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-white/50 dark:hover:bg-neutral-800/50"
        >
          {isLoading ? (
             <Sparkles size={16} className="animate-spin text-indigo-500"/>
          ) : (
             <Sparkles size={16} className="group-hover:rotate-12 transition-transform text-indigo-400"/>
          )}
          {isLoading ? "Thinking..." : "Add suggestions from Lumi"}
        </button>
      </div>

    </div>
  );
};
