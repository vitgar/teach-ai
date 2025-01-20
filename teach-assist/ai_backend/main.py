# # main.py

from fastapi import FastAPI, HTTPException, Header, Depends, Request
from starlette.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, model_validator
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
import asyncio
from pymongo import MongoClient
from datetime import datetime
import re

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

# Genre guidance for different types of passages
GENRE_GUIDANCE = {
    'Fiction': 'Create a narrative with strong character development, a coherent plot, and vivid sensory details.',
    'Historical Fiction': 'Blend accurate historical facts with an engaging narrative that brings the past to life.',
    'Science Fiction': 'Incorporate scientific or technological concepts suitable for the Lexile level, focusing on imagination and curiosity.',
    'Informational': 'Present factual, well-structured information that clearly explains the topic and provides key details.',
    'Expository': 'Offer a clear, logical explanation of the topic, supported by relevant facts and examples.',
    'Persuasive': 'Present a reasoned argument with evidence, guiding readers towards a particular stance or conclusion.',
    'Realistic Fiction': 'Create a believable story that could happen in real life with relatable characters and situations.',
    'Fantasy': 'Build a magical or fantastical world with consistent internal logic and engaging elements.',
    'Mystery': 'Develop an intriguing puzzle or problem to solve with clues and logical resolution.',
    'Adventure': 'Create an exciting story with action, challenges, and character growth.',
    'Horror': 'Build suspense and tension while maintaining age-appropriate content.',
    'Drama': 'Focus on character relationships and emotional development.',
    'Poetry': 'Use rhythm, imagery, and figurative language to convey meaning.',
    'Mythology': 'Incorporate traditional mythological elements and themes.',
    'Fable': 'Create a short story with a clear moral lesson.',
    'Folktale': 'Include traditional storytelling elements and cultural wisdom.',
    'Biography': 'Present factual information about a real person\'s life in an engaging way.',
    'Autobiography': 'Present a first-person account of significant life events.'
}

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

class Standard(BaseModel):
    id: str
    code: str
    standard: str
    description: str

class PassageData(BaseModel):
    topic: str
    genre: str = "Informational"

class GenerateAssessmentRequest(BaseModel):
    genre: str = "Informational"
    generateQuestions: bool = False
    questionStyle: str = "STAAR"
    includeAnswerKey: bool = False
    standards: list[Standard] = []
    isPairedPassage: bool = False
    topic: str | None = None
    passages: list[PassageData] | None = None

    @model_validator(mode='before')
    def validate_passage_data(cls, values):
        if values.get('isPairedPassage'):
            if not values.get('passages') or len(values.get('passages', [])) != 2:
                raise ValueError('Paired passage requires exactly two passages')
        else:
            if not values.get('topic'):
                raise ValueError('Single passage requires a topic')
        return values

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
    genre: str = "Informational"
    reading_level: str
    generateQuestions: bool = False
    questionStyle: str = "STAAR"
    includeAnswerKey: bool = False
    passage: str | None = None
    lexileLevel: str | None = None
    isAIGenerated: bool = True

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

