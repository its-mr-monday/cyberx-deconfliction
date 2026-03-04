from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from database.models import DeconflictionTicket, InviteToken, Role, User, db
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


@admin_bp.route('/invites', methods=['POST'])
@jwt_required()
@role_required(Role.WHITE)
def create_invite():
    data = request.get_json()
    role_str = data.get('role', '').strip().lower()

    try:
        role = Role(role_str)
    except ValueError:
        return jsonify(error='Invalid role. Must be red, blue, or white'), 400

    invite = InviteToken(
        role=role,
        created_by_id=int(get_jwt_identity()),
    )
    db.session.add(invite)
    db.session.commit()

    return jsonify(
        id=invite.id,
        token=invite.token,
        role=invite.role.value,
        url=f'/register/{invite.token}',
        created_at=invite.created_at.isoformat() if invite.created_at else None,
    ), 201


@admin_bp.route('/invites', methods=['GET'])
@jwt_required()
@role_required(Role.WHITE)
def list_invites():
    invites = InviteToken.query.order_by(InviteToken.created_at.desc()).all()
    return jsonify([
        {
            'id': i.id,
            'token': i.token,
            'role': i.role.value,
            'created_by': i.created_by.name if i.created_by else None,
            'used_by': i.used_by.name if i.used_by else None,
            'used_at': i.used_at.isoformat() if i.used_at else None,
            'created_at': i.created_at.isoformat() if i.created_at else None,
        }
        for i in invites
    ])


@admin_bp.route('/invites/<int:invite_id>', methods=['DELETE'])
@jwt_required()
@role_required(Role.WHITE)
def revoke_invite(invite_id):
    invite = InviteToken.query.get_or_404(invite_id)
    if invite.used_by_id is not None:
        return jsonify(error='Cannot revoke an already-used invite'), 400
    db.session.delete(invite)
    db.session.commit()
    return jsonify(message='Invite revoked'), 200


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
