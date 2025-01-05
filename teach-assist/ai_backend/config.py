"""
Configuration settings for the AI backend.
"""

# OpenAI Model Settings
OPENAI_MODELS = {
    "default": "gpt-4o",  # Default model for complex tasks
    "mini": "gpt-4o-mini",  # Lighter model for simpler tasks
}

# Model assignments for different endpoints
ENDPOINT_MODELS = {
    "generate_passage": OPENAI_MODELS["default"],
    "generate_worksheet": OPENAI_MODELS["mini"],
    "generate_warmup": OPENAI_MODELS["mini"],
    "generate_story": OPENAI_MODELS["mini"],
    "generate_guided_reading_intro": OPENAI_MODELS["mini"],
    "generate_graphic_organizer": OPENAI_MODELS["mini"],
    "generate_exit_ticket": OPENAI_MODELS["mini"],
    "generate_practice": OPENAI_MODELS["mini"],
    "improve_observation": OPENAI_MODELS["mini"],
    "chat": OPENAI_MODELS["default"],
    "parse_students_from_image": OPENAI_MODELS["default"],
    "parse_students": OPENAI_MODELS["default"],
}

# API Settings
API_SETTINGS = {
    "timeout": 60,  # Default timeout in seconds
    "temperature": 0.7,  # Default temperature for most endpoints
    "max_tokens": {
        "default": None,  # No limit by default
        "improve_observation": 150,  # Specific limit for observations
    }
} 