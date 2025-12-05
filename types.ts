export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Task {
  title: string;
  description: string;
  difficulty: 'Gentle' | 'Moderate' | 'Challenge';
  completed: boolean;
}

export enum AppMode {
  CHAT = 'CHAT',
  TASKS = 'TASKS'
}

export interface TaskResponse {
  tasks: Array<{
    title: string;
    description: string;
    difficulty: string;
  }>;
}

export type AiProvider = 'gemini' | 'openai';

export interface AiSettings {
  provider: AiProvider;
  modelId: string;
  openaiKey?: string; // User provided key for OpenAI
}

export const AVAILABLE_MODELS = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
    { id: 'gemini-2.5-flash-lite-latest', name: 'Gemini 2.5 Flash Lite' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (Smart)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  ]
};
