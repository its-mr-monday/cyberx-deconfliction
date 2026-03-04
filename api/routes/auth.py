import bcrypt
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)

from database.models import Role, User, db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role_str = data.get('role', '').strip().lower()

    if not all([name, email, password, role_str]):
        return jsonify(error='All fields are required'), 400

    try:
        role = Role(role_str)
    except ValueError:
        return jsonify(error='Invalid role. Must be red, blue, or white'), 400

    if User.query.filter_by(email=email).first():
        return jsonify(error='Email already registered'), 409

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    user = User(name=name, email=email, password_hash=password_hash, role=role)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role.value, 'name': user.name},
    )

    return jsonify(
        token=token,
        user={'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role.value},
    ), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify(error='Email and password are required'), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return jsonify(error='Invalid email or password'), 401

    token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role.value, 'name': user.name},
    )

    return jsonify(
        token=token,
        user={'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role.value},
    )


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user:
        return jsonify(error='User not found'), 404

    return jsonify(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
    )
