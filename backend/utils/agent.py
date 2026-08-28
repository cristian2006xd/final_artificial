import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

instructions_agent_recomendador = """Actúa como un asesor de productos conciso para prismaMarket.
Ayuda al usuario a elegir, comparar o recomendar productos del catálogo basándote en la conversación previa de forma breve y directa.
Si recomiendas opciones, menciona el precio y el motivo principal de forma resumida, evitando textos largos o excesivos.
"""

instructions_agent_presupuesto = """Actúa como un asistente de presupuestos conciso para prismaMarket.
Filtra y muestra los productos dentro del presupuesto indicado por el usuario de manera rápida, directa y sin rodeos.
"""

instructions_agent_vision = """Actúa como un asistente de prismaMarket. 
El usuario ha enviado una imagen y el sistema la ha clasificado. 
Informa brevemente el resultado de la clasificación y pregúntale si desea buscar opciones de este producto en el catálogo. Sé conciso y directo.
"""

def generar_audio_respuesta(texto: str, nombre_archivo: str = "respuesta.mp3") -> str:
    ruta_audio = os.path.join("static", nombre_archivo)
    os.makedirs("static", exist_ok=True)
    
    try:
        with client.audio.speech.with_streaming_response.create(
            model="tts-1",
            voice="shimmer",
            input=texto,
        ) as response:
            response.stream_to_file(ruta_audio)
        return f"/static/{nombre_archivo}"
    except Exception as e:
        print(f"Error al generar audio: {e}")
        return None

def consultar_openai_con_historial(historial_mensajes, tipo_agente="recomendador", contexto_catalogo=""):
    if tipo_agente == "presupuesto":
        system_instructions = instructions_agent_presupuesto
    elif tipo_agente == "vision":
        system_instructions = instructions_agent_vision
    else:
        system_instructions = instructions_agent_recomendador

    sistema_completo = f"{system_instructions}\n\nCatálogo disponible:\n{contexto_catalogo}"
    messages_payload = [{"role": "system", "content": sistema_completo}] + historial_mensajes

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages_payload,
        )
        texto_respuesta = completion.choices[0].message.content
        
        nombre_audio_unico = f"audio_{os.urandom(4).hex()}.mp3"
        url_audio = generar_audio_respuesta(texto_respuesta, nombre_audio_unico)

        return {
            "texto": texto_respuesta,
            "audio_url": url_audio
        }
    except Exception as e:
        return {
            "texto": f"Error al procesar la solicitud en prismaMarket: {str(e)}",
            "audio_url": None
        }