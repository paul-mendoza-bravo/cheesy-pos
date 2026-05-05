"""
Definición estricta del catálogo de productos y precios del Cheesy.
Esta es la "fuente de verdad" para evitar alucinaciones del LLM.
"""

MENU = {
    "hamburguesas": {
        "Clásica": {
            "precio_venta": 75,
            "cogs": 47.19,
            "descripcion": "Pan, carne, lechuga, tomate, cebolla"
        },
        "BBQ": {
            "precio_venta": 85,
            "cogs": 57.19,
            "descripcion": "Pan, carne, salsa BBQ, cebolla"
        },
        "Hawaiana": {
            "precio_venta": 85,
            "cogs": 55.19,
            "descripcion": "Pan, carne, piña, jamón"
        },
        "Mexa": {
            "precio_venta": 90,
            "cogs": 55.32,
            "descripcion": "Pan, carne, jalapeños, cebolla"
        },
    },
    "modificadores": {
        "doble_carne": {
            "precio_extra": 30,
            "cogs_extra": 18.00,
            "aplicable_a": "hamburguesas"
        },
    },
    "complementos": {
        "Papas Sencillas": {
            "precio_venta": 40,
            "cogs": 20.00,
            "descripcion": "Papas fritas simples"
        },
        "Papas Especiales": {
            "precio_venta": 60,
            "cogs": 40.00,
            "descripcion": "Papas con toppings"
        },
    },
    "bebidas": {
        "Agua de Jamaica": {
            "precio_venta": 20,
            "cogs": 0.0,
            "descripcion": "Agua de Jamaica fría"
        },
        "Agua de Horchata": {
            "precio_venta": 20,
            "cogs": 0.0,
            "descripcion": "Agua de Horchata fría"
        },
    },
}

def obtener_precio_producto(nombre_producto: str, es_doble: bool = False) -> float:
    """
    Retorna el precio de venta exacto de un producto.
    Si es_doble=True y es una hamburguesa, suma el modificador.
    """
    # Buscar en hamburguesas
    if nombre_producto in MENU["hamburguesas"]:
        precio = MENU["hamburguesas"][nombre_producto]["precio_venta"]
        if es_doble:
            precio += MENU["modificadores"]["doble_carne"]["precio_extra"]
        return precio
    
    # Buscar en complementos
    if nombre_producto in MENU["complementos"]:
        return MENU["complementos"][nombre_producto]["precio_venta"]
    
    # Buscar en bebidas
    if nombre_producto in MENU["bebidas"]:
        return MENU["bebidas"][nombre_producto]["precio_venta"]
    
    raise ValueError(f"Producto '{nombre_producto}' no existe en el menú.")

def obtener_cogs_producto(nombre_producto: str, es_doble: bool = False) -> float:
    """
    Retorna el costo de ingredientes (COGS) exacto de un producto.
    Si es_doble=True y es una hamburguesa, suma el costo extra de carne.
    """
    # Buscar en hamburguesas
    if nombre_producto in MENU["hamburguesas"]:
        cogs = MENU["hamburguesas"][nombre_producto]["cogs"]
        if es_doble:
            cogs += MENU["modificadores"]["doble_carne"]["cogs_extra"]
        return cogs
    
    # Buscar en complementos
    if nombre_producto in MENU["complementos"]:
        return MENU["complementos"][nombre_producto]["cogs"]
    
    # Buscar en bebidas
    if nombre_producto in MENU["bebidas"]:
        return MENU["bebidas"][nombre_producto]["cogs"]
    
    raise ValueError(f"Producto '{nombre_producto}' no existe en el menú.")

def listar_productos_disponibles() -> dict:
    """Retorna todo el menú disponible para el LLM."""
    return MENU
