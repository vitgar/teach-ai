# # main.py

from fastapi import FastAPI, HTTPException, Header, Depends, Request
from starlette.responses import StreamingResponse, JSONResponse
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
import logging

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

# Lexile level specifications
LEXILE_SPECIFICATIONS = {
    "BR": {
        "category": "elementary",
        "paragraphs": 2,
        "word_count": "25 to 50 words",
        "range": "0L to 200L"
    },
    "0-200": {
        "category": "elementary",
        "paragraphs": 2,
        "word_count": "25 to 50 words",
        "range": "0L to 200L"
    },
    "200-300": {
        "category": "elementary",
        "paragraphs": 2,
        "word_count": "40 to 70 words",
        "range": "200L to 300L"
    },
    "300-400": {
        "category": "elementary",
        "paragraphs": 3,
        "word_count": "50 to 100 words",
        "range": "300L to 400L"
    },
    "400-500": {
        "category": "elementary",
        "paragraphs": 3,
        "word_count": "60 to 110 words",
        "range": "400L to 500L"
    },
    "500-600": {
        "category": "elementary",
        "paragraphs": 4,
        "word_count": "70 to 120 words",
        "range": "500L to 600L"
    },
    "600-700": {
        "category": "elementary",
        "paragraphs": 4,
        "word_count": "80 to 130 words",
        "range": "600L to 700L"
    },
    "700-800": {
        "category": "middle",
        "paragraphs": 5,
        "word_count": "100 to 200 words",
        "range": "700L to 800L"
    },
    "800-900": {
        "category": "middle",
        "paragraphs": 5,
        "word_count": "100 to 200 words",
        "range": "800L to 900L"
    },
    "900-1000": {
        "category": "middle",
        "paragraphs": 5,
        "word_count": "100 to 200 words",
        "range": "900L to 1000L"
    },
    "1000-1100": {
        "category": "high",
        "paragraphs": 6,
        "word_count": "150 to 250 words",
        "range": "1000L to 1100L"
    },
    "1100-1200": {
        "category": "high",
        "paragraphs": 6,
        "word_count": "150 to 250 words",
        "range": "1100L to 1200L"
    }
}

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
    lexileLevel: str

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
    storyTitle: str
    storyContent: str
    customPrompt: Optional[str] = None

class GenerateWarmupResponse(BaseModel):
    warmup: str

class GenerateAssessmentRequest(BaseModel):
    topic: str
    grade_level: str
    num_questions: int = 5

class GenerateAssessmentResponse(BaseModel):
    assessment: str

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    messages: list[Message] = []
    context: str = None

class ChatResponse(BaseModel):
    response: str

class GeneratePassageRequest(BaseModel):
    topic: str
    reading_level: str
    genre: str = "Informational"
    generateQuestions: bool = False
    questionStyle: str = "STAAR"
    includeAnswerKey: bool = False

class GenerateGuidedReadingIntroRequest(BaseModel):
    title: str
    content: str
    skill: str
    customPrompt: Optional[str] = None

class GeneratePracticeRequest(BaseModel):
    skill: str
    storyTitle: str
    storyContent: str
    customPrompt: Optional[str] = None

class GenerateExitTicketRequest(BaseModel):
    storyTitle: str
    storyContent: str
    skill: str
    practiceContent: str
    customPrompt: Optional[str] = None

# New Pydantic models for request validation
class ParseStudentsFromImageRequest(BaseModel):
    image: str
    teacherGrade: str
    teacherId: str

class ParseStudentsRequest(BaseModel):
    text: str
    teacherGrade: Optional[str] = ''
    teacherId: Optional[str] = ''

class ImproveObservationRequest(BaseModel):
    observation: str
    topic: str

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

