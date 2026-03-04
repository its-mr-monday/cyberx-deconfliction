from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt


def role_required(*roles):
    """Decorator that restricts access to users with specific roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get('role')
            allowed = [r.value if hasattr(r, 'value') else r for r in roles]
            if user_role not in allowed:
                return jsonify(error='Insufficient permissions'), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
