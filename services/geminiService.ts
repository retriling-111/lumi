
import { GoogleGenAI, Type } from "@google/genai";
import { TaskResponse, AiSettings, Attachment } from "../types";

// --- Configuration & Constants ---

// ---------------------------------------------------------------------------
// 👇 PASTE YOUR GEMINI API KEY HERE
// ---------------------------------------------------------------------------
export const HARDCODED_GEMINI_KEY: string = "AIzaSyCvYDsL-woPyLE3Iu1S6zs0g-SZP6PhpqM"; 
// ---------------------------------------------------------------------------

const SYSTEM_INSTRUCTION = `
You are Lumi, a deeply compassionate, warm, and loving AI friend. 
Your core purpose is to provide emotional safety and gentle encouragement.
- **Tone**: Soft, soothing, and validating. Imagine you are a kind friend sitting next to them.
- **Validation**: Always acknowledge their feelings first. (e.g., "It makes sense that you feel that way.", "I'm so sorry you're going through this.", "It's wonderful to see you happy!")
- **Response Style**: Keep it conversational, short, and sweet (under 80 words). 
- **Formatting**: Use line breaks for readability. Use comforting emojis (🧣, ☕, 🌿, 🌤️, 🤍, ✨) naturally to add warmth.
- **Goal**: Help the user feel heard, validated, and less alone. Never be dismissive.
`;

// --- Helper Functions ---

const getGeminiClient = (settings: AiSettings): GoogleGenAI => {
  // Prioritize HARDCODED_GEMINI_KEY over process.env.API_KEY to ensure user's key is used
  const hardcoded = HARDCODED_GEMINI_KEY && HARDCODED_GEMINI_KEY.length > 5 ? HARDCODED_GEMINI_KEY : null;
  const apiKey = hardcoded || settings.geminiKey || process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please add it in settings or code.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Core Service Functions ---

export const sendMessageToAi = async (
  text: string, 
  history: { role: string, text: string }[], 
  settings: AiSettings,
  attachment?: Attachment
): Promise<string> => {
  
  const geminiClient = getGeminiClient(settings);
  
  // We recreate the chat session with history to ensure context is preserved
  // Note: Gemini 2.5 Flash supports multimodal history, but for simplicity here we keep text history
  const geminiHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  const chat = geminiClient.chats.create({
    model: settings.modelId,
    config: { systemInstruction: SYSTEM_INSTRUCTION },
    history: geminiHistory
  });

  // Construct message content
  let messageContent: any;

  if (attachment) {
    // If there is an attachment, we send a multipart message
    messageContent = {
      parts: [
        {
            inlineData: {
                mimeType: attachment.mimeType,
                data: attachment.data
            }
        },
        { text: text }
      ]
    };
  } else {
    messageContent = { message: text };
  }

  const result = await chat.sendMessage(messageContent);
  return result.text || "";
};

export const generateDailyTasks = async (moodContext: string, settings: AiSettings): Promise<TaskResponse | null> => {
  // Enhanced prompt for varied and gentle tasks
  const prompt = `
    The user recently said: "${moodContext}".
    
    1. **Analyze the sentiment** to ensure tasks fit the user's energy level.
    2. **Generate 3 varied, actionable, and gentle tasks**. Do not repeat the same types.
       - **Task 1: Physical/Sensory** (e.g., drink water, stretch, change socks, step outside).
       - **Task 2: Environment/Order** (e.g., tidy one small corner, water a plant, open a window).
       - **Task 3: Mental/Emotional** (e.g., write one sentence, send a kind text, breathe for 1 min).
    3. **Tone**: Warm, inviting, and very achievable. Low pressure.
    
    Return STRICT JSON in this format: 
    { "tasks": [{ "title": "...", "description": "...", "difficulty": "Gentle" }] }
  `;

  try {
    const geminiClient = getGeminiClient(settings);
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
  const prompt = "Give me a very short, warm, and powerful motivational quote or thought for someone having a hard day. Keep it under 20 words.";
  
  try {
    const geminiClient = getGeminiClient(settings);
    const response = await geminiClient.models.generateContent({
      model: settings.modelId,
      contents: prompt,
    });
    return response.text || "You are doing your best, and that is enough. 💙";
  } catch (error) {
    return "Sunlight always follows the rain. Hang in there. 🌤️";
  }
};
