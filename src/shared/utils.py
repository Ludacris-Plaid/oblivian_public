"""
Utility Functions
"""

import json
import redis
from datetime import datetime

def get_redis():
    """Get Redis connection"""
    return redis.Redis(host="localhost", port=6379, db=0)

def format_timestamp(dt):
    """Format datetime for display"""
    return dt.isoformat() if dt else None