class ParallelGenerateRequest(BaseModel):
    warmUp: GenerateWarmupRequest
    introduction: GenerateGuidedReadingIntroRequest
    practice: GeneratePracticeRequest

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
    Generate a passage with optional questions and answer key.
    """
    try:
        async def generate():
            try:
                print("Initial reading level:", request.reading_level)
                
                # Get specifications for the reading level
                specs = LEXILE_SPECIFICATIONS.get(request.reading_level, LEXILE_SPECIFICATIONS["700-800"])
                category = specs["category"]
                
                # Get genre guidance
                genre_guidance = GENRE_GUIDANCE.get(request.genre, GENRE_GUIDANCE['Informational'])
                
                # Set technical requirements based on reading level
                technical_requirements = f"""
                - {specs['paragraphs']} paragraphs
                - {specs['word_count']} total
                - Lexile range: {specs['range']}
                - Clear topic sentences
                - Appropriate transitions
                - Grade-level vocabulary
                """
                
                # Set question guidance if needed
                question_guidance = """
                Questions Requirements:
                - Each question must assess comprehension
                - Include a mix of literal and inferential questions
                - Use grade-appropriate vocabulary
                - Each question must have 4 answer choices (A-D)
                - Distractors should be plausible but clearly incorrect
                """ if request.generateQuestions else ""
                
                # Set answer key guidance if needed
                answer_key_guidance = """
                Answer Key Requirements:
                - Provide the correct answer (A, B, C, or D)
                - Include a detailed explanation
                - Reference specific text evidence
                """ if request.generateQuestions and request.includeAnswerKey else ""
                
                # Construct the prompt
                prompt = f"""Generate a {request.genre} passage about "{request.topic}" at a {request.reading_level} Lexile level.
                The passage should be presented in a standardized test format and maintain appropriate complexity for {request.reading_level} Lexile level readers.

                Genre-specific requirements:
                {genre_guidance}

                Technical requirements:
                {technical_requirements}

                {question_guidance if request.generateQuestions else ''}
                {answer_key_guidance if request.generateQuestions and request.includeAnswerKey else ''}

                Return the content in this exact format:

                # **[Title]**

                [Passage content with proper paragraphs]

                {'''## Questions

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

[etc...]''' if request.generateQuestions else ''}

                {'''[[ANSWER_KEY_START]]
**Answer Key**

Question 1: [Letter]  
Explanation: [Detailed explanation]

Question 2: [Letter]  
Explanation: [Detailed explanation]

[etc...]''' if request.generateQuestions and request.includeAnswerKey else ''}"""

                # Generate the passage using OpenAI's API
                client = OpenAI(api_key=openai_api_key)
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert in creating educational assessment passages."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.7,
                    stream=True
                )

                content_buffer = ""
                questions = []
                current_question = None
                question_text = ""
                is_collecting_questions = False
                is_collecting_answer_key = False

                for chunk in response:
                    if chunk.choices[0].delta.content is not None:
                        text = chunk.choices[0].delta.content
                        
                        if "## Questions" in text:
                            is_collecting_questions = True
                            yield f"data: {json.dumps({'type': 'content', 'content': text})}\n\n"
                            continue

                        if "[[ANSWER_KEY_START]]" in text:
                            is_collecting_answer_key = True
                            is_collecting_questions = False
                            yield f"data: {json.dumps({'type': 'content', 'content': text})}\n\n"
                            continue

                        if is_collecting_questions:
                            question_text += text
                            # Parse questions as they come in
                            lines = question_text.split('\n')
                            for line in lines:
                                line = line.strip()
                                if line.startswith(('1.', '2.', '3.', '4.', '5.')):
                                    if current_question and len(current_question['answers']) == 4:
                                        questions.append(current_question)
                                    current_question = {
                                        'question': line.split('.', 1)[1].strip(),
                                        'answers': [],
                                        'correctAnswer': '',
                                        'explanation': '',
                                        'standardReference': ''
                                    }
                                elif line.startswith(('A.', 'B.', 'C.', 'D.')) and current_question:
                                    current_question['answers'].append(line.strip())
                                    if len(current_question['answers']) == 4:
                                        questions.append(current_question)
                                        current_question = None
                                        yield f"data: {json.dumps({'type': 'questions', 'questions': questions})}\n\n"
                            yield f"data: {json.dumps({'type': 'content', 'content': text})}\n\n"
                        else:
                            if not is_collecting_answer_key:
                                content_buffer += text
                            yield f"data: {json.dumps({'type': 'content', 'content': text})}\n\n"

                yield f"data: {json.dumps({'type': 'complete'})}\n\n"

            except Exception as e:
                print(f"Error generating passage: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(generate(), media_type='text/event-stream')

    except Exception as e:
        print(f"Error in generate_passage endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
                - [Required text evidence]
                - [Quality indicators]

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

@app.post("/generate-parallel")
async def generate_parallel(request: ParallelGenerateRequest):
    """Generate parallel content streams."""
    return StreamingResponse(generate(), media_type='text/event-stream')

    async def generate():
        try:
            tasks = [
                asyncio.create_task(process_warmup(request.warmUp)),
                asyncio.create_task(process_intro(request.introduction)),
                asyncio.create_task(process_practice(request.practice))
            ]
            
            while tasks:
                done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
                
                for task in done:
                    try:
                        async for chunk in task:
                            yield chunk
                    except Exception as e:
                        print(f"Error processing task: {str(e)}")
                
                tasks = list(pending)

        except Exception as e:
            print(f"Error in parallel generation: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate content'})}\n\n"

async def process_warmup(request: GenerateWarmupRequest):
    """Process warm-up content and stream chunks."""
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
            model="gpt-4o",
            messages=[
                {
                    "role": "system", 
                    "content": "You are an expert reading teacher creating focused, standards-aligned warm-up activities."
                },
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            stream=True
        )

        for chunk in response:
            if chunk.choices[0].delta.content:
                yield f"data: {json.dumps({'source': 'warmUp', 'content': chunk.choices[0].delta.content})}\n\n"

        yield f"data: {json.dumps({'source': 'warmUp', 'type': 'complete'})}\n\n"

    except Exception as e:
        print(f"Error generating warm-up: {str(e)}")
        yield f"data: {json.dumps({'source': 'warmUp', 'type': 'error', 'message': 'Failed to generate warm-up'})}\n\n"

async def process_intro(request: GenerateGuidedReadingIntroRequest):
    """Process introduction content and stream chunks."""
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
                    "content": "You are an expert reading teacher creating focused, standards-aligned guided reading lessons."
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
                yield f"data: {json.dumps({'source': 'introduction', 'content': chunk.choices[0].delta.content})}\n\n"

        yield f"data: {json.dumps({'source': 'introduction', 'type': 'complete'})}\n\n"

    except Exception as e:
        print(f"Error generating introduction: {str(e)}")
        yield f"data: {json.dumps({'source': 'introduction', 'type': 'error', 'message': 'Failed to generate introduction'})}\n\n"

async def process_practice(request: GeneratePracticeRequest):
    """Process practice content and stream chunks."""
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
        - [Required text evidence]
        - [Quality indicators]

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
                    "content": "You are an expert at creating standards-aligned independent practice activities."
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
                yield f"data: {json.dumps({'source': 'practice', 'content': chunk.choices[0].delta.content})}\n\n"

        yield f"data: {json.dumps({'source': 'practice', 'type': 'complete'})}\n\n"

    except Exception as e:
        print(f"Error generating practice: {str(e)}")
        yield f"data: {json.dumps({'source': 'practice', 'type': 'error', 'message': 'Failed to generate practice'})}\n\n"

# Add new model for saving assessments
class SaveAssessmentRequest(BaseModel):
    teacherId: str
    title: str
    passage: str | None = None  # Make passage optional since we might have paired passages
    genre: str
    isAIGenerated: bool = True
    includeAnswerKey: bool = False
    answerKey: str | None = None
    questions: list[dict] = []
    isPairedPassage: bool = False
    passages: list[dict] | None = None

    @model_validator(mode='before')
    def validate_passage_data(cls, values):
        if values.get('isPairedPassage'):
            if not values.get('passages') or len(values.get('passages', [])) != 2:
                raise ValueError('Paired passage requires exactly two passages')
            # For paired passages, concatenate both passages with a separator
            values['passage'] = f"{values['passages'][0].get('content', '')}\n\n---\n\n{values['passages'][1].get('content', '')}"
        else:
            if not values.get('passage'):
                raise ValueError('Single passage requires passage content')
        return values

@app.post("/save-assessment")
async def save_assessment(request: SaveAssessmentRequest):
    """
    Save a generated assessment passage to the database.
    """
    try:
        # Connect to MongoDB
        client = MongoClient(os.environ.get('MONGODB_URI'))
        db = client.teachassist

        # Parse answer key if it exists
        answer_key_data = {}
        if request.answerKey:
            # Split the answer key into individual question answers
            answer_key_sections = request.answerKey.split('\n\n')
            for section in answer_key_sections:
                if section.startswith('Question'):
                    # Extract question number
                    q_num = int(section.split(':')[0].replace('Question', '').strip()) - 1
                    lines = section.split('\n')
                    
                    # Extract answer letter, standard, and explanation
                    answer_letter = lines[0].split(':')[1].strip()
                    standard = ''
                    explanation = ''
                    
                    for line in lines[1:]:
                        if line.startswith('Standard:'):
                            standard = line.replace('Standard:', '').strip()
                        elif line.startswith('Explanation:'):
                            explanation = line.replace('Explanation:', '').strip()
                        elif not line.startswith(('Question', 'Standard:', 'Explanation:')) and explanation:
                            explanation += ' ' + line.strip()
                    
                    answer_key_data[q_num] = {
                        'correctAnswer': answer_letter,
                        'explanation': explanation,
                        'standardReference': standard
                    }

        # Prepare the assessment passage document
        assessment_passage_doc = {
            "teacherId": request.teacherId,
            "title": request.title,
            "passage": request.passage,
            "genre": request.genre,
            "isAIGenerated": request.isAIGenerated,
            "includeAnswerKey": request.includeAnswerKey,
            "answerKey": request.answerKey,
            "isPairedPassage": request.isPairedPassage,
            "passages": request.passages,
            "questions": [
                {
                    "question": q["question"],
                    "answers": q["answers"],
                    "correctAnswer": answer_key_data.get(i, {}).get('correctAnswer', ''),
                    "explanation": answer_key_data.get(i, {}).get('explanation', ''),
                    "standardReference": answer_key_data.get(i, {}).get('standardReference', ''),
                    "bloomsLevel": q.get("bloomsLevel", ""),
                }
                for i, q in enumerate(request.questions)
            ],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }

        # Insert into assessmentpassages collection
        result = db.assessmentpassages.insert_one(assessment_passage_doc)
        
        return {
            "id": str(result.inserted_id), 
            "message": "Assessment passage saved successfully"
        }

    except Exception as e:
        print(f"Error saving assessment passage: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-assessment")
async def generate_assessment(request: GenerateAssessmentRequest):
    """
    Generate an assessment passage with optional questions and answer key.
    """
    try:
        async def generate():
            try:
                # Extract grade level from first standard
                standard_match = re.match(r'(\d+|K)\.', request.standards[0].code)
                if not standard_match:
                    raise ValueError("Could not determine grade level from standards")
                
                grade = standard_match.group(1)
                category = "elementary" if grade in ["K", "1", "2", "3"] else "middle" if grade in ["4", "5", "6"] else "advanced"
                
                # Build standards requirements
                standards_requirements = "This passage must allow assessment of these standards:\n"
                for standard in request.standards:
                    standards_requirements += f"- {standard.code}: {standard.description}\n"
                
                # Set technical requirements based on grade level
                if category == "elementary":
                    technical_requirements = """
                    - 3-4 paragraphs
                    - Simple sentence structure
                    - Grade-appropriate vocabulary
                    - Clear topic sentences
                    - Basic transitions
                    - Concrete examples
                    """
                elif category == "middle":
                    technical_requirements = """
                    - 4-5 paragraphs
                    - Mix of simple and complex sentences
                    - Grade-appropriate academic vocabulary
                    - Strong topic sentences
                    - Varied transitions
                    - Specific examples and details
                    """
                else:
                    technical_requirements = """
                    - 5-6 paragraphs
                    - Complex sentence structure
                    - Sophisticated vocabulary
                    - Advanced transitions
                    - Abstract concepts
                    - Detailed evidence and examples
                    """
                
                # Get genre guidance
                genre_guidance = GENRE_GUIDANCE.get(request.genre, GENRE_GUIDANCE['Informational'])
                
                # Generate the passage using OpenAI's API
                client = OpenAI(api_key=openai_api_key)
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are an expert in creating educational assessment passages."
                        },
                        {
                            "role": "user",
                            "content": f"""Create a passage that follows this exact format:

