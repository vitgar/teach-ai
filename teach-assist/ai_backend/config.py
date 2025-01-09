"""
Configuration settings for the AI backend.
"""

# OpenAI model configurations
OPENAI_MODELS = {
    "default": "gpt-4",
    "chat": "gpt-4",
    "passage": "gpt-4",
    "story": "gpt-4"
}

# Model mapping for different endpoints
ENDPOINT_MODELS = {
    "generate_passage": "gpt-4",
    "generate_worksheet": "gpt-4",
    "generate_warmup": "gpt-4",
    "generate_story": "gpt-4",
    "generate_guided_reading_intro": "gpt-4",
    "generate_practice": "gpt-4",
    "generate_exit_ticket": "gpt-4",
    "generate_graphic_organizer": "gpt-4",
    "improve_observation": "gpt-4",
    "parse_students": "gpt-4",
    "parse_students_from_image": "gpt-4"
}

# API settings
API_SETTINGS = {
    "temperature": 0.7,
    "timeout": 60,
    "max_tokens": {
        "default": 1000,
        "improve_observation": 200,
        "parse_students": 500
    }
} 