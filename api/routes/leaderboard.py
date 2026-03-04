from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from database.models import DinoScore, db

leaderboard_bp = Blueprint('leaderboard', __name__)


@leaderboard_bp.route('/scores', methods=['POST'])
@jwt_required()
def submit_score():
    data = request.get_json()

    nickname = (data.get('nickname') or '').strip()
    score = data.get('score')

    if not nickname or len(nickname) > 16:
        return jsonify(error='Nickname must be 1-16 characters'), 400

    if score is None or not isinstance(score, int) or score < 0:
        return jsonify(error='Score must be a non-negative integer'), 400

    if score > 99999:
        return jsonify(error='Invalid score'), 400

    user_id = int(get_jwt_identity())

    entry = DinoScore(user_id=user_id, nickname=nickname, score=score)
    db.session.add(entry)
    db.session.commit()

    return jsonify(
        id=entry.id,
        nickname=entry.nickname,
        score=entry.score,
        created_at=entry.created_at.isoformat() if entry.created_at else None,
    ), 201


@leaderboard_bp.route('/scores', methods=['GET'])
@jwt_required()
def get_leaderboard():
    top_scores = (
        DinoScore.query
        .order_by(DinoScore.score.desc())
        .limit(10)
        .all()
    )

    return jsonify([
        {
            'rank': idx + 1,
            'nickname': s.nickname,
            'score': s.score,
            'name': s.user.name if s.user else 'Unknown',
            'created_at': s.created_at.isoformat() if s.created_at else None,
        }
        for idx, s in enumerate(top_scores)
    ])
