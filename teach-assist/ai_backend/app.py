from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv
import json
import base64
from PIL import Image
import io
import re
import pytesseract

load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Add this mapping at the top with other constants
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

@app.route('/generate-passage', methods=['POST'])
def generate_passage():
    data = request.json
    print("Received data:", data)
    reading_level = data.get('reading_level')
    print("Initial reading level:", reading_level)
    topic = data.get('topic')
    genre = data.get('genre', 'Informational')
    generate_questions = data.get('generateQuestions', False)
    question_style = data.get('questionStyle', 'STAAR')
    include_answer_key = data.get('includeAnswerKey', False)

    def parse_lexile_level(level_str):
        """
        Returns the Lexile range for the given level string.
        """
        try:
            # Get the specification for this level directly
            spec = LEXILE_SPECIFICATIONS.get(level_str)
            if spec:
                return spec["range"]
            return None
        except Exception as e:
            print(f"Error parsing Lexile level: {e}")
            return None

    def generate():
        nonlocal reading_level
        try:
            print("Processing reading level:", reading_level)
            
            # Get specifications based on reading level
            spec = LEXILE_SPECIFICATIONS.get(reading_level)
            if not spec:
                raise ValueError(f"Reading level '{reading_level}' is not supported.")
            
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
            }.get(genre, 'Create an engaging passage that effectively addresses the given topic.')

            # Adjust technical requirements based on Lexile specifications
            if category == 'elementary':
                technical_requirements = f"""
- Maintain an approximate Lexile level of {reading_level}.
- Use simple and clear language appropriate for this reading level.
- {paragraph_instructions}
- Ensure precise organization and a polished tone.
- Follow standard test passage formatting conventions (e.g., a clear, bold title; well-structured paragraphs).
"""
            elif category == 'middle':
                technical_requirements = f"""
- Maintain an approximate Lexile level of {reading_level}.
- Use clear, coherent, and engaging language appropriate for this reading level.
- {paragraph_instructions}
- Include descriptive details and logical transitions between ideas.
- Ensure precise organization, logical progression of ideas, and a polished tone.
- Follow standard test passage formatting conventions (e.g., a clear, bold title; well-structured paragraphs).
"""
            else:  # high
                technical_requirements = f"""
- Maintain an approximate Lexile level of {reading_level}.
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
            if generate_questions:
                if question_style.upper() == "STAAR":
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
                    if include_answer_key:
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
            prompt = f"""Generate a {genre} passage about "{topic}" at a {reading_level} Lexile level.
The passage should be presented in a standardized {question_style} test format and maintain appropriate complexity for {reading_level} Lexile level readers.

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

            # Generate the passage using OpenAI's API (assuming `client` is properly configured)
            response = client.chat.completions.create(
                model="gpt-4o",  # Corrected model name
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert in creating Lexile-appropriate reading passages."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    text = chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'type': 'content', 'content': text})}\n\n"

            yield f"data: {json.dumps({'type': 'complete'})}\n\n"

        except Exception as e:
            print(f"Error generating passage: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream'
    )


@app.route('/generate-worksheet', methods=['POST'])
def generate_worksheet():
    data = request.json
    worksheet_type = data.get('worksheetType')
    prompt = data.get('prompt')
    teacher_grade = data.get('teacherGrade')
    teaching_standards = data.get('teachingStandards', [])

    if not worksheet_type or not prompt:
        return jsonify({"error": "Worksheet type and prompt are required"}), 400

    def generate():
        try:
            system_prompt = """You are an expert teacher and educational content creator.
            Create engaging, grade-appropriate worksheets with clear instructions and exercises.
            Use proper Markdown formatting for structure and layout.

            For multiple choice questions, use this exact format:

            ## Multiple Choice Questions

            1.        Question text goes here?

                     a)  First choice

                     b)  Second choice

                     c)  Third choice

                     d)  Fourth choice


            2.        Next question text?

                     a)  First choice

                     b)  Second choice

                     c)  Third choice

                     d)  Fourth choice

            Note: 
            - Keep number and dot together (no space between them)
            - Add exactly eight spaces between the dot and the question text
            - Place each choice on its own line with proper indentation
            - Add empty line between questions
            - Add empty line after each choice
            - Keep consistent spacing throughout
            - Ensure vertical alignment of choices"""

            main_prompt = f"""Create a {worksheet_type} worksheet about: {prompt}

            Requirements:
            - Grade Level: {teacher_grade}
            - Type: {worksheet_type}
            - Use Markdown for proper formatting
            - Include clear sections
            - Format for optimal presentation
            - Ensure proper spacing between questions and answers

            IMPORTANT: Place the text '[[ANSWER_KEY_START]]' on a new line before starting the answer key section.

            Create the worksheet now, using this exact format:

            # Worksheet Title

            [Worksheet content here...]

            [[ANSWER_KEY_START]]

            # Answer Key

            [Answer key content here...]"""

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": main_prompt}
                ],
                temperature=0.7,
                stream=True
            )

            # Stream the response
            current_content = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    current_content += content
                    yield json.dumps({
                        "content": content,
                        "done": False
                    }) + '\n'

            # Send a final message indicating completion
            yield json.dumps({
                "content": "",
                "done": True,
                "fullContent": current_content
            }) + '\n'

        except Exception as e:
            print(f"Error generating worksheet: {str(e)}")
            yield json.dumps({"error": str(e)}) + '\n'

    return Response(
        stream_with_context(generate()),
        mimetype='application/x-ndjson'
    )