@app.post("/generate-passage")
async def generate_passage(request: GeneratePassageRequest):
    """
    Generate a reading passage with optional questions based on the specified parameters.
    """
    print("Received data:", request.dict())
    print("Initial reading level:", request.reading_level)

    async def generate():
        try:
            print("Processing reading level:", request.reading_level)
            
            # Get specifications based on reading level
            spec = LEXILE_SPECIFICATIONS.get(request.reading_level)
            if not spec:
                raise ValueError(f"Reading level '{request.reading_level}' is not supported.")
            
            # Use the range from specifications
            lexile_range = spec["range"]
            category = spec["category"]
            num_paragraphs = spec["paragraphs"]
            word_count = spec["word_count"]

            # Define paragraph instructions
            paragraph_instructions = f"Include exactly {num_paragraphs} cohesive paragraphs, each containing approximately {word_count}."

            # Create genre-specific guidance
            genre_guidance = {
                'Fiction': 'Create a narrative with strong character development, a coherent plot, and vivid sensory details.',
                'Historical Fiction': 'Blend accurate historical facts with an engaging narrative that brings the past to life.',
                'Science Fiction': 'Incorporate scientific or technological concepts suitable for the Lexile level, focusing on imagination and curiosity.',
                'Informational': 'Present factual, well-structured information that clearly explains the topic and provides key details.',
                'Expository': 'Offer a clear, logical explanation of the topic, supported by relevant facts and examples.',
                'Persuasive': 'Present a reasoned argument with evidence, guiding readers towards a particular stance or conclusion.'
            }.get(request.genre, 'Create an engaging passage that effectively addresses the given topic.')

            # Adjust technical requirements based on Lexile specifications
            if category == 'elementary':
                technical_requirements = f"""
- Maintain an approximate Lexile level of {request.reading_level}.
- Use simple and clear language appropriate for this reading level.
- {paragraph_instructions}
- Ensure precise organization and a polished tone.
- Follow standard test passage formatting conventions (e.g., a clear, bold title; well-structured paragraphs).
"""
            elif category == 'middle':
                technical_requirements = f"""
- Maintain an approximate Lexile level of {request.reading_level}.
- Use clear, coherent, and engaging language appropriate for this reading level.
- {paragraph_instructions}
- Include descriptive details and logical transitions between ideas.
- Ensure precise organization, logical progression of ideas, and a polished tone.
- Follow standard test passage formatting conventions (e.g., a clear, bold title; well-structured paragraphs).
"""
            else:  # high
                technical_requirements = f"""
- Maintain an approximate Lexile level of {request.reading_level}.
- Use sophisticated language that is clear, coherent, and engaging.
- {paragraph_instructions}
- Include vivid descriptive details, strong transitions between ideas, and a well-structured narrative or informational flow.
- Incorporate subtle figurative language, relevant examples, and carefully chosen vocabulary.
- Ensure precise organization, logical progression of ideas, and a polished tone.
- Follow standard test passage formatting conventions (e.g., a clear, bold title; well-structured paragraphs).
"""

            # Create question guidance based on question style
            question_guidance = ""
            answer_key_guidance = ""
            if request.generateQuestions:
                if request.questionStyle.upper() == "STAAR":
                    question_guidance = """
After the passage, include 4-5 STAAR-style questions that:
- Follow the exact STAAR format with specific question stems.
- Align to Lexile-level readiness and supporting standards.
- Include a balanced mix of:
    * Key Ideas and Details (main idea, inference, character analysis)
    * Author's Purpose and Craft (understanding text structure, point of view, and author's choices)
    * Integration of Knowledge and Ideas (using evidence, making connections, analyzing information)
- Use academic and precise vocabulary such as "central idea," "text structure," "according to the passage," and "which sentence."
- Provide four answer choices (A-D) with plausible distractors representing common misconceptions.
- Maintain Lexile-level appropriate complexity and align with the reading level specified.
"""
                    if request.includeAnswerKey:
                        answer_key_guidance = """
After the questions, include an answer key section marked with [[ANSWER_KEY_START]] on its own line, followed by:
- The correct answer for each question (1-5)
- A detailed explanation for why each answer is correct
- References to specific text evidence supporting each answer
- Common misconceptions addressed by the incorrect options

Format as:
[[ANSWER_KEY_START]]
Question 1: [Correct Answer Letter]
Explanation: [Detailed explanation with text evidence]

Question 2: [Correct Answer Letter]
Explanation: [Detailed explanation with text evidence]

[etc.]
"""

            # Construct the prompt
            prompt = f"""Generate a {request.genre} passage about "{request.topic}" at a {request.reading_level} Lexile level.
The passage should be presented in a standardized {request.questionStyle} test format and maintain appropriate complexity for {request.reading_level} Lexile level readers.

Genre-specific requirements:
{genre_guidance}

Technical requirements:
{technical_requirements}

{question_guidance}
{answer_key_guidance}

Return the content in this exact markdown format:

# **[Title]**

[Passage content with proper paragraphs]

## Questions

1. [Question text]
   A. [Answer choice]
   B. [Answer choice]
   C. [Answer choice]
   D. [Answer choice]

2. [Question text]
   A. [Answer choice]
   B. [Answer choice]
   C. [Answer choice]
   D. [Answer choice]

[etc...]

If includeAnswerKey is true, add this section with a special marker:
[[ANSWER_KEY_START]]
**Answer Key**

Question 1: [Letter]  
Explanation: [Detailed explanation]

Question 2: [Letter]  
Explanation: [Detailed explanation]

[etc...]
"""

            print("\n=== PROMPT SENT TO AI ===")
            print(prompt)
            print("========================\n")

            # Generate the passage using OpenAI's API
            client = OpenAI(api_key=openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert in creating Lexile-appropriate reading passages."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    text = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'type': 'content', 'content': text})}\n\n"

            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            print(f"Error generating passage: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type='text/event-stream'
    )

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
        # Get word count and paragraphs based on lexile level
        lexile = request.lexileLevel.replace('L', '').upper()  # Convert '200L' to '200'
        
        # Default values for unknown lexile levels
        word_count = "100-150"
        paragraphs = "1-2"
        level = "Intermediate"
        
        # Map lexile levels to parameters
        if lexile == "BR":
            word_count = "20-30"
            paragraphs = "1"
            level = "Beginning Reader"
        elif lexile == "200":
            word_count = "30-50"
            paragraphs = "1"
            level = "Early Reader"
        elif lexile == "300":
            word_count = "50-70"
            paragraphs = "1"
            level = "Early Reader"
        elif lexile == "400":
            word_count = "70-90"
            paragraphs = "1-2"
            level = "Early Intermediate"
        elif lexile == "500":
            word_count = "90-110"
            paragraphs = "1-2"
            level = "Intermediate"
        elif lexile == "600":
            word_count = "110-130"
            paragraphs = "1-2"
            level = "Intermediate"
        elif lexile == "700":
            word_count = "130-150"
            paragraphs = "1-2"
            level = "Advanced"
        elif lexile == "800":
            word_count = "150-170"
            paragraphs = "1-2"
            level = "Advanced"
        elif lexile == "900":
            word_count = "170-190"
            paragraphs = "1-2"
            level = "Advanced"
        elif lexile == "1000":
            word_count = "190-200"
            paragraphs = "1-2"
            level = "Advanced"

        prompt = f"""Generate a very short, engaging story based on the following prompt:
        Topic: {request.prompt}
        
        Requirements:
        1. Create {paragraphs} paragraph(s) with a total of {word_count} words
        2. Make it engaging and age-appropriate for {level} level
        3. Include a clear beginning, middle, and end
        4. Focus on {request.prompt} without explicitly mentioning it
        5. Use vocabulary appropriate for {level} level
        6. Keep it concise but meaningful
        7. Create a short, creative title that captures the main idea
        
        Format:
        [Title]
        
        [Story content in {paragraphs} paragraph(s)]"""
        
        try:
            client = OpenAI(api_key=openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "system", 
                        "content": f"""You are an expert at creating engaging educational stories at specific reading levels.
                        Follow these rules exactly:
                        1. Generate a short, creative title
                        2. Add TWO blank lines after the title
                        3. Write {paragraphs} paragraph(s)
                        4. Total word count should be {word_count} words
                        5. Use vocabulary suitable for {level} level
                        6. Do not use any markdown headers or formatting
                        7. Make sure the story has a clear beginning, middle, and end"""
                    },
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
                        # Format the content as a proper SSE data message
                        yield f"data: {json.dumps({'content': content})}\n\n"
                
                # Split the story text into title and content
                parts = story_text.strip().split('\n\n', 1)
                if len(parts) == 2:
                    title, content = parts
                    yield f"data: {json.dumps({'type': 'complete', 'title': title.strip(), 'content': content.strip()})}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate properly formatted story'})}\n\n"

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
@app.post("/generate-warmup")
async def generate_warmup(request: GenerateWarmupRequest):
    """
    Generate a warmup activity using OpenAI's GPT model.
    """
    async def generate():
        try:
            prompt = f"""Create a focused 2-3 minute warm-up activity to prepare students for reading about {request.topic}.

            Story Title: {request.storyTitle}
            Story Content: {request.storyContent}
            {f'Additional Requirements: {request.customPrompt}' if request.customPrompt else ''}

            Format the response in markdown:
            ### Warm-Up Activity: {request.topic}

            **Time:** 2-3 minutes

            **Learning Target:**
            [Clear, measurable objective aligned with {request.topic}]

            **Activity Steps:**
            1. [Engaging opening aligned with reading level]
            2. [Scaffolded practice of the skill]
            3. [Quick formative check]

            **Teacher Notes:**
            - [Key vocabulary to pre-teach]
            - [Potential misconceptions to address]
            - [Differentiation suggestions]
            - [Success criteria for the warm-up]
            """

            client = OpenAI(api_key=openai_api_key)
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert reading teacher creating focused, standards-aligned warm-up activities. Ensure activities are engaging, grade-appropriate, and directly prepare students for the lesson objective."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            content = ""
            for chunk in response:
                if chunk.choices[0].delta.content is not None:
                    content += chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

            yield f"data: {json.dumps({'type': 'complete', 'content': content})}\n\n"
                
        except Exception as e:
            print(f"Error generating warm-up: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate warm-up'})}\n\n"

    return StreamingResponse(generate(), media_type='text/event-stream')

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

@app.post("/chat")
async def chat(request: ChatRequest):
    """
    Chat endpoint that handles streaming responses from OpenAI's GPT model.
    """
    try:
        # Initialize messages list with system message if not provided
        messages = [{"role": "system", "content": "You are a helpful teaching assistant."}]
        
        # Add context if provided
        if request.context:
            messages.append({"role": "system", "content": f"Context: {request.context}"})
        
        # Add previous messages if any
        if request.messages:
            messages.extend([{"role": m.role, "content": m.content} for m in request.messages])
        
        # Add the current message
        messages.append({"role": "user", "content": request.message})
        
        async def generate():
            try:
                client = OpenAI(api_key=openai_api_key)
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    stream=True
                )
                
                for chunk in response:
                    if chunk.choices[0].delta.content is not None:
                        yield chunk.choices[0].delta.content
                        
            except Exception as e:
                print(f"Error during streaming: {str(e)}")
                raise
        
        return StreamingResponse(
            generate(),
            media_type='text/plain'
        )
        
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "TeachAssist AI API"}

