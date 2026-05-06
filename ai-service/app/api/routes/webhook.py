"""
Webhook principal para recibir mensajes de WhatsApp y procesar órdenes.
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Response
from app.models.schemas import IncomingMessage, WebhookResponse
from app.core.llm_processor import procesar_con_ia
from app.core.database import inyectar_orden_en_supabase
from app.core.order_calculator import validar_orden, calcular_metricas_financieras_orden
from app.core.session_manager import obtener_o_crear_sesion
from app.core.whatsapp_client import enviar_mensaje_whatsapp
from app.utils.logger import get_logger
from app.config import WHATSAPP_VERIFY_TOKEN

router = APIRouter()
logger = get_logger()

@router.get("/webhook/cheesy-pos", tags=["Webhook"])
async def verificar_webhook(request: Request):
    """
    Endpoint para que Meta verifique el webhook al configurarlo en el panel de WhatsApp Business.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe" and token == WHATSAPP_VERIFY_TOKEN:
            logger.info("✅ Webhook verificado correctamente por Meta.")
            return Response(content=challenge, media_type="text/plain")
        else:
            logger.warning("❌ Falló la verificación del webhook (token incorrecto).")
            raise HTTPException(status_code=403, detail="Token de verificación inválido")
            
    raise HTTPException(status_code=400, detail="Faltan parámetros de verificación")

@router.post("/webhook/cheesy-pos", tags=["Webhook"])
async def recibir_pedido(
    request: Request,
    background_tasks: BackgroundTasks
) -> WebhookResponse:
    """
    Endpoint principal del webhook.
    
    Flujo:
    1. Recibe mensaje de WhatsApp
    2. Obtiene/crea sesión del cliente
    3. Pasa el mensaje por el LLM
    4. Valida la orden
    5. Si COMPLETO -> inyecta en Supabase
    6. Responde al cliente (async en background)
    """
    try:
        data = await request.json()
        
        # Parseo de estructura de Meta Webhook
        if "object" in data and data["object"] == "whatsapp_business_account":
            entry = data.get("entry", [{}])[0]
            changes = entry.get("changes", [{}])[0]
            value = changes.get("value", {})
            messages = value.get("messages", [])
            
            if not messages:
                # Evento sin mensajes (ej. status update de entregado/leido)
                return WebhookResponse(status="success", accion="ignorado", numero="", mensaje_para_enviar="", datos_pos={})
                
            msg = messages[0]
            if msg.get("type") != "text":
                return WebhookResponse(status="success", accion="ignorado_no_texto", numero="", mensaje_para_enviar="", datos_pos={})
                
            numero_telefono = msg.get("from")
            mensaje_cliente = msg.get("text", {}).get("body", "")
            
            payload = IncomingMessage(
                mensaje_cliente=mensaje_cliente,
                numero_telefono=numero_telefono
            )
        else:
            # Fallback para testing con la estructura plana
            payload = IncomingMessage(**data)

    except Exception as e:
        logger.error(f"❌ Error parseando JSON del webhook: {e}")
        raise HTTPException(status_code=400, detail="Estructura de JSON no válida")

    logger.info(f"📨 Webhook recibido de {payload.numero_telefono}: {payload.mensaje_cliente[:50]}...")
    
    try:
        # 1. Obtener sesión
        sesion = obtener_o_crear_sesion(payload.numero_telefono)
        sesion.agregar_mensaje("user", payload.mensaje_cliente)
        
        # 2. Procesar con LLM
        orden = await procesar_con_ia(
            payload.mensaje_cliente,
            historial_chat=sesion.obtener_historial()
        )
        
        # 3. Validar orden
        es_valida, mensaje_validacion = validar_orden(orden.items)
        if not es_valida:
            logger.warning(f"⚠️ Orden inválida: {mensaje_validacion}")
            orden.estado_pedido = "EN_PROCESO"
            orden.respuesta_bot = f"Parece que hay un problema: {mensaje_validacion}. Intenta de nuevo."
        
        # 3.5 Calcular métricas financieras (total_order, total_cogs)
        metricas = calcular_metricas_financieras_orden(orden.items)
        orden.total_order = metricas["total_order"]
        orden.total_cogs = metricas["total_cogs"]
        logger.info(f"💰 Orden - Venta: ${orden.total_order:.2f}, COGS: ${orden.total_cogs:.2f}, Margen: ${metricas['ganancia_bruta']:.2f}")
        
        # Agregar respuesta al historial
        sesion.agregar_mensaje("assistant", orden.respuesta_bot)
        order_id = None
        
        # 4. Si COMPLETO, inyectar en Supabase
        if orden.estado_pedido == "COMPLETO":
            order_id = inyectar_orden_en_supabase(orden, payload.numero_telefono)
            if order_id:
                logger.info(f"✅ Orden {order_id} inyectada en Supabase")
                sesion.limpiar()  # Limpia la sesión tras completar
            else:
                logger.error("❌ Error inyectando orden en Supabase")
        
        # 5. Disparar envío de mensaje (background task)
        background_tasks.add_task(
            enviar_mensaje_whatsapp,
            payload.numero_telefono,
            orden.respuesta_bot
        )
        
        return WebhookResponse(
            status="success",
            accion="enviar_whatsapp",
            numero=payload.numero_telefono,
            mensaje_para_enviar=orden.respuesta_bot,
            datos_pos=orden.dict(),
            order_id=order_id
        )
    
    except Exception as e:
        logger.error(f"❌ Error procesando webhook: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")
