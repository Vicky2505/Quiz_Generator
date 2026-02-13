from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity
from utils.decorators import staff_required, student_required
from services.quiz_service import generate_quiz_from_pdf, get_latest_quiz
from database.mongo import quizzes_collection, quiz_results_collection
from bson import ObjectId
from datetime import datetime

quiz_bp = Blueprint("quiz", __name__)

# ---------------- STAFF GET THEIR QUIZZES ----------------
@quiz_bp.route("/staff/quizzes", methods=["GET"])
@staff_required
def get_staff_quizzes():
    staff_id = get_jwt_identity()
    quizzes_cursor = quizzes_collection.find({"created_by": staff_id}).sort("_id", -1).limit(5)

    quizzes = []
    for quiz in quizzes_cursor:
        quizzes.append({
            "quiz_id": str(quiz["_id"]),
            "course_id": quiz.get("course_id"),
            "title": quiz.get("title", "Untitled Quiz"),
            "questions_count": len(quiz.get("questions", [])),
            "created_at": quiz.get("created_at", datetime.utcnow())
        })
    return jsonify({"quizzes": quizzes}), 200

# ---------------- STAFF UPLOAD QUIZ ----------------
@quiz_bp.route("/staff/quiz/upload", methods=["POST"])
@staff_required
def staff_upload_quiz():
    if 'pdf' not in request.files:
        return jsonify({"message": "No PDF uploaded"}), 400
    
    pdf_file = request.files['pdf']
    course_id = request.form.get("course_id")
    title = request.form.get("title") or "Untitled Quiz"
    identity = get_jwt_identity()

    if not course_id:
        return jsonify({"message": "Course ID is required"}), 400
    
    try:
        quiz = generate_quiz_from_pdf(
            pdf_file, 
            created_by=identity, 
            course_id=course_id, 
            title=title
        )

        return jsonify({
            "message": "Quiz generated successfully!",
            "quiz": quiz["questions"],
            "quiz_id": quiz["quiz_id"],
            "title": quiz["title"],
            "course_id": quiz["course_id"]
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": str(e)}), 500


# ---------------- STAFF GET QUIZ BY ID ----------------
@quiz_bp.route("/staff/quiz/<quiz_id>", methods=["GET"])
@staff_required
def get_staff_quiz_by_id(quiz_id):
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        return jsonify({"message": "Invalid quiz ID format"}), 400

    quiz = quizzes_collection.find_one({"_id": obj_id})
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    # Staff can see full quiz with answers
    questions = quiz.get("questions", [])
    for idx, q in enumerate(questions):
        q["question_id"] = str(idx)

    return jsonify({
        "quiz_id": str(quiz["_id"]),
        "title": quiz.get("title", "Untitled Quiz"),
        "course_id": quiz.get("course_id"),
        "questions": questions
    }), 200

# ---------------- STAFF GET QUIZ BY ID ----------------
@quiz_bp.route("/staff/quiz/<quiz_id>", methods=["GET"])
@staff_required
def staff_get_quiz_by_id(quiz_id):
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        return jsonify({"message": "Invalid quiz ID"}), 400

    quiz = quizzes_collection.find_one({"_id": obj_id})
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    # Include answers for staff
    questions = quiz.get("questions", [])
    for q in questions:
        q["id"] = str(questions.index(q))
    
    return jsonify({
        "quiz_id": str(quiz["_id"]),
        "title": quiz.get("title", "Untitled Quiz"),
        "questions": questions
    }), 200


# ---------------- STUDENT ROUTES ----------------
@quiz_bp.route("/student/quizzes", methods=["GET"])
@student_required
def student_get_quizzes():
    course_id = request.args.get("course_id")
    query = {}
    if course_id:
        query["course_id"] = course_id

    student_id = get_jwt_identity()
    quizzes_cursor = quizzes_collection.find(query).sort("_id", -1)
    quizzes = []

    for quiz in quizzes_cursor:
        quiz_id = str(quiz["_id"])
        # Check if the student has submitted this quiz
        submission = quiz_results_collection.find_one({
            "quiz_id": quiz["_id"],
            "student_id": student_id
        })
        quizzes.append({
            "quiz_id": quiz_id,
            "course_id": quiz.get("course_id"),
            "questions_count": len(quiz.get("questions", [])),
            "title": quiz.get("title", "Untitled Quiz"),
            "description": quiz.get("description", ""),
            "submitted": True if submission else False  # <-- New field
        })

    return jsonify({"quizzes": quizzes}), 200


@quiz_bp.route("/student/quiz/<quiz_id>", methods=["GET"])
@student_required
def get_quiz_by_id(quiz_id):
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        return jsonify({"message": "Invalid quiz ID format"}), 400

    quiz = quizzes_collection.find_one({"_id": obj_id})
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    student_id = get_jwt_identity()
    submission = quiz_results_collection.find_one({
        "quiz_id": obj_id,
        "student_id": student_id
    })

    if submission:
        # Prevent access if already submitted
        return jsonify({
            "submitted": True,
            "message": "You have already submitted this quiz."
        }), 403

    questions = quiz.get("questions", [])
    sanitized_questions = []
    for idx, q in enumerate(questions):
        q_copy = q.copy()
        q_copy.pop("answer", None)
        q_copy["question_id"] = str(idx)
        sanitized_questions.append(q_copy)

    return jsonify({
        "submitted": False,
        "questions": sanitized_questions
    }), 200


@quiz_bp.route("/student/quiz/<quiz_id>/submit", methods=["POST"])
@student_required
def submit_quiz_answers(quiz_id):
    try:
        obj_id = ObjectId(quiz_id)
    except Exception:
        return jsonify({"message": "Invalid quiz ID format"}), 400

    student_id = get_jwt_identity()
    # Check if already submitted
    existing = quiz_results_collection.find_one({
        "quiz_id": obj_id,
        "student_id": student_id
    })
    if existing:
        return jsonify({"message": "Quiz already submitted"}), 403

    data = request.get_json(force=True)
    user_answers = data.get("answers", {})

    if not isinstance(user_answers, dict):
        return jsonify({"message": "Invalid answers format; expected a dictionary"}), 400

    quiz = quizzes_collection.find_one({"_id": obj_id})
    if not quiz:
        return jsonify({"message": "Quiz not found"}), 404

    try:
        results = evaluate_quiz(quiz, user_answers)
        total_questions = len(results)
        correct_answers = sum(1 for r in results if r.get("is_correct"))
        score_percentage = (correct_answers / total_questions) * 100 if total_questions > 0 else 0

        quiz_results_collection.insert_one({
            "quiz_id": obj_id,
            "student_id": student_id,
            "score": correct_answers,
            "total_questions": total_questions,
            "percentage": score_percentage,
            "submitted_at": datetime.utcnow(),
            "details": results
        })

        return jsonify({
            "results": results,
            "score": correct_answers,
            "total": total_questions,
            "percentage": score_percentage
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"message": str(e)}), 500

# ---------------- QUIZ EVALUATION ----------------
def evaluate_quiz(quiz, user_answers):
    results = []
    questions = quiz.get("questions", [])
    for idx, q in enumerate(questions):
        q_id = str(idx)
        correct_answer = q.get("answer")
        student_answer = user_answers.get(q_id)
        results.append({
            "question_id": q_id,
            "question_text": q.get("question"),
            "student_answer": student_answer,
            "correct_answer": correct_answer,
            "is_correct": student_answer == correct_answer
        })
    return results