# **[Title]**

[Passage content with proper paragraphs]

The passage should meet these requirements:
{standards_requirements}

Technical Requirements:
{technical_requirements}

Genre Requirements ({request.genre}):
{genre_guidance}

Topic: {request.topic}"""
                        }
                    ],
                    temperature=0.7,
                    stream=True
                )

                content_buffer = ""
                for chunk in response:
                    if chunk.choices[0].delta.content is not None:
                        text = chunk.choices[0].delta.content
                        content_buffer += text
                        yield f"data: {json.dumps({'type': 'content', 'content': text})}\n\n"

                # After generating the passage, generate questions
                if request.generateQuestions:
                    yield f"data: {json.dumps({'type': 'content', 'content': '\n\n## Questions\n\n'})}\n\n"
                    
                    question_prompt = f"""Create {4 if category == 'elementary' else 5} questions for this passage that assess these standards:
{standards_requirements}

Question Requirements:
- Each question must directly assess one of the standards
- Questions should follow STAAR format with specific question stems
- Include a balanced mix of:
    * Key Ideas and Details (main idea, inference, character analysis)
    * Author's Purpose and Craft (text structure, point of view, author's choices)
    * Integration of Knowledge and Ideas (using evidence, making connections)
- Use academic vocabulary like "central idea," "text structure," "according to the passage"
- Each question must have 4 answer choices (A-D)
- Distractors should be plausible but clearly incorrect
- Use grade-appropriate vocabulary and complexity

