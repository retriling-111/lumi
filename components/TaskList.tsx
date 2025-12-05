import React from 'react';
import { Task } from '../types';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onToggle: (index: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onToggle, onGenerate, isLoading }) => {
  return (
    <div className="w-full max-w-md mx-auto p-4 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Small Steps</h2>
        <p className="text-slate-500">Achievable goals to brighten your day.</p>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-slate-100">
          <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-orange-400">
            <Sparkles size={32} />
          </div>
          <p className="text-slate-600 mb-6 px-8">Ready to try something new? Let's generate a few gentle tasks for you.</p>
          <button
            onClick={onGenerate}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {isLoading ? 'Thinking...' : 'Generate Tasks'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={index}
              onClick={() => onToggle(index)}
              className={`
                group cursor-pointer relative overflow-hidden p-4 rounded-xl border transition-all duration-300
                ${task.completed 
                  ? 'bg-emerald-50 border-emerald-100 opacity-80' 
                  : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md'}
              `}
            >
              <div className="flex items-start gap-4">
                <div className={`mt-1 transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-300 group-hover:text-indigo-400'}`}>
                  {task.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-semibold mb-1 ${task.completed ? 'text-emerald-800 line-through' : 'text-slate-800'}`}>
                      {task.title}
                    </h3>
                    <span className={`
                      text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full
                      ${task.difficulty === 'Gentle' ? 'bg-blue-100 text-blue-600' : ''}
                      ${task.difficulty === 'Moderate' ? 'bg-orange-100 text-orange-600' : ''}
                      ${task.difficulty === 'Challenge' ? 'bg-rose-100 text-rose-600' : ''}
                    `}>
                      {task.difficulty}
                    </span>
                  </div>
                  <p className={`text-sm ${task.completed ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {task.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          <div className="mt-8 flex justify-center">
             <button
              onClick={onGenerate}
              disabled={isLoading}
              className="text-slate-400 hover:text-indigo-600 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Sparkles size={16} />
              Refresh Ideas
            </button>
          </div>
        </div>
      )}
    </div>
  );
};