"""
Validadores custom para datos de entrada.
"""
from app.core.menu_definitions import obtener_precio_producto
from app.utils.exceptions import ProductoNoExisteException

def validar_producto_existe(nombre_producto: str) -> bool:
    """Verifica que el producto exista en el menú."""
    try:
        obtener_precio_producto(nombre_producto)
        return True
    except ValueError:
        raise ProductoNoExisteException(
            f"El producto '{nombre_producto}' no existe en el menú del Cheesy."
        )

def validar_numero_telefonico(numero: str) -> bool:
    """Valida que el número de WhatsApp tenga un formato válido."""
    # Debe tener solo dígitos y entre 10 y 15 caracteres
    if not numero.isdigit() or len(numero) < 10 or len(numero) > 15:
        return False
    return True
