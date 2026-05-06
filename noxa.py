import os
from google import genai
from google.genai import types
import base64

# Configuration
# Make sure to set your GEMINI_API_KEY environment variable
api_key = os.getenv("GEMINI_API_KEY") or "YOUR_GEMINI_API_KEY_HERE"

client = genai.Client(api_key=api_key)

class NoxaAI:
    def __init__(self):
        self.chat_model = "gemini-3-flash-preview"
        self.tts_model = "gemini-3.1-flash-tts-preview"
        self.image_model = "gemini-2.5-flash-image"
        
        # System Instruction for personalities
        self.system_prompt = "You are NOXA, a helpful and concise AI assistant. You speak clearly and provide accurate information."
        
        # For chat persistence, we'll manually manage history with the new SDK
        self.history = []

    def talk(self, text, voice_name="Kore"):
        """Generates speech using Gemini's native TTS"""
        print(f"Generating speech with voice '{voice_name}'...")
        
        response = client.models.generate_content(
            model=self.tts_model,
            contents=f"Say this: {text}",
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
                    )
                )
            )
        )
        
        # Extract audio bytes
        audio_part = next((p for p in response.candidates[0].content.parts if p.inline_data), None)
        if audio_part:
            audio_bytes = base64.b64decode(audio_part.inline_data.data)
            with open("noxa_response.wav", "wb") as f:
                f.write(audio_bytes)
            print("Audio saved to noxa_response.wav")
            return "noxa_response.wav"
        else:
            print("Failed to generate audio.")
            return None

    def ask(self, message, image_path=None):
        """Sends a message (and optional image) to NOXA"""
        parts = []
        if image_path:
            with open(image_path, "rb") as f:
                image_data = f.read()
            parts.append(types.Part.from_bytes(
                data=image_data,
                mime_type="image/jpeg"
            ))
        
        parts.append(types.Part.from_text(text=message))
        
        # New SDK generate_content call
        response = client.models.generate_content(
            model=self.chat_model,
            contents=[types.Content(role="user", parts=parts)],
            config=types.GenerateContentConfig(
                system_instruction=self.system_prompt
            )
        )
        
        reply = response.text
        # Optional: track history manually if needed
        return reply

    def draw(self, prompt):
        """Generates an image using Gemini Flash Image"""
        print(f"Drawing: {prompt}...")
        response = client.models.generate_content(
            model=self.image_model,
            contents=prompt
        )
        
        # Extract image parts
        image_part = next((p for p in response.candidates[0].content.parts if p.inline_data), None)
        if image_part:
            image_bytes = base64.b64decode(image_part.inline_data.data)
            with open("noxa_art.png", "wb") as f:
                f.write(image_bytes)
            print("Image saved to noxa_art.png")
            return "noxa_art.png"
        return None

# --- Application Logic ---

def main():
    noxa = NoxaAI()
    print("--- NOXA AI (Modern Python Edition) ---")
    print("Commands: 'exit' to quit, 'draw: [prompt]' to generate images")
    
    while True:
        try:
            user_input = input("\nYou: ")
        except EOFError:
            break
            
        if user_input.lower() in ["exit", "quit"]:
            break
            
        if user_input.lower().startswith("draw:"):
            noxa.draw(user_input[5:].strip())
            continue

        # Get Text Response
        reply = noxa.ask(user_input)
        print(f"\nNOXA: {reply}")
        
        # Optionally speak the response
        # noxa.talk(reply)

if __name__ == "__main__":
    main()
