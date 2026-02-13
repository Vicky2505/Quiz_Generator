from pymongo import MongoClient
import config

client = MongoClient(config.MONGO_URI)
db = client[config.DB_NAME]

# Collections
users_collection = db["users"]               # users: students and staff (with role field)
courses_collection = db["courses"]           # courses info
quizzes_collection = db["quizzes"]           # quizzes, linked to courses and staff
quiz_results_collection = db["quiz_results"] # ✅ stores quiz scores, answers, evaluation
enrollments_collection = db["enrollments"]   # student-course mapping
submissions_collection = db["submissions"]   # quiz submissions by students
