import os
import json
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import time
import asyncio
from dotenv import load_dotenv

from google import genai
from google.genai import types

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")

client = None
if API_KEY:
    client = genai.Client(api_key=API_KEY)

app = FastAPI()

# Add CORS middleware to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS = ["gemini-flash-lite-latest", "gemini-3.5-flash-lite"]

def generate_with_fallback(contents, config=None):
    if not client:
        raise ValueError("Gemini API client is not initialized.")
    last_err = None
    for model_name in MODELS:
        print(f"DEBUG: Trying model {model_name}...", flush=True)
        try:
            res = client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
            print(f"DEBUG: Success with {model_name}!", flush=True)
            return res
        except Exception as e:
            print(f"DEBUG: Error with {model_name}: {e}", flush=True)
            last_err = e
            continue
    raise last_err

@app.get("/")
def home():
    return {
        "message": "EngiMind Backend Running"
    }

@app.get("/diagnose")
def diagnose():
    if not API_KEY:
        return {
            "issue": "Bearing Wear (Simulated)",
            "severity": "High",
            "recommendation": "Set GEMINI_API_KEY in .env to enable AI"
        }
    
    try:
        prompt = '''
        You are an AI diagnostic assistant for an industrial plant.
        Generate a random but realistic machine fault diagnosis.
        Return ONLY a JSON object with the following keys:
        - "issue": a short string describing the mechanical or electrical issue.
        - "severity": a string, either "Low", "Medium", or "High".
        - "recommendation": a short string with a recommended corrective action.
        Ensure it is valid JSON and nothing else.
        '''
        response = generate_with_fallback(
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return json.loads(response.text)
    except Exception as e:
        return {
            "issue": "API Error",
            "severity": "High",
            "recommendation": f"Check API connection: {str(e)}"
        }

@app.get("/report")
def report():
    if not API_KEY:
        return {
            "machine": "Motor #12A (Simulated)",
            "status": "Critical",
            "action": "Set GEMINI_API_KEY in .env to enable AI"
        }
    try:
        prompt = '''
        You are an AI reporting system for an industrial plant.
        Generate a random but realistic machine maintenance report summary.
        Return ONLY a JSON object with the following keys:
        - "machine": a string indicating a machine name or ID (e.g., "Turbine #3B").
        - "status": a string, e.g., "Critical", "Warning", "Normal", "Offline".
        - "action": a string describing the required action.
        Ensure it is valid JSON and nothing else.
        '''
        response = generate_with_fallback(
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return json.loads(response.text)
    except Exception as e:
        return {
            "machine": "Error",
            "status": "Error",
            "action": f"API Error: {str(e)}"
        }

@app.post("/analyze")
async def analyze_custom(prompt: str = Form(""), file: UploadFile = File(None)):
    if not API_KEY:
        return {"response": "API Key is not set. Please update your .env file."}
    
    try:
        contents = []
        
        if prompt.strip():
            contents.append(prompt)
        elif not file:
            return {"response": "Please provide a prompt or upload a file."}
        else:
            contents.append("Please analyze this attached document/image in the context of industrial engineering.")
            
        if file:
            file_bytes = await file.read()
            mime_type = file.content_type or "image/jpeg"
            contents.append(
                types.Part.from_bytes(
                    data=file_bytes,
                    mime_type=mime_type,
                )
            )
            
        response = generate_with_fallback(contents=contents)
        return {"response": response.text}
    except Exception as e:
        return {"response": f"Error analyzing data: {str(e)}"}

@app.post("/quiz")
async def generate_quiz(topic: str = Form("")):
    if not API_KEY:
        return {"error": "API Key is not set."}
    
    if not topic.strip():
        return {"error": "Please provide a topic for the quiz."}
    
    try:
        prompt = f'''
        You are an engineering professor. Generate a 3-question multiple-choice quiz about "{topic}".
        Return ONLY a JSON array of objects, where each object has:
        - "question": the question text.
        - "options": an array of 4 strings.
        - "answer": the index (0-3) of the correct option.
        - "explanation": a short explanation of why that answer is correct.
        Ensure it is valid JSON and nothing else.
        '''
        response = generate_with_fallback(
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json"),
        )
        return {"quiz": json.loads(response.text)}
    except Exception as e:
        return {"error": f"Error generating quiz: {str(e)}"}
