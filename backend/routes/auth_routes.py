from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from database.mongo import users_collection
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta

auth_bp = Blueprint("auth", __name__)

# Registration Route
@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json(force=True)
        username = data.get("username", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        role = data.get("role", "user").strip()

        if not username or not email or not password:
            return jsonify({"msg": "All fields are required"}), 400

        if users_collection.find_one({"email": email}):
            return jsonify({"msg": "Email already exists"}), 400

        hashed_password = generate_password_hash(password)
        users_collection.insert_one({
            "username": username,
            "email": email,
            "password": hashed_password,
            "role": role
        })

        return jsonify({"msg": "User registered successfully"}), 201
    except Exception as e:
        return jsonify({"msg": "Error during registration", "error": str(e)}), 500


# Login Route
@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json(force=True)
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({"msg": "Email and password required"}), 400

        user = users_collection.find_one({"email": email})
        if not user:
            return jsonify({"msg": "User not found"}), 404

        if not check_password_hash(user["password"], password):
            return jsonify({"msg": "Invalid credentials"}), 401

        identity_data = {
            "id": str(user["_id"]),
            "role": user.get("role", "user")
        }

        access_token = create_access_token(
            identity=str(user["_id"]),              # identity must be a string
            additional_claims={"role": user.get("role", "user")},
            expires_delta=timedelta(hours=1)
        )

        if not access_token or access_token.count(".") != 2:
            return jsonify({"msg": "Token generation failed"}), 500

        return jsonify({
            "msg": "Login successful",
            "access_token": access_token,
            "role": user.get("role", "user")
        }), 200

    except Exception as e:
        return jsonify({"msg": "Error during login", "error": str(e)}), 500
