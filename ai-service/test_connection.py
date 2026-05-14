"""
🧪 Script rápido para verificar que tu conexión a Meta Cloud API funciona.
Ejecutar: python test_connection.py
"""
import httpx
import os
import sys
from dotenv import load_dotenv

load_dotenv()

WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL", "https://graph.facebook.com/v25.0")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_BUSINESS_ACCOUNT_ID = os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", "")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")

def test_whatsapp_token():
    """Verifica que el token de WhatsApp sea válido."""
    print("\n🔑 Test 1: Verificando Access Token de WhatsApp...")
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}"
    headers = {"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"}
    
    try:
        resp = httpx.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            print(f"   ✅ Token VÁLIDO")
            print(f"   📱 Phone Number ID: {data.get('id')}")
            print(f"   📞 Display Number: {data.get('display_phone_number', 'N/A')}")
            print(f"   ✅ Verified Name: {data.get('verified_name', 'N/A')}")
            return True
        else:
            print(f"   ❌ Token INVÁLIDO o expirado (status: {resp.status_code})")
            print(f"   📄 Respuesta: {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error de conexión: {e}")
        return False

def test_business_account():
    """Verifica que el Business Account ID sea correcto."""
    print("\n🏢 Test 2: Verificando Business Account...")
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_BUSINESS_ACCOUNT_ID}"
    headers = {"Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}"}
    
    try:
        resp = httpx.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            print(f"   ✅ Business Account VÁLIDO")
            print(f"   🏢 Account ID: {data.get('id')}")
            print(f"   📛 Name: {data.get('name', 'N/A')}")
            return True
        else:
            print(f"   ❌ Business Account no encontrado (status: {resp.status_code})")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_openai_key():
    """Verifica que la key de OpenAI funcione."""
    print("\n🤖 Test 3: Verificando API Key de OpenAI...")
    try:
        resp = httpx.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {LLM_API_KEY}"},
            timeout=10
        )
        if resp.status_code == 200:
            print(f"   ✅ OpenAI API Key VÁLIDA")
            return True
        else:
            print(f"   ❌ OpenAI Key inválida (status: {resp.status_code})")
            print(f"   📄 {resp.text[:200]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def test_enviar_mensaje_test(numero: str):
    """Envía un mensaje de prueba por WhatsApp."""
    print(f"\n📤 Test 4: Enviando mensaje de prueba a {numero}...")
    url = f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    
    payload = {
        "messaging_product": "whatsapp",
        "to": numero,
        "type": "text",
        "text": {"body": "🍔 ¡Hola! Soy el bot de Cheeseburguers. Este es un mensaje de prueba. ¡Todo funciona correctamente!"}
    }
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        resp = httpx.post(url, json=payload, headers=headers, timeout=10)
        if resp.status_code in [200, 201]:
            data = resp.json()
            msg_id = data.get("messages", [{}])[0].get("id", "N/A")
            print(f"   ✅ Mensaje ENVIADO exitosamente")
            print(f"   📨 Message ID: {msg_id}")
            return True
        else:
            print(f"   ❌ Error enviando mensaje (status: {resp.status_code})")
            print(f"   📄 {resp.text[:300]}")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("🍔 CHEESY POS — Test de Conexión Meta Cloud API")
    print("=" * 60)
    
    # Verificar que las vars existan
    vars_ok = True
    for var_name, var_val in [
        ("WHATSAPP_ACCESS_TOKEN", WHATSAPP_ACCESS_TOKEN),
        ("WHATSAPP_PHONE_NUMBER_ID", WHATSAPP_PHONE_NUMBER_ID),
        ("WHATSAPP_BUSINESS_ACCOUNT_ID", WHATSAPP_BUSINESS_ACCOUNT_ID),
        ("LLM_API_KEY", LLM_API_KEY),
    ]:
        if not var_val:
            print(f"   ⚠️  {var_name} está vacío en .env")
            vars_ok = False
        else:
            print(f"   ✅ {var_name} = {var_val[:15]}...")
    
    if not vars_ok:
        print("\n❌ Faltan variables de entorno. Revisa tu .env")
        sys.exit(1)
    
    # Ejecutar tests
    results = []
    results.append(("WhatsApp Token", test_whatsapp_token()))
    results.append(("Business Account", test_business_account()))
    results.append(("OpenAI Key", test_openai_key()))
    
    # Test 4: Enviar mensaje (opcional)
    if "--send" in sys.argv:
        numero = sys.argv[sys.argv.index("--send") + 1] if len(sys.argv) > sys.argv.index("--send") + 1 else None
        if numero:
            results.append(("Enviar Mensaje", test_enviar_mensaje_test(numero)))
        else:
            print("\n⚠️  Uso: python test_connection.py --send 5215512345678")
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN")
    print("=" * 60)
    all_ok = True
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"   {status}  {name}")
        if not passed:
            all_ok = False
    
    if all_ok:
        print("\n🎉 ¡Todo listo! Tu ai-service puede conectarse a Meta Cloud API.")
        if "--send" not in sys.argv:
            print("   Tip: Ejecuta con --send TU_NUMERO para enviar un mensaje de prueba:")
            print("   python test_connection.py --send 5215512345678")
    else:
        print("\n⚠️  Hay problemas que resolver. Revisa los tests que fallaron.")
    
    print()
