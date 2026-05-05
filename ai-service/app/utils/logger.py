"""
Logger centralizado con niveles configurables.
"""
import logging
from app.config import LOG_LEVEL

logger = logging.getLogger("cheesy_pos")
logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

handler = logging.StreamHandler()
formatter = logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
handler.setFormatter(formatter)
logger.addHandler(handler)

def get_logger():
    """Retorna el logger centralizado."""
    return logger
