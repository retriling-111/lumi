
export interface Attachment {
  type: 'image' | 'file';
  mimeType: string;
  data: string; // Base64 string
  previewUrl?: string; // For displaying in UI
  name?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachment?: Attachment;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  difficulty?: 'Gentle' | 'Moderate' | 'Challenge';
  completed: boolean;
  reminderTime?: string; // Renamed from 'time' to be explicit
  notified?: boolean; // Track if notification has fired
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

export type AiProvider = 'gemini';

export interface AiSettings {
  provider: AiProvider;
  modelId: string;
  geminiKey?: string; // User provided key for Gemini
}

export const AVAILABLE_MODELS = {
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast)' },
    { id: 'gemini-2.5-flash-lite-latest', name: 'Gemini 2.5 Flash Lite' },
    { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini 2.0 Flash Thinking' },
  ]
};
