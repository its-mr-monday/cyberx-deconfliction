from datetime import datetime, timezone

import bcrypt
from flask import Blueprint, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    get_jwt_identity,
    jwt_required,
)

from database.models import InviteToken, Role, User, db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/invite/<token>', methods=['GET'])
def validate_invite(token):
    invite = InviteToken.query.filter_by(token=token).first()
    if not invite or invite.used_by_id is not None:
        return jsonify(error='Invalid or expired invite'), 404
    return jsonify(valid=True, role=invite.role.value)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    invite_token = data.get('invite_token', '').strip()

    if not all([name, email, password, invite_token]):
        return jsonify(error='All fields are required'), 400

    invite = InviteToken.query.filter_by(token=invite_token).first()
    if not invite or invite.used_by_id is not None:
        return jsonify(error='Invalid or expired invite'), 400

    if User.query.filter_by(email=email).first():
        return jsonify(error='Email already registered'), 409

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    user = User(name=name, email=email, password_hash=password_hash, role=invite.role)
    db.session.add(user)
    db.session.flush()

    invite.used_by_id = user.id
    invite.used_at = datetime.now(timezone.utc)
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
