# # main.py

# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# from fastapi.middleware.cors import CORSMiddleware
# from lesson_plan_generator import send_request_to_openai
# import openai
# import os
# from dotenv import load_dotenv

# # Load environment variables from a .env file
# load_dotenv()

# # Set the OpenAI API key
# openai.api_key = os.environ.get("OPENAI_API_KEY")
# if not openai.api_key:
#     raise ValueError("OPENAI_API_KEY is not set in environment variables.")

# # Initialize FastAPI application
# app = FastAPI()

# # Add CORS middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Restrict this in production
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Pydantic models
# class ImproveInterventionRequest(BaseModel):
#     text: str

# class ImproveInterventionResponse(BaseModel):
#     improved_text: str

# # Route to improve intervention notes
# @app.post("/improve-intervention", response_model=ImproveInterventionResponse)
# async def improve_intervention(request: ImproveInterventionRequest):
#     """
#     Improve the intervention text using OpenAI's GPT model.
#     """
#     try:
#         response = openai.ChatCompletion.create(
#             model="gpt-3.5-turbo",  # Use 'gpt-4' if you have access
#             messages=[
#                 {
#                     "role": "system",
#                     "content": "You are an expert educator helping to improve intervention notes for clarity and effectiveness.",
#                 },
#                 {
#                     "role": "user",
#                     "content": f"Please improve the following intervention note for clarity and effectiveness:\n\n\"{request.text}\"",
#                 },
#             ],
#             temperature=0.7,
#             max_tokens=150,  # Adjust as needed
#         )

#         improved_text = response.choices[0].message['content'].strip()
#         return ImproveInterventionResponse(improved_text=improved_text)

#     except openai.error.OpenAIError as e:
#         # Handle OpenAI API errors
#         print(f"OpenAI API error: {e}")
#         raise HTTPException(status_code=500, detail="Failed to improve intervention text.")

#     except Exception as e:
#         # Handle other exceptions
#         print(f"Unexpected error: {e}")
#         raise HTTPException(status_code=500, detail="An unexpected error occurred.")

# # Run the application
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
