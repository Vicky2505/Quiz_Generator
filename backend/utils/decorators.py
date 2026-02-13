from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

def staff_required(fn):
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "staff":
            return jsonify({"msg": "Access denied: Staff only"}), 403
        request.jwt_identity = get_jwt_identity()  # user id string
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

def student_required(fn):
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "student":
            return jsonify({"msg": "Access denied: Students only"}), 403
        request.jwt_identity = get_jwt_identity()  # user id string
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper
