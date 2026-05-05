"""
LLM Processor: Integración con la IA para extraer órdenes estructuradas en JSON.
"""
import httpx
import json
from typing import Optional
from app.models.schemas import OrdenExtraida, ItemPedido
from app.config import LLM_API_KEY
from app.utils.logger import get_logger

logger = get_logger()

async def procesar_con_ia(mensaje: str, historial_chat: Optional[list] = None) -> OrdenExtraida:
    """
    Conecta con el LLM (Claude 3.5 Haiku) para extraer la orden.
    
    Args:
        mensaje: El texto del cliente
        historial_chat: Contexto de mensajes anteriores (para upselling)
    
    Returns:
        OrdenExtraida: Orden validada con Pydantic
    """
    system_prompt = """
    Eres el asistente automatizado de 'Cheeseburguers'. 
    MENÚ: Clásica ($75), BBQ ($85), Hawaiana ($85), Mexa ($90).
    Modificadores: Doble carne (+$30).
    Complementos: Papas Sencillas ($40), Papas Especiales ($60).
    Bebidas: Agua de Jamaica, Agua de Horchata ($20 c/u).
    
    Analiza el mensaje del cliente y devuelve ÚNICAMENTE un JSON válido:
    {
        "estado_pedido": "EN_PROCESO" | "COMPLETO",
        "respuesta_bot": "mensaje amigable",
        "items": [...],
        "direccion": "opcional"
    }
    
    Si falta dirección o bebida, estado_pedido="EN_PROCESO" y haz upselling suave.
    Si tienes todo, estado_pedido="COMPLETO".
    """
    
    # Preparamos los mensajes
    mensajes = [{"role": "system", "content": system_prompt}]
    if historial_chat:
        mensajes.extend(historial_chat)
    else:
        mensajes.append({"role": "user", "content": mensaje})

    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {LLM_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Usamos gpt-4o-mini (más económico y muy capaz para JSON)
        model_name = "gpt-4o-mini" 
        
        payload = {
            "model": model_name,
            "response_format": { "type": "json_object" },
            "messages": mensajes,
            "temperature": 0.2
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            
            respuesta_llm = data["choices"][0]["message"]["content"]
            
            diccionario_orden = extraer_json_del_llm(respuesta_llm)
            return OrdenExtraida(**diccionario_orden)
            
    except Exception as e:
        logger.error(f"Error procesando con LLM: {e}")
        fallback_response = {
            "estado_pedido": "EN_PROCESO",
            "respuesta_bot": "Hubo un pequeño problema al entenderte. ¿Me lo podrías confirmar de nuevo?",
            "items": [],
            "direccion": None
        }
        return OrdenExtraida(**fallback_response)

def extraer_json_del_llm(respuesta_llm: str) -> dict:
    """
    Parsea la respuesta del LLM y extrae el JSON.
    Maneja casos donde el LLM devuelve markdown o texto extra.
    """
    import json
    import re
    
    # Intenta extraer JSON entre ```json ... ```
    match = re.search(r'```json\n(.*?)\n```', respuesta_llm, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    
    # Intenta extraer JSON entre { y }
    match = re.search(r'\{.*\}', respuesta_llm, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    
    raise ValueError("No se pudo extraer JSON de la respuesta del LLM.")