@app.post("/generate-practice")
async def generate_practice(request: GeneratePracticeRequest):
    """
    Generate a practice activity with a new story focusing on a specific skill.
    """
    try:
        async def generate():
            try:
                base_prompt = f"""Create a focused independent practice activity that reinforces {request.skill}.

                Format the response in markdown:
                ### Independent Practice: {request.skill}

                **Learning Target:**
                [Clear, measurable objective for {request.skill}]

                **Practice Story:**
                [Write a short story that provides multiple opportunities to practice {request.skill}]

                **Guided Questions:**
                1. [Question that directly assesses {request.skill}]
                2. [Question requiring text evidence]
                3. [Higher-order thinking question]

                **Student Instructions:**
                1. Read the story independently
                2. Use the following strategy for {request.skill}:
                   - [Step-by-step process]
                   - [What to look for]
                   - [How to analyze]
                3. Answer questions using text evidence

                **Success Criteria:**
                - [Specific expectations for responses]
                - [How to demonstrate skill mastery]
                - [Quality of text evidence needed]

                **Teacher Notes:**
                - [What to look for in student work]
                - [Common misconceptions to address]
                - [Differentiation suggestions]
                """

                if request.customPrompt:
                    base_prompt += f"\nAdditional Requirements: {request.customPrompt}"

                client = OpenAI(api_key=openai_api_key)
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert at creating standards-aligned independent practice activities. Ensure clear instructions, appropriate scaffolding, and meaningful assessment opportunities."
                        },
                        {
                            "role": "user",
                            "content": base_prompt
                        }
                    ],
                    temperature=0.7,
                    stream=True
                )
                
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

                yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                
            except Exception as e:
                print(f"Error during streaming: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate practice content'})}\n\n"

        return StreamingResponse(generate(), media_type='text/event-stream')
        
    except Exception as e:
        print(f"Error in generate-practice endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-guided-reading-intro")
async def generate_guided_reading_intro(request: GenerateGuidedReadingIntroRequest):
    """
    Generate a guided reading introduction lesson for a story.
    """
    try:
        async def generate():
            try:
                base_prompt = f"""Create a focused 5-minute guided reading introduction lesson that explicitly teaches {request.skill}.

                Story Title: {request.title}
                Story Content: {request.content}
                Teaching Focus: {request.skill}

                Format the response in markdown:
                ### 5-Minute Introduction Lesson: {request.skill}

                **Learning Target:**
                [Clear, measurable objective for {request.skill}]

                **Key Vocabulary:**
                - [Essential terms for understanding the skill]
                - [Words from the text that support the skill]

                **Direct Instruction (2 minutes):**
                1. [Clear explanation of {request.skill}]
                2. [Teacher modeling with think-aloud]
                3. [Visual support or anchor chart details]

                **Guided Practice (3 minutes):**
                1. [Scaffolded practice with the skill]
                2. [Text-specific examples to analyze]
                3. [Check for understanding]

                **Success Criteria:**
                - [What students should be able to do]
                - [How they'll demonstrate understanding]

                **Teacher Notes:**
                - [Common misconceptions]
                - [Differentiation strategies]
                - [Key points to emphasize]
                """

                if request.customPrompt:
                    base_prompt += f"\nAdditional Requirements: {request.customPrompt}"

                client = OpenAI(api_key=openai_api_key)
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert reading teacher creating focused, standards-aligned guided reading lessons. Ensure explicit instruction of reading skills with clear modeling and guided practice opportunities."
                        },
                        {
                            "role": "user",
                            "content": base_prompt
                        }
                    ],
                    temperature=0.7,
                    stream=True
                )
                
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

                yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                
            except Exception as e:
                print(f"Error during streaming: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate lesson introduction'})}\n\n"

        return StreamingResponse(generate(), media_type='text/event-stream')
        
    except Exception as e:
        print(f"Error in generate-guided-reading-intro endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-exit-ticket")
async def generate_exit_ticket(request: GenerateExitTicketRequest):
    """
    Generate a quick exit ticket activity based on the practice story.
    """
    try:
        async def generate():
            try:
                # Extract the practice story title and content from the markdown
                practice_lines = request.practiceContent.split('\n')
                practice_title = ''
                practice_story = ''
                
                # Parse the practice content to get title and story
                in_story = False
                for line in practice_lines:
                    if line.startswith('### Independent Practice Story:'):
                        practice_title = line.replace('### Independent Practice Story:', '').strip()
                    elif line.startswith('**Practice Questions'):
                        in_story = False
                    elif practice_title and not line.startswith('**') and not line.startswith('#'):
                        if line.strip():
                            practice_story += line.strip() + ' '
                            in_story = True

                base_prompt = f"""Create a focused 2-minute exit ticket that assesses student mastery of {request.skill}.

                Practice Story Title: {practice_title}
                Practice Story Content: {practice_story}

                Format the response in markdown:
                ### Exit Ticket: Demonstrating {request.skill}

                **Learning Target:**
                [Clear, measurable objective for {request.skill}]

                **Quick Assessment Task:**
                [Brief, focused task that demonstrates mastery of {request.skill}]

                **Student Instructions:**
                1. [Clear step-by-step directions]
                2. [How to show understanding]
                3. [Time management suggestion]

                **Success Criteria:**
                - [Specific expectations for mastery]
                - [Required text evidence]
                - [Quality indicators]

                **Teacher Evaluation Guide:**
                - [What mastery looks like]
                - [Common misconceptions to watch for]
                - [Next steps based on responses]
                """

                if request.customPrompt:
                    base_prompt += f"\nAdditional Requirements: {request.customPrompt}"

                client = OpenAI(api_key=openai_api_key)
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert at creating focused exit tickets that effectively assess student mastery of reading skills. Ensure clear success criteria and meaningful evaluation opportunities."
                        },
                        {
                            "role": "user",
                            "content": base_prompt
                        }
                    ],
                    temperature=0.7,
                    stream=True
                )
                
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

                yield f"data: {json.dumps({'type': 'complete'})}\n\n"
                
            except Exception as e:
                print(f"Error during streaming: {str(e)}")
                yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate exit ticket'})}\n\n"
        
        return StreamingResponse(generate(), media_type='text/event-stream')
        
    except Exception as e:
        print(f"Error in generate-exit-ticket endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse-students-from-image")
