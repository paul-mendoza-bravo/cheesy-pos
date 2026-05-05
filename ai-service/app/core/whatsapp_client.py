"""
WhatsApp Client: Dispara mensajes de respuesta hacia los servidores de Meta.
"""
import httpx
from app.config import (
    WHATSAPP_API_URL,
    WHATSAPP_BUSINESS_ACCOUNT_ID,
    WHATSAPP_ACCESS_TOKEN,
    WHATSAPP_PHONE_NUMBER_ID
)

async def enviar_mensaje_whatsapp(
    numero_destino: str,
    mensaje: str
) -> bool:
    """
    Envía un mensaje de respuesta al cliente vía WhatsApp API de Meta.
    
    Args:
        numero_destino: Número de teléfono del cliente (con código de país, ej: 5255XXXXXXXX)
        mensaje: Texto del mensaje a enviar
    
    Returns:
        True si se envió exitosamente, False en caso de error
    """
    try:
        url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        
        payload = {
            "messaging_product": "whatsapp",
            "to": numero_destino,
            "type": "text",
            "text": {
                "body": mensaje
            }
        }
        
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code in [200, 201]:
                print(f"✅ Mensaje enviado a {numero_destino}")
                return True
            else:
                print(f"❌ Error enviando mensaje: {response.status_code} - {response.text}")
                return False
    
    except Exception as e:
        print(f"❌ Excepción enviando mensaje WhatsApp: {e}")
        return False
