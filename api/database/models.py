import uuid

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
import enum

db = SQLAlchemy()


class Role(enum.Enum):
    RED = 'red'
    BLUE = 'blue'
    WHITE = 'white'


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum(Role), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())


class InviteToken(db.Model):
    __tablename__ = 'invite_tokens'

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(64), unique=True, nullable=False, default=lambda: uuid.uuid4().hex)
    role = db.Column(db.Enum(Role), nullable=False)
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_by = db.relationship('User', foreign_keys=[created_by_id])
    used_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    used_by = db.relationship('User', foreign_keys=[used_by_id])
    used_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())


class DeconflictionTicket(db.Model):
    __tablename__ = 'deconfliction_tickets'

    id = db.Column(db.Integer, primary_key=True)
    case_number = db.Column(db.String(20), unique=True, nullable=False)

    # Submitted by (Blue Team)
    submitted_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    submitted_by = db.relationship('User', foreign_keys=[submitted_by_id], backref='tickets')

    # Incident details
    incident_datetime = db.Column(db.DateTime(timezone=True), nullable=False)
    description = db.Column(db.Text, nullable=False)
    source_ips = db.Column(db.Text, nullable=False)
    affected_hosts = db.Column(db.Text, nullable=False)
    actions_taken = db.Column(db.Text, nullable=False)

    # Red Team review
    is_hit = db.Column(db.Boolean, nullable=True)
    red_team_comment = db.Column(db.Text, nullable=True)
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewed_by = db.relationship('User', foreign_keys=[reviewed_by_id])
    reviewed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DinoScore(db.Model):
    __tablename__ = 'dino_scores'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', foreign_keys=[user_id])
    nickname = db.Column(db.String(16), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
