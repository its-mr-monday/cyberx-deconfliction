from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from database.models import DeconflictionTicket, Role, User, db
from middleware.auth import role_required

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@role_required(Role.WHITE)
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify([
        {
            'id': u.id,
            'name': u.name,
            'email': u.email,
            'role': u.role.value,
            'created_at': u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ])


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@role_required(Role.WHITE)
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify(message='User deleted'), 200


@admin_bp.route('/users/<int:user_id>/role', methods=['PATCH'])
@jwt_required()
@role_required(Role.WHITE)
def update_role(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    role_str = data.get('role', '').strip().lower()
    try:
        user.role = Role(role_str)
    except ValueError:
        return jsonify(error='Invalid role. Must be red, blue, or white'), 400

    db.session.commit()
    return jsonify(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
    )


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
@role_required(Role.WHITE)
def stats():
    total = DeconflictionTicket.query.count()
    hits = DeconflictionTicket.query.filter_by(is_hit=True).count()
    misses = DeconflictionTicket.query.filter_by(is_hit=False).count()
    pending = DeconflictionTicket.query.filter_by(is_hit=None).count()

    return jsonify(
        total=total,
        hits=hits,
        misses=misses,
        pending=pending,
        hit_rate=round(hits / total * 100, 1) if total > 0 else 0,
    )
