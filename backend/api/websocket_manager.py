"""
Shared WebSocket connection manager.
Defined separately to avoid circular imports between api.main and agents.alert_agent.
"""
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, WebSocket] = {}   # user_id → websocket

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws
        logger.info(f"WebSocket connected: {user_id}")

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)
        logger.info(f"WebSocket disconnected: {user_id}")

    async def send_alert(self, user_id: str, data: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception as e:
                logger.warning(f"WebSocket send failed ({user_id}): {e}")
                self.disconnect(user_id)


# Singleton instance — import this everywhere
ws_manager = ConnectionManager()
