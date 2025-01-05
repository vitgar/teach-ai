# lesson_plan_generator.py

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

def send_request_to_openai(prompt: str) -> str:
    """
    Send a request to OpenAI's API and return the response.
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": """You are an expert teacher and curriculum developer.
                    Create detailed, practical, and engaging educational content.
                    Format your responses in a clear, structured way using markdown:
                    - Use headers (###) for main sections
                    - Use bullet points for lists
                    - Use bold (**) for emphasis
                    - Break up text into readable paragraphs
                    - Include numbered steps where appropriate"""
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error in OpenAI request: {str(e)}")
        return None

def generate_lesson_plan(topic: str, grade_level: str, standards: str = None) -> str:
    """
    Generate a complete lesson plan using OpenAI's API.
    """
    try:
        prompt = f"""Create a detailed lesson plan for grade {grade_level} on the topic: {topic}
        {f'Align with these standards: {standards}' if standards else ''}
        
        Include the following sections:
        ### Lesson Overview
        - Grade Level
        - Subject Area
        - Duration
        - Topic
        
        ### Learning Objectives
        - What students will know
        - What students will be able to do
        
        ### Materials Needed
        - List all required materials
        
        ### Lesson Structure
        1. Opening/Hook (5-10 minutes)
        2. Main Activity (20-30 minutes)
        3. Practice/Application (15-20 minutes)
        4. Closure (5-10 minutes)
        
        ### Assessment Strategies
        - How you will check for understanding
        - Any specific assessment tasks
        
        ### Differentiation Strategies
        - For struggling students
        - For advanced students
        - For ELL students
        
        ### Extensions and Homework
        - Additional practice
        - Related assignments
        
        Format the response in clear markdown with appropriate headers and sections."""
        
        return send_request_to_openai(prompt)
    except Exception as e:
        print(f"Error generating lesson plan: {str(e)}")
        return None
