from datetime import datetime, time, timezone

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from database.models import DeconflictionTicket, Role, User, db
from middleware.auth import role_required

tickets_bp = Blueprint('tickets', __name__)


def _generate_case_number():
    year = datetime.now(timezone.utc).year
    prefix = f'CX-{year}-'
    last = (
        DeconflictionTicket.query
        .filter(DeconflictionTicket.case_number.like(f'{prefix}%'))
        .order_by(DeconflictionTicket.case_number.desc())
        .first()
    )
    seq = int(last.case_number.split('-')[-1]) + 1 if last else 1
    return f'{prefix}{seq:04d}'


def ticket_to_dict(ticket, hide_review=False):
    data = {
        'id': ticket.id,
        'case_number': ticket.case_number,
        'submitted_by': {
            'id': ticket.submitted_by.id,
            'name': ticket.submitted_by.name,
        },
        'incident_datetime': ticket.incident_datetime.isoformat(),
        'description': ticket.description,
        'source_ips': [ip.strip() for ip in ticket.source_ips.split(',') if ip.strip()],
        'affected_hosts': [h.strip() for h in ticket.affected_hosts.split(',') if h.strip()],
        'actions_taken': ticket.actions_taken,
        'created_at': ticket.created_at.isoformat(),
        'updated_at': ticket.updated_at.isoformat() if ticket.updated_at else None,
    }

    if not hide_review:
        data['is_hit'] = ticket.is_hit
        data['red_team_comment'] = ticket.red_team_comment
        data['reviewed_by'] = {
            'id': ticket.reviewed_by.id,
            'name': ticket.reviewed_by.name,
        } if ticket.reviewed_by else None
        data['reviewed_at'] = ticket.reviewed_at.isoformat() if ticket.reviewed_at else None

    return data


@tickets_bp.route('', methods=['POST'])
@jwt_required()
@role_required(Role.BLUE)
def create_ticket():
    data = request.get_json()

    required = ['incident_datetime', 'description', 'source_ips', 'affected_hosts', 'actions_taken']
    for field in required:
        if not data.get(field):
            return jsonify(error=f'{field} is required'), 400

    try:
        incident_dt = datetime.fromisoformat(data['incident_datetime'].replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        return jsonify(error='Invalid datetime format'), 400

    source_ips = data['source_ips']
    if isinstance(source_ips, list):
        source_ips = ', '.join(source_ips)

    affected_hosts = data['affected_hosts']
    if isinstance(affected_hosts, list):
        affected_hosts = ', '.join(affected_hosts)

    user_id = get_jwt_identity()
    ticket = DeconflictionTicket(
        case_number=_generate_case_number(),
        submitted_by_id=int(user_id),
        incident_datetime=incident_dt,
        description=data['description'].strip(),
        source_ips=source_ips,
        affected_hosts=affected_hosts,
        actions_taken=data['actions_taken'].strip(),
    )
    db.session.add(ticket)
    db.session.commit()

    return jsonify(ticket_to_dict(ticket, hide_review=True)), 201


@tickets_bp.route('', methods=['GET'])
@jwt_required()
@role_required(Role.RED, Role.WHITE)
def list_tickets():
    date_str = request.args.get('date')

    query = DeconflictionTicket.query.order_by(DeconflictionTicket.created_at.desc())

    if date_str:
        try:
            filter_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            start = datetime.combine(filter_date, time.min, tzinfo=timezone.utc)
            end = datetime.combine(filter_date, time.max, tzinfo=timezone.utc)
            query = query.filter(DeconflictionTicket.created_at.between(start, end))
        except ValueError:
            return jsonify(error='Invalid date format. Use YYYY-MM-DD'), 400

    tickets = query.all()
    return jsonify([ticket_to_dict(t) for t in tickets])


@tickets_bp.route('/today', methods=['GET'])
@jwt_required()
@role_required(Role.RED, Role.WHITE)
def today_tickets():
    today = datetime.now(timezone.utc).date()
    start = datetime.combine(today, time.min, tzinfo=timezone.utc)
    end = datetime.combine(today, time.max, tzinfo=timezone.utc)

    tickets = (
        DeconflictionTicket.query
        .filter(DeconflictionTicket.created_at.between(start, end))
        .order_by(DeconflictionTicket.created_at.desc())
        .all()
    )
    return jsonify([ticket_to_dict(t) for t in tickets])


@tickets_bp.route('/my', methods=['GET'])
@jwt_required()
@role_required(Role.BLUE)
def my_tickets():
    user_id = get_jwt_identity()
    tickets = (
        DeconflictionTicket.query
        .filter_by(submitted_by_id=int(user_id))
        .order_by(DeconflictionTicket.created_at.desc())
        .all()
    )
    return jsonify([ticket_to_dict(t, hide_review=True) for t in tickets])


@tickets_bp.route('/<int:ticket_id>', methods=['GET'])
@jwt_required()
def get_ticket(ticket_id):
    ticket = DeconflictionTicket.query.get_or_404(ticket_id)

    claims = get_jwt()
    user_id = get_jwt_identity()
    role = claims.get('role')

    if role == Role.BLUE.value and ticket.submitted_by_id != int(user_id):
        return jsonify(error='Access denied'), 403

    hide_review = role == Role.BLUE.value
    return jsonify(ticket_to_dict(ticket, hide_review=hide_review))


@tickets_bp.route('/<int:ticket_id>/review', methods=['PATCH'])
@jwt_required()
@role_required(Role.RED)
def review_ticket(ticket_id):
    ticket = DeconflictionTicket.query.get_or_404(ticket_id)
    data = request.get_json()

    if 'is_hit' not in data:
        return jsonify(error='is_hit is required'), 400

    ticket.is_hit = bool(data['is_hit'])
    ticket.red_team_comment = data.get('comment', '').strip() or None
    ticket.reviewed_by_id = int(get_jwt_identity())
    ticket.reviewed_at = datetime.now(timezone.utc)

    db.session.commit()
    return jsonify(ticket_to_dict(ticket))
