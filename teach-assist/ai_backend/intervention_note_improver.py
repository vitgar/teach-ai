# intervention_improver.py

import openai
import os
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

client = openai.OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

# System message to guide the assistant's behavior
system_message = """
You are an expert educator helping to improve intervention notes for clarity and effectiveness.
"""

def improve_intervention_text(text, model="gpt-4o-mini", max_tokens=150):
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Please improve the following intervention note for clarity and effectiveness, only return the improved text, not the original text and no extra comments from you:\n\n\"{text}\""}
            ],
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error communicating with OpenAI: {e}")
        return None
# We worked on cause and effect