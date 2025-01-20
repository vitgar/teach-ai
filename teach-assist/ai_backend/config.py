"""
Configuration settings for the AI backend.
"""

# OpenAI model configurations
OPENAI_MODELS = {
    "default": "gpt-4o",
    "chat": "gpt-4o",
    "passage": "gpt-4o",
    "story": "gpt-4o"
}

# Model mapping for different endpoints
ENDPOINT_MODELS = {
    "generate_passage": "gpt-4o",
    "generate_worksheet": "gpt-4o",
    "generate_warmup": "gpt-4o",
    "generate_story": "gpt-4o",
    "generate_guided_reading_intro": "gpt-4o",
    "generate_practice": "gpt-4o",
    "generate_exit_ticket": "gpt-4o",
    "generate_graphic_organizer": "gpt-4o",
    "improve_observation": "gpt-4o",
    "parse_students": "gpt-4o",
    "parse_students_from_image": "gpt-4o"
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