Format each question EXACTLY like this:

1. [Question text]
   A. [Answer choice]
   B. [Answer choice]
   C. [Answer choice]
   D. [Answer choice]

Standard: [Standard being assessed]

[Continue for remaining questions]

Here's the passage:
{content_buffer}"""

                    # Generate questions
                    question_messages = [
                        {"role": "system", "content": "You are an expert in creating STAAR-aligned assessment questions. Follow the formatting exactly as specified."},
                        {"role": "user", "content": question_prompt}
                    ]

                    question_response = client.chat.completions.create(
                        model="gpt-4o",
                        messages=question_messages,
                        temperature=0.7,
                        stream=True
                    )

                    questions = []
                    current_question = None
                    question_text = ""
                    for chunk in question_response:
                        if chunk.choices[0].delta.content is not None:
                            text = chunk.choices[0].delta.content
                            question_text += text
                            yield f"data: {json.dumps({'type': 'content', 'content': text})}\n\n"

                            # Parse questions as they come in
                            lines = question_text.split('\n')
                            for line in lines:
                                line = line.strip()
                                if line.startswith(('1.', '2.', '3.', '4.', '5.')):
                                    if current_question and len(current_question['answers']) == 4:
                                        questions.append(current_question)
                                    current_question = {
                                        'question': line.split('.', 1)[1].strip(),
                                        'answers': [],
                                        'correctAnswer': '',
                                        'explanation': '',
                                        'standardReference': ''
                                    }
                                elif line.startswith(('A.', 'B.', 'C.', 'D.')) and current_question:
                                    current_question['answers'].append(line.strip())
                                elif line.startswith('Standard:') and current_question:
                                    current_question['standardReference'] = line.replace('Standard:', '').strip()
                                    if len(current_question['answers']) == 4:
                                        questions.append(current_question)
                                        current_question = None
                                        yield f"data: {json.dumps({'type': 'questions', 'questions': questions})}\n\n"

                    # Add the last question if complete
                    if current_question and len(current_question['answers']) == 4:
                        questions.append(current_question)
                        yield f"data: {json.dumps({'type': 'questions', 'questions': questions})}\n\n"

                    # If answer key is requested, generate it
                    if request.includeAnswerKey:
                        yield f"data: {json.dumps({'type': 'content', 'content': '\n\n[[ANSWER_KEY_START]]\n**Answer Key**\n\n'})}\n\n"
                        
                        answer_key_prompt = """For each question, provide:
