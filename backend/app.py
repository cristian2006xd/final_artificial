from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from utils.prediction import predecir_imagen

app = Flask(__name__)
CORS(app)  # permite que el frontend Angular (otro origen/puerto) llame a esta API

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No se envió ninguna imagen.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No se seleccionó ningún archivo.'}), 400

    try:
        clase, confianza = predecir_imagen(file)
        # class_names viene como "0: accordion" — se limpia el índice para
        # poder usar el nombre directo como categoría del catálogo.
        nombre_clase = clase.split(': ', 1)[-1]

        return jsonify({
            'clase': nombre_clase,
            'confianza': f"{confianza:.2f}%"
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)