async def parse_students_from_image(request: ParseStudentsFromImageRequest):
    """
    Parse student information from an image.
    """
    try:
        # Use GPT to parse the text content
        client = OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": """You are a data extraction expert. Extract ALL student information from the provided data. 
                    The data may be in table format with columns for first name, last name, and reading level.
                    Process EVERY row and return ALL students in this exact JSON format without any markdown formatting or code blocks:
                    [
                        {
                            "firstName": "string",
                            "lastName": "string",
                            "readingLevel": "string",
                            "gradeLevel": "string"
                        }
                    ]
                    
                    Important:
                    - Process EVERY row in the data
                    - Include ALL students found
                    - Do not limit the number of students
                    - Maintain the exact order from the source data
                    """
                },
                {
                    "role": "user",
                    "content": f"Extract ALL student information from this data. The data appears to be in a table format with columns for first name, last name, and reading level. Process EVERY row: {request.image}"
                }
            ],
            temperature=0
        )
        
        # Get the response content and clean it
        content = response.choices[0].message.content.strip()
        if content.startswith('```'):
            content = content.replace('```json', '').replace('```', '').strip()
        
        try:
            # Try to parse the JSON response
            students = json.loads(content)
            if not isinstance(students, list):
                raise ValueError("Response is not a list")
                
            # Ensure each student has the required fields and teacherId
            for student in students:
                student['gradeLevel'] = student.get('gradeLevel', request.teacherGrade)
                student['teacherId'] = request.teacherId  # Add teacherId to each student
                if not all(key in student for key in ['firstName', 'lastName']):
                    raise ValueError("Missing required fields in student data")
            
            return {
                'students': students,
                'message': f'Successfully processed {len(students)} students'
            }
            
        except json.JSONDecodeError as je:
            print("JSON Decode Error:", je)
            raise HTTPException(
                status_code=500,
                detail=f"Invalid JSON format in response: {str(je)}"
            )
            
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process image: {str(e)}"
        )

@app.post("/parse-students")
async def parse_students(request: ParseStudentsRequest):
    """
    Parse student information from text.
    """
    try:
        # Create a prompt that explains what we want
        prompt = f"""Extract student information from the following text and return a JSON array of student objects.
        Each student object should have: 
        - firstName (required)
        - lastName (required)
        - studentId (required, generate a random ID if not provided)
        - gradeLevel (use "{request.teacherGrade}" if not specified)
        - readingLevel (required)
        - teacherId (use "{request.teacherId}")
        - periodId (optional)
        - groupIds (optional, array of strings)
        - intervention (optional)
        - interventionResults (optional)
        The text might be in any format but will contain student information.
        If certain information is missing, make reasonable assumptions based on context.
        
        Text to parse:
        {request.text}
        Return only the JSON array without any markdown formatting or code blocks.
        Example format:
        [
          {{
            "firstName": "John",
            "lastName": "Doe",
            "studentId": "ST" + random 6 digits,
            "gradeLevel": "{request.teacherGrade}",
            "readingLevel": "B",
            "teacherId": "{request.teacherId}",
            "periodId": null,
            "groupIds": [],
            "intervention": "",
            "interventionResults": ""
          }}
        ]
        """
        
        # Call OpenAI API
        client = OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a helpful assistant that extracts student information from text and returns it in a structured JSON format. Do not include markdown formatting or code blocks in your response."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
        )
        
        # Get the response text and clean it
        students_json = response.choices[0].message.content.strip()
        
        # Remove markdown code block if present
        if students_json.startswith('```'):
            students_json = students_json.replace('```json', '').replace('```', '').strip()
        
        students = json.loads(students_json)
        
        # Validate the structure of each student object
        required_fields = ['firstName', 'lastName', 'studentId', 'gradeLevel', 'readingLevel', 'teacherId']
        for i, student in enumerate(students):
            if not all(key in student for key in required_fields):
                missing = [key for key in required_fields if key not in student]
                raise ValueError(f"Student {i + 1} missing required fields: {', '.join(missing)}")
        
        return {"students": students}
        
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except ValueError as e:
        print(f"Validation Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@app.post("/improve-observation")
async def improve_observation(request: ImproveObservationRequest):
    """
    Enhance an observation about a topic to be more specific and professional.
    """
    try:
        prompt = f"""Enhance this observation about {request.topic} to be more specific and professional. 
        Keep it concise (2-3 sentences) and natural. Focus on the student's understanding of {request.topic}.
        Do not include any phrases like 'revised' or 'improved' or anything that indicates AI modification.
        Simply provide the enhanced observation as if it was written directly by the teacher.

        Original: {request.observation}

        Guidelines:
        1. Keep it brief but specific
        2. Use professional educational language
        3. Focus on observable behaviors related to {request.topic}
        4. Include one clear next step
        5. Write in a natural teacher's voice
        6. Do not use any meta-language about the observation being revised or improved
        """

        client = OpenAI(api_key=openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are writing as the teacher, providing direct observations about students."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=200
        )
        
        improved_observation = response.choices[0].message.content.strip()
        
        # Remove any potential prefixes like "Enhanced:" or "Improved:"
        improved_observation = improved_observation.replace("Enhanced:", "").replace("Improved:", "").strip()
        
        return {"content": improved_observation}
        
    except Exception as e:
        print(f"Error improving observation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to improve observation: {str(e)}"
        )