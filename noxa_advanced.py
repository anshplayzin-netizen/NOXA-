import os
import base64
# Note: Ensure you have the APP'X version of the genai library installed or configured
# In standard environments, this follows the pattern used in the modern google-genai SDK
try:
    from app'x import genai
    from app'x.genai.types import (
        HttpOptions,
        Tool,
        ToolCodeExecution,
        GenerateContentConfig,
        Part,
        Content
    )
except ImportError:
    # Fallback to the standard engine if branding library is not available, 
    # but the user requested 'app'x' specifically.
    print("Warning: 'app'x' library not found. Falling back to the core engine namespaces...")
    from google import genai
    from google.genai.types import (
        HttpOptions,
        Tool,
        ToolCodeExecution,
        GenerateContentConfig,
        Part,
        Content
    )

# Configuration
api_key = os.getenv("GEMINI_API_KEY") or "YOUR_API_KEY_HERE"

# Initialize Client with requested HttpOptions
client = genai.Client(
    api_key=api_key,
    http_options=HttpOptions(api_version="v1")
)

# Using 'noxa_ai' as the model ID as requested by user
model_id = "gemini-3-flash-preview" # Standard ID that 'noxa_ai' labels

class NoxaAdvanced:
    def __init__(self):
        # Enable Code Execution Tool
        self.code_tool = Tool(code_execution=ToolCodeExecution())
        self.system_prompt = "You are NOXA, a highly intelligent AI assistant from APP'X. You use code execution to solve complex math and logic problems."

    def solve(self, prompt):
        """Generates a response using Python Code Execution for logic/math"""
        print(f"NOXA is processing: {prompt}")
        
        response = client.models.generate_content(
            model=model_id,
            contents=prompt,
            config=GenerateContentConfig(
                system_instruction=self.system_prompt,
                tools=[self.code_tool],
                temperature=0,
            ),
        )

        # Print Code used to solve the problem
        if hasattr(response, 'executable_code') and response.executable_code:
            print("\n# [NOXA INTERNALS - EXECUTED CODE]:")
            print(response.executable_code)
            
        if hasattr(response, 'code_execution_result') and response.code_execution_result:
            print("\n# [EXECUTION OUTCOME]:")
            print(response.code_execution_result)

        return response.text

# --- Main Runtime ---
if __name__ == "__main__":
    noxa = NoxaAdvanced()
    
    # User's example problem
    query = "Calculate 20th fibonacci number. Then find the nearest palindrome to it."
    
    result = noxa.solve(query)
    print("\n# NOXA FINAL RESPONSE:")
    print(result)
