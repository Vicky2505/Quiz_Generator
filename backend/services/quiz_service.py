import fitz
import re
import json
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL
from database.mongo import quizzes_collection
from datetime import datetime


groq_client = Groq(api_key=GROQ_API_KEY)

def text_chunk_limit(text, max_tokens=1500):
    return text[:max_tokens]

def generate_quiz_from_pdf(pdf_file, created_by, course_id=None, title="Untitled Quiz"):
    """
    Generates quiz from PDF and stores in MongoDB.
    Accepts optional title and course_id.
    """
    try:
        doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
        extracted_text = "".join(page.get_text() for page in doc)
        doc.close()
    except Exception as e:
        raise Exception(f"Failed to read PDF: {e}")

    prompt = f"""
Generate 10 multiple choice questions based on the following content:

{text_chunk_limit(extracted_text)}

Format:
[
  {{
    "question": "Your question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Correct Option"
  }}
]
"""
    try:
        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
        )

        content = response.choices[0].message.content.strip()
        json_match = re.search(r"\[\s*{.*?}\s*]", content, re.DOTALL)
        if not json_match:
            raise ValueError("No JSON block found.")

        quiz_data = json.loads(json_match.group(0))

        # Store in MongoDB with title and course_id
        quiz_id = quizzes_collection.insert_one({
            "title": title,
            "questions": quiz_data,
            "created_by": created_by,
            "course_id": course_id,
            "created_at": datetime.utcnow()
        }).inserted_id

        return {
            "quiz_id": str(quiz_id),
            "title": title,
            "course_id": course_id,
            "questions": quiz_data
        }

    except Exception as e:
        raise Exception(f"Quiz generation failed: {e}")

def get_latest_quiz():
    quiz = quizzes_collection.find_one(sort=[("_id", -1)])
    if quiz:
        return quiz
    return None

def evaluate_quiz(user_answers):
    quiz = get_latest_quiz()
    if not quiz:
        return []

    results = []
    for idx, q in enumerate(quiz["questions"]):
        selected = user_answers.get(str(idx)) or user_answers.get(idx)
        results.append({
            "question": q["question"],
            "correct": q["answer"],
            "selected": selected,
            "is_correct": selected == q["answer"]
        })
    return results
