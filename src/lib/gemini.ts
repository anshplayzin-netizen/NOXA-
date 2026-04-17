import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateGeminiSpeech(text: string, voiceName: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data received from Gemini");
    }

    return base64Audio;
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
}

export async function enhanceText(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Rewrite the following text to sound more natural and expressive for text-to-speech. Keep the meaning identical but improve prosody and flow:\n\n"${text}"`,
    });
    return response.text || text;
  } catch (error) {
    console.error("Gemini Enhance Error:", error);
    return text;
  }
}

export async function chatWithAI(message: string, history: { role: 'user' | 'model', parts: [{ text: string }] }[]) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [...history, { role: 'user', parts: [{ text: message }] }],
      config: {
        systemInstruction: "You are NOXA, a helpful AI assistant. Keep your responses concise and friendly, as they will be read aloud via text-to-speech.",
      }
    });
    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw error;
  }
}
