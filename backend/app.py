import json
import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from utils.prediction import predecir_imagen
from utils.agent import consultar_openai_con_historial

app = Flask(__name__)
CORS(app)

SUPABASE_URL = 'https://tyarvtlkstmgadvnqleu.supabase.co'
SUPABASE_ANON_KEY = 'sb_publishable_MARFHGPg60bechP8jzFy8w_td_tkxHQ'
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def obtener_catalogo_desde_supabase():
    try:
        response = supabase.table("products").select("name, category, price, stock, rating, icon").execute()
        productos = response.data
        
        if not productos:
            return "No hay productos disponibles en el catálogo."
        
        catalogo_texto = "Catálogo de productos de prismaMarket:\n"
        for p in productos:
            catalogo_texto += f"- {p.get('icon', '')} {p.get('name')} (Categoría: {p.get('category')}): ${p.get('price')}, Stock: {p.get('stock')}, Rating: {p.get('rating')}\n"
            
        return catalogo_texto
    except Exception as e:
        print(f"Error al conectar con Supabase: {e}")
        return "Error al cargar el catálogo de la base de datos."

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    texto_usuario = request.form.get('text', '')
    historial_str = request.form.get('historial', '[]')
    usuario_email = request.form.get('usuario_email', 'Invitado')
    
    try:
        historial = json.loads(historial_str)
    except Exception:
        historial = []

    tiene_archivo = 'file' in request.files and request.files['file'].filename != ''
    catalogo_texto = obtener_catalogo_desde_supabase()
    contexto_con_usuario = f"Estás atendiendo al usuario autenticado: {usuario_email}.\n\n{catalogo_texto}"

    try:
        if tiene_archivo:
            file = request.files['file']
            clase, confianza = predecir_imagen(file)
            nombre_clase = clase.split(': ', 1)[-1]

            prompt_vision = (
                f"El usuario {usuario_email} subió una imagen y el sistema determinó que es un(a): '{nombre_clase}' "
                f"(confianza: {confianza:.2f}%). Mensaje opcional: {texto_usuario if texto_usuario else 'Analiza esta imagen'}"
            )
            historial.append({"role": "user", "content": prompt_vision})
            
            resultado_ia = consultar_openai_con_historial(historial, tipo_agente="vision", contexto_catalogo=contexto_con_usuario)
            respuesta_ia = resultado_ia["texto"]
            audio_url = resultado_ia.get("audio_url")
            audio_completo_url = f"http://127.0.0.1:5000{audio_url}" if audio_url else None

            historial.append({"role": "assistant", "content": respuesta_ia})

            return jsonify({
                'clase': nombre_clase,
                'confianza': f"{confianza:.2f}%",
                'respuesta_agente': respuesta_ia,
                'audio_url': audio_completo_url
            })
        
        else:
            if texto_usuario:
                if not historial or historial[-1].get("content") != texto_usuario:
                    historial.append({"role": "user", "content": texto_usuario})

            tipo_agente = "presupuesto" if ("presupuesto" in texto_usuario.lower() or "$" in texto_usuario) else "recomendador"
            
            resultado_ia = consultar_openai_con_historial(historial, tipo_agente=tipo_agente, contexto_catalogo=contexto_con_usuario)
            respuesta_ia = resultado_ia["texto"]
            audio_url = resultado_ia.get("audio_url")
            audio_completo_url = f"http://127.0.0.1:5000{audio_url}" if audio_url else None

            historial.append({"role": "assistant", "content": respuesta_ia})

            return jsonify({
                'respuesta_agente': respuesta_ia,
                'audio_url': audio_completo_url
            })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)