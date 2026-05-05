"""
Session Manager: Mantiene el contexto de conversaciones para upselling y contexto del LLM.
Útil para responder "Sí, porfa" cuando el bot preguntó por una bebida.
"""
from typing import Optional, List, Dict
from datetime import datetime, timedelta

# En-memory storage (para MVP). En producción, usar Redis o una tabla en Supabase.
_chat_sessions: Dict[str, Dict] = {}

SESSION_TIMEOUT = timedelta(minutes=30)  # Las sesiones expiran después de 30 min

class ChatSession:
    """Representa una sesión de chat con un cliente."""
    
    def __init__(self, numero_telefono: str):
        self.numero_telefono = numero_telefono
        self.mensajes: List[Dict] = []  # Historial de [{"role": "user/assistant", "content": "..."}]
        self.created_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.orden_temporal = None  # Objeto OrdenExtraida en progreso
    
    def agregar_mensaje(self, role: str, content: str):
        """Agrega un mensaje al historial."""
        self.mensajes.append({"role": role, "content": content})
        self.last_activity = datetime.utcnow()
    
    def obtener_historial(self) -> List[Dict]:
        """Retorna el historial para pasarlo al LLM."""
        return self.mensajes
    
    def esta_expirada(self) -> bool:
        """Verifica si la sesión ha expirado."""
        return datetime.utcnow() - self.last_activity > SESSION_TIMEOUT
    
    def limpiar(self):
        """Limpia la sesión después de completar una orden."""
        self.mensajes.clear()
        self.orden_temporal = None

def obtener_o_crear_sesion(numero_telefono: str) -> ChatSession:
    """Obtiene una sesión existente o crea una nueva."""
    if numero_telefono not in _chat_sessions:
        _chat_sessions[numero_telefono] = ChatSession(numero_telefono)
    else:
        sesion = _chat_sessions[numero_telefono]
        if sesion.esta_expirada():
            sesion.limpiar()
    
    return _chat_sessions[numero_telefono]

def limpiar_sesion(numero_telefono: str):
    """Elimina una sesión."""
    if numero_telefono in _chat_sessions:
        del _chat_sessions[numero_telefono]

def obtener_contexto_para_llm(numero_telefono: str) -> List[Dict]:
    """Retorna el historial de la sesión para pasarlo al LLM con system prompt."""
    sesion = obtener_o_crear_sesion(numero_telefono)
    return sesion.obtener_historial()