1. The correct answer (A, B, C, or D)
2. The specific standard being assessed
3. A detailed explanation of why the answer is correct, citing evidence from the text

Format EXACTLY like this:

Question 1: [Letter]  
Standard: [Standard code and description]
Explanation: [Detailed explanation with text evidence]

Question 2: [Letter]  
Standard: [Standard code and description]
Explanation: [Detailed explanation with text evidence]

[etc...]"""

                        answer_key_messages = [
                            {"role": "system", "content": "You are an expert in creating detailed answer keys for assessment questions. Follow the formatting exactly as specified."},
                            {"role": "assistant", "content": f"Here are the passage and questions that were generated:\n\nPassage:\n{content_buffer}\n\nQuestions:\n{question_text}"},
                            {"role": "user", "content": answer_key_prompt}
                        ]

                        answer_key_response = client.chat.completions.create(
                            model="gpt-4o",
                            messages=answer_key_messages,
                            temperature=0.7,
                            stream=True
                        )

                        for chunk in answer_key_response:
                            if chunk.choices[0].delta.content is not None:
                                text = chunk.choices[0].delta.content
                                yield f"data: {json.dumps({'type': 'content', 'content': text})}\n\n"

                yield f"data: {json.dumps({'type': 'complete'})}\n\n"

            except Exception as e:
                print(f"Error generating assessment: {e}")
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(generate(), media_type='text/event-stream')

    except Exception as e:
        print(f"Error in generate_assessment endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