@app.route('/generate-warmup', methods=['POST'])
def generate_warmup():
    data = request.json
    topic = data.get('topic')
    story_title = data.get('storyTitle')
    story_content = data.get('storyContent')
    
    if not all([topic, story_title, story_content]):
        return jsonify({"error": "Topic, story title, and content are required"}), 400
        
    def generate():
        try:
            prompt = f"""Create a brief 2-3 minute warm-up activity to prepare students for reading about {topic}.

            Story Title: {story_title}
            Story Content: {story_content}

            Format the response in markdown:
            ### Warm-Up Activity: {topic}

            **Time:** 2-3 minutes

            **Objective:**
            [Brief statement of what students will do]

            **Activity Steps:**
            1. [First step]
            2. [Second step]
            3. [Third step]

            **Teacher Notes:**
            - [Important points to remember]
            - [What to look for]
            """

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert at creating engaging warm-up activities for reading lessons."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            content = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content += chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

            yield f"data: {json.dumps({'type': 'complete', 'content': content})}\n\n"
            
        except Exception as e:
            print(f"Error generating warm-up: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate warm-up'})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/generate-story', methods=['POST'])
def generate_story():
    data = request.json
    topic = data.get('topic')
    lexile_level = data.get('lexileLevel')
    
    if not topic or not lexile_level:
        return jsonify({"error": "Topic and Lexile level are required"}), 400
        
    def generate():
        try:
            # First generate the story
            story_prompt = f"""Create a short, engaging paragraph-long story that can be used to teach the reading skill of {topic}. 
            The story should be at {lexile_level} reading level.
            
            Requirements:
            - One paragraph long (approximately 100-150 words)
            - Age-appropriate vocabulary at {lexile_level} level
            - Clear beginning, middle, and end
            - Story should be designed to naturally demonstrate {topic} without explicitly mentioning it
            - Vocabulary and sentence structure appropriate for {lexile_level}
            - Include grade-level appropriate vocabulary
            - The story should be subtle in teaching the skill - don't mention the skill directly
            """

            story_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": f"You are an expert at creating engaging stories at {lexile_level} reading level that subtly teach reading skills."},
                    {"role": "user", "content": story_prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            story_text = ""
            for chunk in story_response:
                if chunk.choices[0].delta.content:
                    story_text += chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'type': 'story', 'content': chunk.choices[0].delta.content})}\n\n"

            # Then generate the title
            title_prompt = f"""Create a short, engaging title for this story. The title should:
            - Be creative and engaging
            - Not mention {topic} or any teaching aspects
            - Relate directly to the story's content
            - Be appropriate for {lexile_level} level
            - Be memorable and fun
            
            Story: {story_text}
            
            Return just the title, no quotes or extra text."""
            
            title_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Create engaging, story-specific titles that capture the essence of the story without revealing its teaching purpose."},
                    {"role": "user", "content": title_prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            title = ""
            for chunk in title_response:
                if chunk.choices[0].delta.content:
                    title += chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'type': 'title', 'content': chunk.choices[0].delta.content})}\n\n"

            # Send final complete data
            yield f"data: {json.dumps({'type': 'complete', 'title': title.strip(), 'content': story_text.strip()})}\n\n"
            
        except Exception as e:
            print(f"Error generating story: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate story'})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/generate-guided-reading-intro', methods=['POST'])
def generate_guided_reading_intro():
    data = request.json
    story_title = data.get('title')
    story_content = data.get('content')
    reading_skill = data.get('skill')
    
    if not all([story_title, story_content, reading_skill]):
        return jsonify({"error": "Story title, content, and reading skill are required"}), 400
        
    def generate():
        try:
            prompt = f"""Create a brief 5-minute guided reading introduction lesson for this story. 
            The lesson should focus on teaching {reading_skill}.

            Story Title: {story_title}
            Story Content: {story_content}

            Format the response in markdown:
            ### 5-Minute Introduction Lesson: {reading_skill}
            [Rest of your prompt...]
            """

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert reading teacher creating focused, practical guided reading lessons."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            content = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content += chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

            yield f"data: {json.dumps({'type': 'complete', 'content': content})}\n\n"
            
        except Exception as e:
            print(f"Error generating guided reading intro: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate lesson introduction'})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/generate-graphic-organizer', methods=['POST'])
def generate_graphic_organizer():
    data = request.json
    story_title = data.get('title')
    story_content = data.get('content')
    reading_skill = data.get('skill')
    
    if not all([story_title, story_content, reading_skill]):
        return jsonify({"error": "Story title, content, and reading skill are required"}), 400
        
    try:
        prompt = f"""Create a simple graphic organizer to help students analyze the story and practice {reading_skill} skills.

        Story Title: {story_title}
        Story Content: {story_content}

        Requirements:
        - Create a clear, printable graphic organizer format
        - Focus on {reading_skill} skills
        - Include 3-4 key elements or sections
        - Add brief instructions for completing each section
        - Keep it simple and grade-appropriate
        - Format it in a way that's easy to understand and use
        
        Return the response in this format:
        TITLE: [Title of graphic organizer]
        INSTRUCTIONS: [Brief instructions for teachers]
        
        SECTIONS:
        1. [Section name]
   - [What students should write/do here]

        2. [Section name]
   - [What students should write/do here]

        [etc...]"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert at creating educational graphic organizers for reading comprehension."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        organizer_content = response.choices[0].message.content.strip()
        return jsonify({"content": organizer_content})
        
    except Exception as e:
        print(f"Error generating graphic organizer: {str(e)}")
        return jsonify({"error": "Failed to generate graphic organizer"}), 500

@app.route('/generate-exit-ticket', methods=['POST'])
def generate_exit_ticket():
    data = request.json
    story_title = data.get('storyTitle')
    story_content = data.get('storyContent')
    skill = data.get('skill')
    practice_content = data.get('practiceContent')  # Get the practice story content
    
    if not all([story_title, story_content, skill, practice_content]):
        return jsonify({"error": "Story title, content, skill, and practice content are required"}), 400
        
    def generate():
        try:
            # Extract the practice story title and content from the markdown
            practice_lines = practice_content.split('\n')
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

            prompt = f"""Create a quick 2-minute exit ticket activity based on the Independent Practice story that checks students' understanding of {skill}.

            Practice Story Title: {practice_title}
            Practice Story Content: {practice_story}

            Format the response in markdown:
            ### 2-Minute Exit Ticket: Checking Understanding

            **Time:** 2 minutes

            **Task:**
            Based on the story "{practice_title}", complete the following:
            [Brief task description focusing on {skill}]

            **Instructions for Students:**
            1. [First step specifically about the practice story]
            2. [Second step using examples from the practice story]

            **Success Criteria:**
            - [What students need to demonstrate about {skill} using the practice story]
            - [How they should use specific examples from the practice story]
            
            **Teacher Note:**
            [What to look for in student responses regarding {skill} and their understanding of the practice story]
            """

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert at creating effective exit tickets that check student understanding of specific reading skills using practice stories."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            content = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content += chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

            yield f"data: {json.dumps({'type': 'complete', 'content': content})}\n\n"
            
        except Exception as e:
            print(f"Error generating exit ticket: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate exit ticket'})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/generate-practice', methods=['POST'])
def generate_practice():
    data = request.json
    skill = data.get('skill')
    story_title = data.get('storyTitle')
    story_content = data.get('storyContent')
    
    if not all([skill, story_title, story_content]):
        return jsonify({"error": "Skill, story title, and content are required"}), 400
        
    def generate():
        try:
            prompt = f"""Create a practice activity with a new short story focusing on {skill}.

            Format the response in markdown:
            ### Independent Practice Story: [Generate an engaging title for the story]

            [Write a short story here that demonstrates {skill} - about 100 words]

            **Practice Questions:**
            1. [Question specifically about {skill}]
            2. [Another question about {skill}]
            3. [Final question about {skill}]

            **Student Instructions:**
            1. Read the story carefully
            2. Think about {skill} as you read
            3. Answer the questions using evidence from the text
            """

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert at creating educational content and practice activities."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                stream=True
            )
            
            content = ""
            for chunk in response:
                if chunk.choices[0].delta.content:
                    content += chunk.choices[0].delta.content
                    yield f"data: {json.dumps({'content': chunk.choices[0].delta.content})}\n\n"

            # Send completion message
            yield f"data: {json.dumps({'type': 'complete', 'content': content})}\n\n"
            
        except Exception as e:
            print(f"Error generating practice content: {str(e)}")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Failed to generate practice content'})}\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

@app.route('/improve-observation', methods=['POST'])
def improve_observation():
    data = request.json
    observation = data.get('observation')
    topic = data.get('topic')
    
    if not observation or not topic:
        return jsonify({"error": "Observation and topic are required"}), 400
        
    try:
        prompt = f"""Enhance this observation about {topic} to be more specific and professional. 
        Keep it concise (2-3 sentences) and natural. Focus on the student's understanding of {topic}.
        Do not include any phrases like 'revised' or 'improved' or anything that indicates AI modification.
        Simply provide the enhanced observation as if it was written directly by the teacher.

        Original: {observation}

        Guidelines:
        1. Keep it brief but specific
        2. Use professional educational language
        3. Focus on observable behaviors related to {topic}
        4. Include one clear next step
        5. Write in a natural teacher's voice
        6. Do not use any meta-language about the observation being revised or improved
        """

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are writing as the teacher, providing direct observations about students."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=150  # Limit the response length
        )
        
        improved_observation = response.choices[0].message.content.strip()
        
        # Remove any potential prefixes like "Enhanced:" or "Improved:"
        improved_observation = improved_observation.replace("Enhanced:", "").replace("Improved:", "").strip()
        
        return jsonify({"content": improved_observation})
        
    except Exception as e:
        print(f"Error improving observation: {str(e)}")
        return jsonify({"error": "Failed to improve observation"}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message')
    teacher_id = data.get('teacherId')

    if not message:
        return jsonify({"error": "Message is required"}), 400

    try:
        def generate():
            system_prompt = """You are an expert teaching coach and educational consultant with decades of experience. 
            Your role is to help teachers improve their teaching practice, provide guidance on instructional strategies, 
            classroom management, lesson planning, and student engagement. You have deep knowledge of:

            1. Pedagogical best practices
            2. Differentiated instruction
            3. Assessment strategies
            4. Classroom management techniques
            5. Social-emotional learning
            6. Special education accommodations
            7. Technology integration
            8. Professional development

            Provide detailed, practical advice and always explain the reasoning behind your suggestions. 
            Use markdown formatting to structure your responses with headers, bullet points, and emphasis where appropriate.
            When relevant, provide specific examples and scenarios to illustrate your points."""

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                stream=True
            )

            for chunk in response:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        return Response(stream_with_context(generate()), mimetype='text/event-stream')

    except Exception as e:
        print(f"Error in chat: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/parse-students-from-image', methods=['POST'])
def parse_students_from_image():
    try:
        data = request.json
        image_data = data.get('image')
        teacher_grade = data.get('teacherGrade')
        teacher_id = data.get('teacherId')  # Get teacherId from request
        
        # Use GPT to parse the text content
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
                    "content": f"Extract ALL student information from this data. The data appears to be in a table format with columns for first name, last name, and reading level. Process EVERY row: {image_data}"
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
                student['gradeLevel'] = student.get('gradeLevel', teacher_grade)
                student['teacherId'] = teacher_id  # Add teacherId to each student
                if not all(key in student for key in ['firstName', 'lastName']):
                    raise ValueError("Missing required fields in student data")
            
            return jsonify({
                'students': students,
                'message': f'Successfully processed {len(students)} students'
            })
            
        except json.JSONDecodeError as je:
            print("JSON Decode Error:", je)
            return jsonify({
                'error': 'Invalid JSON format in response',
                'details': str(je)
            }), 500
            
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({
            'error': 'Failed to process image',
            'details': str(e)
        }), 500

@app.route('/parse-students', methods=['POST'])
def parse_students():
    data = request.json
    text = data.get('text')
    teacher_grade = data.get('teacherGrade', '')
    teacher_id = data.get('teacherId', '')
    
    print("Received request with:")
    print(f"Text length: {len(text) if text else 0}")
    print(f"Teacher grade: {teacher_grade}")
    print(f"Teacher ID: {teacher_id}")
    
    if not text:
        return jsonify({"error": "Text is required"}), 400
    try:
        # Create a prompt that explains what we want
        prompt = f"""Extract student information from the following text and return a JSON array of student objects.
        Each student object should have: 
        - firstName (required)
        - lastName (required)
        - studentId (required, generate a random ID if not provided)
        - gradeLevel (use "{teacher_grade}" if not specified)
        - readingLevel (required)
        - teacherId (use "{teacher_id}")
        - periodId (optional)
        - groupIds (optional, array of strings)
        - intervention (optional)
        - interventionResults (optional)
        The text might be in any format but will contain student information.
        If certain information is missing, make reasonable assumptions based on context.
        
        Text to parse:
        {text}
        Return only the JSON array without any markdown formatting or code blocks.
        Example format:
        [
          {{
            "firstName": "John",
            "lastName": "Doe",
            "studentId": "ST" + random 6 digits,
            "gradeLevel": "{teacher_grade}",
            "readingLevel": "B",
            "teacherId": "{teacher_id}",
            "periodId": null,
            "groupIds": [],
            "intervention": "",
            "interventionResults": ""
          }}
        ]
        """
        print("Sending request to GPT...")
        
        # Call OpenAI API
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
        print("Received response from GPT")
        
        # Get the response text and clean it
        students_json = response.choices[0].message.content.strip()
        print(f"Raw GPT response: {students_json[:200]}...")
        
        # Remove markdown code block if present
        if students_json.startswith('```'):
            students_json = students_json.replace('```json', '').replace('```', '').strip()
        print(f"Cleaned JSON: {students_json[:200]}...")
        
        students = json.loads(students_json)
        print(f"Successfully parsed JSON. Found {len(students)} students")
        
        # Validate the structure of each student object
        required_fields = ['firstName', 'lastName', 'studentId', 'gradeLevel', 'readingLevel', 'teacherId']
        for i, student in enumerate(students):
            print(f"Validating student {i + 1}: {student.get('firstName', 'N/A')} {student.get('lastName', 'N/A')}")
            if not all(key in student for key in required_fields):
                missing = [key for key in required_fields if key not in student]
                raise ValueError(f"Student {i + 1} missing required fields: {', '.join(missing)}")
        
        print("All validations passed. Returning response.")
        return jsonify({"students": students})
        
    except json.JSONDecodeError as e:
        print(f"JSON Decode Error: {str(e)}")
        print(f"Problematic JSON: {students_json if 'students_json' in locals() else 'Not available'}")
        return jsonify({"error": "Failed to parse AI response as JSON"}), 500
    except ValueError as e:
        print(f"Validation Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        print(f"Unexpected Error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5001)