import { GoogleGenAI, Modality, FunctionDeclaration, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const generateImageDeclaration: FunctionDeclaration = {
  name: "generateImage",
  description: "Generates an image from a detailed text prompt. Use this ONLY when the user asks to create, generate, draw, or show an image or picture.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "A highly detailed visual description of the image to generate.",
      },
    },
    required: ["prompt"],
  },
};

export const isAbortError = (error: any) => {
  const msg = (error?.message || error?.toString() || "").toLowerCase();
  return (
    msg.includes('abort') || 
    msg.includes('cancel') || 
    msg.includes('signal is aborted') ||
    error?.name === 'AbortError' || 
    error?.code === 20 ||
    error?.code === 'ERR_CANCELED' ||
    error?.error === 'aborted'
  );
};

export async function generateGeminiSpeech(text: string, voiceName: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
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
  } catch (error: any) {
    if (isAbortError(error)) {
      console.warn("Gemini TTS request was aborted.");
      return "";
    }
    console.error("Gemini TTS Error:", error);
    throw error;
  }
}

export async function enhanceText(text: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: `Rewrite the following text to sound more natural and expressive for text-to-speech. Keep the meaning identical but improve prosody and flow:\n\n"${text}"`,
    });
    return response.text || text;
  } catch (error: any) {
    if (isAbortError(error)) {
      return text;
    }
    console.error("Gemini Enhance Error:", error);
    return text;
  }
}

export async function generateImageFromPrompt(prompt: string) {
  try {
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
    });
    
    let base64Url = null;
    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        base64Url = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
        break;
      }
    }
    return base64Url;
  } catch (error: any) {
    if (isAbortError(error)) throw error;
    console.error("Direct Image Gen Error:", error);
    throw error;
  }
}

export async function chatWithAI(message: string, history: any[], imageData?: string) {
  try {
    const parts: any[] = [{ text: message || "Look at this image." }];
    
    if (imageData) {
      // Handle base64 image data (strip data URL prefix)
      const base64Data = imageData.split(',')[1] || imageData;
      const mimeType = imageData.split(';')[0]?.split(':')[1] || 'image/jpeg';
      
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [...history, { role: 'user', parts }],
      config: {
        systemInstruction: "You are NOXA, a helpful AI assistant. Keep responses concise. If the user asks for an image to be generated, use the generateImage tool. If the user provides an image, describe it or answer questions about it.",
        tools: [{ functionDeclarations: [generateImageDeclaration] }],
      }
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "generateImage") {
        const prompt = (call.args as any).prompt;
        
        try {
          const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
          });
          
          let base64Url = null;
          for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              base64Url = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
              break;
            }
          }
          
          if (base64Url) {
            return {
              text: `Here is the image you requested based on: "${prompt}"`,
              imageUrl: base64Url
            };
          }
        } catch (imgError: any) {
          if (isAbortError(imgError)) {
            console.warn("Image generation was aborted.");
            return { text: "Image generation was cancelled." };
          }
          console.error("Image generation failed:", imgError);
          return { text: "I tried to generate the image, but something went wrong with the image engine." };
        }
      }
    }

    return { text: response.text || "I'm sorry, I couldn't generate a response." };
  } catch (error: any) {
    if (isAbortError(error)) {
      return { text: "Request was cancelled." };
    }
    console.error("Gemini Chat Error:", error);
    throw error;
  }
}
