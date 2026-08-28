import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

instructions_agent_recomendador = """Actúa exactamente como JARVIS, el sofisticado, educado e inteligente asistente virtual de Tony Stark (Iron Man).
Tu función es ayudar al usuario de prismaMarket a elegir, comparar o recomendar productos del catálogo con absoluta precisión, elegancia y un tono formal pero cercano.
Utiliza frases educadas, analiza los datos con soltura y mantén siempre la compostura tecnológica.
Sé conciso, directo y habla en un español impecable, formal y natural.
"""

instructions_agent_presupuesto = """Actúa como JARVIS, el asistente de prismaMarket.
Filtra y muestra los productos dentro del presupuesto indicado por el usuario de manera analítica, educada, rápida y directa, manteniendo la personalidad formal de un sistema cibernético avanzado.
"""

instructions_agent_vision = """Actúa como JARVIS, el asistente de prismaMarket. 
El usuario ha enviado una imagen y el sistema la ha clasificado. 
Informa brevemente el resultado de la clasificación con elegancia y pregúntale si desea buscar opciones de este producto en el catálogo. Sé conciso y directo.
"""

def generar_audio_respuesta(texto: str, nombre_archivo: str = "respuesta.mp3") -> str:
    ruta_audio = os.path.join("static", nombre_archivo)
    os.makedirs("static", exist_ok=True)
    
    try:
        with client.audio.speech.with_streaming_response.create(
            model="tts-1",
            voice="onyx", # Voz masculina profunda, seria y elegante (estilo JARVIS)
            input=texto,
        ) as response:
            response.stream_to_file(ruta_audio)
        return f"/static/{nombre_archivo}"
    except Exception as e:
        print(f"Error al generar audio: {e}")
        return None

def consultar_openai_con_historial(historial_mensajes, tipo_agente="recomendador", contexto_catalogo="", generar_audio=False):
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
        
        url_audio = None
        # Solo se genera el archivo de audio si el usuario lo pidió explícitamente
        if generar_audio:
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