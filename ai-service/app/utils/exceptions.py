"""
Excepciones custom del microservicio.
"""

class CheeseyException(Exception):
    """Excepción base para todas las excepciones del Cheesy."""
    pass

class OrdenInvalidaException(CheeseyException):
    """La orden no cumple con las reglas de negocio."""
    pass

class ProductoNoExisteException(CheeseyException):
    """El producto no existe en el menú."""
    pass

class ConexionSupabaseException(CheeseyException):
    """Error al conectar con Supabase."""
    pass

class LLMException(CheeseyException):
    """Error en la integración con el LLM."""
    pass
