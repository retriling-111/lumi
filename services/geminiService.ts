import { GoogleGenAI, Chat, Type } from "@google/genai";
import { TaskResponse, AiSettings } from "../types";

// --- Configuration & Constants ---

const GEMINI_API_KEY = process.env.API_KEY; // Injected env var
const DEFAULT_OPENAI_KEY = process.env.OPENAI_API_KEY; // Optional env var

const SYSTEM_INSTRUCTION = `
You are Lumi, a compassionate, warm, and gentle AI companion. 
Your purpose is to listen to users who may be feeling sad, anxious, or unmotivated.
- Listen actively and validate their feelings.
- Offer warm, non-judgmental support.
- Keep responses concise and conversational (under 100 words unless asked for more).
- Use comforting emojis occasionally (🌿, 🌤️, 💙, ✨).
- If the user seems ready, gently suggest a small positive action, but prioritize listening first.
- Do not be overly clinical or robotic. Speak like a caring friend.
`;

// --- Gemini Client ---
// We initialize this globally as the key is static for Gemini in this env
const geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
let geminiChatSession: Chat | null = null;
let currentGeminiModelId: string | null = null;

// --- Helper Functions ---

const getOpenAIKey = (settings: AiSettings): string | null => {
  return settings.openaiKey || DEFAULT_OPENAI_KEY || null;
};

// --- Core Service Functions ---

export const sendMessageToAi = async (
  text: string, 
  history: { role: string, text: string }[], 
  settings: AiSettings
): Promise<string> => {
  
  // 1. OpenAI Handler
  if (settings.provider === 'openai') {
    const apiKey = getOpenAIKey(settings);
    if (!apiKey) throw new Error("OpenAI API Key is missing. Please add it in settings.");

    const messages = [
      { role: "system", content: SYSTEM_INSTRUCTION },
      ...history.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
      { role: "user", content: text }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: settings.modelId,
        messages: messages,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Failed to connect to OpenAI");
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  // 2. Gemini Handler
  // Reset session if model changes or if it doesn't exist
  if (!geminiChatSession || currentGeminiModelId !== settings.modelId) {
    geminiChatSession = geminiClient.chats.create({
      model: settings.modelId,
      config: { systemInstruction: SYSTEM_INSTRUCTION },
    });
    currentGeminiModelId = settings.modelId;
    // Note: In a real app with persistent history, we'd replay history here.
    // For this simple PWA, keeping the session object alive handles recent context.
  }

  const result = await geminiChatSession.sendMessage({ message: text });
  return result.text || "";
};

export const generateDailyTasks = async (moodContext: string, settings: AiSettings): Promise<TaskResponse | null> => {
  const prompt = `Based on the user feeling "${moodContext}", generate 3 simple, achievable tasks to help them feel a sense of success and improvement today. Return pure JSON.`;

  try {
    // OpenAI Task Generation
    if (settings.provider === 'openai') {
        const apiKey = getOpenAIKey(settings);
        if (!apiKey) throw new Error("OpenAI Key missing");

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: settings.modelId,
                messages: [
                    { role: "system", content: "You are a helpful assistant that outputs strictly JSON." },
                    { role: "user", content: prompt + ` Format: { "tasks": [{ "title": "...", "description": "...", "difficulty": "Gentle" }] }` }
                ],
                response_format: { type: "json_object" }
            })
        });
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        return content ? JSON.parse(content) : null;
    }

    // Gemini Task Generation
    const response = await geminiClient.models.generateContent({
      model: settings.modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  difficulty: { type: Type.STRING, enum: ['Gentle', 'Moderate', 'Challenge'] }
                },
                required: ['title', 'description', 'difficulty']
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as TaskResponse;
    }
    return null;
  } catch (error) {
    console.error("Failed to generate tasks:", error);
    return null;
  }
};

export const generateMotivation = async (settings: AiSettings): Promise<string> => {
  const prompt = "Give me a short, warm, and powerful motivational quote or thought for someone having a hard day.";
  
  try {
    if (settings.provider === 'openai') {
        const apiKey = getOpenAIKey(settings);
        if (!apiKey) throw new Error("OpenAI Key missing");

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: settings.modelId,
                messages: [{ role: "user", content: prompt }]
            })
        });
        const data = await response.json();
        return data.choices[0]?.message?.content || "You are doing great.";
    }

    const response = await geminiClient.models.generateContent({
      model: settings.modelId,
      contents: prompt,
    });
    return response.text || "You are doing your best, and that is enough. 💙";
  } catch (error) {
    return "Sunlight always follows the rain. Hang in there. 🌤️";
  }
};