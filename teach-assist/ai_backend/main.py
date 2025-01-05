# # main.py

from fastapi import FastAPI, HTTPException, Header, Depends
from starlette.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from lesson_plan_generator import send_request_to_openai
import openai
import os
from dotenv import load_dotenv
from typing import List, Optional
import jwt
from openai import OpenAI
import json

# Load environment variables from a .env file
load_dotenv()

# Set OpenAI API key
openai_api_key = os.environ.get("OPENAI_API_KEY")
print(f"OpenAI API key status: {'Configured' if openai_api_key else 'Not configured'}")
print(f"OpenAI API key length: {len(openai_api_key) if openai_api_key else 0}")
print(f"OpenAI API key prefix: {openai_api_key[:7] + '...' if openai_api_key else 'None'}")

if not openai_api_key:
    print("WARNING: OPENAI_API_KEY is not set in environment variables.")
    raise ValueError("OPENAI_API_KEY is not set in environment variables.")

# JWT configuration
JWT_SECRET = os.environ.get("JWT_SECRET", "hPp0DlBqrAylk1TB1g/a7hM2jFeVkxfEQgFnJ4NXb2Ul5QWJ1gpV2F/PFdspKd2IudfDnyI9gfGHFGhH9A==")
print(f"JWT_SECRET status: {'Configured' if JWT_SECRET != 'your-secret-key' else 'Using default'}")

async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization:
        print("No authorization header found")
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        print("Verifying token...")
        scheme, token = authorization.split()
        if scheme.lower() != 'bearer':
            print(f"Invalid scheme: {scheme}")
            raise HTTPException(status_code=401, detail="Invalid authentication scheme")
        
        print(f"Token length: {len(token)}")
        print(f"JWT_SECRET length: {len(JWT_SECRET)}")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        print(f"Token decoded successfully. Payload: {payload}")
        return payload
    except jwt.InvalidTokenError as e:
        print(f"Invalid token error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        print(f"Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

# Initialize FastAPI application
app = FastAPI(
    title="TeachAssist AI API",
    description="AI-powered API for educational content generation and improvement",
    version="1.0.0"
)

# Get environment-specific origins
def get_allowed_origins() -> List[str]:
    env = os.environ.get("ENVIRONMENT", "development")
    if env == "production":
        return [
            "https://teach-ai-beige.vercel.app",
            "https://teach-ai-aq9x.vercel.app"
        ]
    return ["http://localhost:3000"]  # Development origin

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600  # Cache preflight requests for 1 hour
)

# Pydantic models
class ImproveInterventionRequest(BaseModel):
    text: str

class ImproveInterventionResponse(BaseModel):
    improved_text: str

class GenerateStoryRequest(BaseModel):
    prompt: str

class GenerateStoryResponse(BaseModel):
    story: str

class GenerateLessonPlanRequest(BaseModel):
    topic: str
    grade_level: str
    standards: str = None
    lesson_type: str = "complete"

class GenerateLessonPlanResponse(BaseModel):
    lesson_plan: str

class GenerateWarmupRequest(BaseModel):
    topic: str
    grade_level: str = None

class GenerateWarmupResponse(BaseModel):
    warmup: str

class GenerateAssessmentRequest(BaseModel):
    topic: str
    grade_level: str
    num_questions: int = 5

class GenerateAssessmentResponse(BaseModel):
    assessment: str

class ChatRequest(BaseModel):
    message: str
    context: str = None

class ChatResponse(BaseModel):
    response: str

# Root endpoint
@app.get("/")
async def root():
    """
    Get basic information about the AI API.
    """
    return {
        "name": "TeachAssist AI API",
        "version": "1.0.0",
        "status": "active",
        "endpoints": {
            "root": "GET /",
            "health": "GET /health",
            "improve_intervention": "POST /improve-intervention",
            "generate_story": "POST /generate-story",
            "generate_lesson_plan": "POST /generate-lesson-plan",
            "generate_warmup": "POST /generate-warmup",
            "generate_assessment": "POST /generate-assessment",
            "chat": "POST /chat"
        }
    }

# Route to improve intervention notes
@app.post("/improve-intervention", response_model=ImproveInterventionResponse)
async def improve_intervention(request: ImproveInterventionRequest):
    """
    Improve the intervention text using OpenAI's GPT model.
    """
    try:
        client = OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert educator helping to improve intervention notes for clarity and effectiveness.",
                },
                {
                    "role": "user",
                    "content": f"Please improve the following intervention note for clarity and effectiveness:\n\n\"{request.text}\"",
                },
            ],
            temperature=0.7,
            max_tokens=150,
        )

        improved_text = response.choices[0].message.content.strip()
        return ImproveInterventionResponse(improved_text=improved_text)

    except Exception as e:
        print(f"OpenAI API error: {e}")
        raise HTTPException(status_code=500, detail="Failed to improve intervention text.")

# Route to generate stories
@app.post("/generate-story", response_model=GenerateStoryResponse)
async def generate_story(request: GenerateStoryRequest):
    """
    Generate a story using OpenAI's GPT model.
    """
    try:
        prompt = f"""Generate an engaging and age-appropriate story based on the following prompt:
        Topic: {request.prompt}
        
        Format the response in clear markdown with appropriate headers and sections.
        Keep the story concise and focused on the main points."""
        
        try:
            client = OpenAI(api_key=openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert at creating engaging educational stories."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            async def generate():
                story_text = ""
                for chunk in response:
                    if chunk.choices[0].delta.content is not None:
                        content = chunk.choices[0].delta.content
                        story_text += content
                        yield f"data: {json.dumps({'content': content})}\n\n"
                yield f"data: {json.dumps({'type': 'complete', 'content': story_text})}\n\n"

            return StreamingResponse(generate(), media_type='text/event-stream')

        except Exception as api_error:
            print(f"OpenAI API error: {str(api_error)}")
            raise

    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

# Route to generate lesson plans
@app.post("/generate-lesson-plan", response_model=GenerateLessonPlanResponse)
async def generate_lesson_plan(request: GenerateLessonPlanRequest):
    """
    Generate a lesson plan using OpenAI's GPT model.
    """
    try:
        prompt = f"""Generate a {request.lesson_type} lesson plan for grade {request.grade_level} on the topic: {request.topic}
        {f'Align with these standards: {request.standards}' if request.standards else ''}
        
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
        
        try:
            client = OpenAI(api_key=openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert teacher and curriculum developer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            async def generate():
                lesson_text = ""
                for chunk in response:
                    if chunk.choices[0].delta.content is not None:
                        content = chunk.choices[0].delta.content
                        lesson_text += content
                        yield f"data: {json.dumps({'content': content})}\n\n"
                yield f"data: {json.dumps({'type': 'complete', 'content': lesson_text})}\n\n"

            return StreamingResponse(generate(), media_type='text/event-stream')

        except Exception as api_error:
            print(f"OpenAI API error: {str(api_error)}")
            raise

    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

# Route to generate warmup activities
@app.post("/generate-warmup", response_model=GenerateWarmupResponse)
async def generate_warmup(request: GenerateWarmupRequest):
    """
    Generate a warmup activity using OpenAI's GPT model.
    """
    try:
        grade_level_text = f" for grade {request.grade_level}" if request.grade_level else ""
        prompt = f"""Create a short 2-3 minute warmup activity{grade_level_text} on the topic: {request.topic}
        The warmup should be engaging and help students prepare for the main lesson."""
        
        warmup = send_request_to_openai(prompt)
        if warmup is None:
            raise HTTPException(status_code=500, detail="Failed to generate warmup")
        return GenerateWarmupResponse(warmup=warmup)
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

# Route to generate assessments
@app.post("/generate-assessment", response_model=GenerateAssessmentResponse)
async def generate_assessment(request: GenerateAssessmentRequest):
    """
    Generate an assessment using OpenAI's GPT model.
    """
    try:
        prompt = f"""Create a {request.num_questions}-question assessment for grade {request.grade_level} on the topic: {request.topic}
        Include a mix of question types (multiple choice, short answer, etc.) and provide an answer key."""
        
        assessment = send_request_to_openai(prompt)
        if assessment is None:
            raise HTTPException(status_code=500, detail="Failed to generate assessment")
        return GenerateAssessmentResponse(assessment=assessment)
    except Exception as e:
        print(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred.")

# Route for chat interactions
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, token_payload: dict = Depends(verify_token)):
    """
    Have a conversation with the AI teaching assistant.
    """
    try:
        print("Chat endpoint called")
        print(f"OpenAI API key status: {'Configured' if openai_api_key else 'Not configured'}")
        print(f"OpenAI API key length: {len(openai_api_key) if openai_api_key else 0}")
        print(f"OpenAI API key prefix: {openai_api_key[:7] + '...' if openai_api_key else 'None'}")
        print(f"Environment: {os.environ.get('ENVIRONMENT', 'not set')}")
        print(f"User ID from token: {token_payload.get('teacherId', 'not found')}")

        if not openai_api_key:
            print("ERROR: OpenAI API key is not set")
            raise HTTPException(status_code=500, detail="OpenAI API key is not configured")

        system_prompt = """You are a helpful teaching assistant with expertise in education. 
        You provide clear, concise, and practical advice to teachers. 
        Focus on being specific and actionable in your responses.
        Format your responses in a clear, structured way using markdown:
        - Use headers (###) for main sections
        - Use bullet points for lists
        - Use bold (**) for emphasis
        - Break up text into readable paragraphs
        - Include numbered steps where appropriate"""
        
        context = f"\nContext: {request.context}" if request.context else ""
        
        print(f"Sending request to OpenAI API with message: {request.message[:100]}...")
        
        try:
            client = OpenAI(api_key=openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"{request.message}{context}"}
                ],
                temperature=0.7,
                stream=True
            )
            
            async def generate():
                for chunk in response:
                    if chunk.choices[0].delta.content is not None:
                        yield chunk.choices[0].delta.content

            return StreamingResponse(generate(), media_type='text/plain')

        except Exception as api_error:
            print(f"Detailed OpenAI API error: {str(api_error)}")
            print(f"Error type: {type(api_error).__name__}")
            raise

    except Exception as e:
        print(f"Unexpected error in chat endpoint: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "TeachAssist AI API"}
