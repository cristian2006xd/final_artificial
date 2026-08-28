import io
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
import keras
from keras.applications import EfficientNetB0
from PIL import Image

WEIGHTS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'pesos', 'model.h5')

class_names = [
    '0: acordeón', '1: aviones', '2: ancla', '3: hormiga', '4: fondo_google',
    '5: barril', '6: bajo', '7: castor', '8: binoculares', '9: bonsái', '10: cerebro',
    '11: brontosaurio', '12: buda', '13: mariposa', '14: cámara', '15: cañón',
    '16: auto_lateral', '17: ventilador_techo', '18: teléfono_celular', '19: silla', '20: candelabro',
    '21: cuerpo_puma', '22: cara_puma', '23: cangrejo', '24: langostino', '25: cocodrilo',
    '26: cabeza_cocodrilo', '27: taza', '28: dálmata', '29: billete_dólar', '30: delfín',
    '31: libélula', '32: guitarra_eléctrica', '33: elefante', '34: emú', '35: eufonio',
    '36: cántaro', '37: rostros', '38: rostros_fáciles', '39: ferry', '40: flamenco',
    '41: cabeza_flamenco', '42: garfield', '43: gerenuk', '44: gramófono', '45: piano_de_cola',
    '46: tortuga_carey', '47: audífonos', '48: erizo', '49: helicóptero', '50: ibis',
    '51: patín_en_línea', '52: árbol_joshua', '53: canguro', '54: ketch', '55: lámpara',
    '56: laptop', '57: leopardos', '58: llama', '59: langosta', '60: loto',
    '61: mandolina', '62: efímera', '63: menorá', '64: metrónomo', '65: minarete',
    '66: motocicletas', '67: nautilo', '68: pulpo', '69: okapi', '70: pagoda',
    '71: panda', '72: paloma', '73: pizza', '74: ornitorrinco', '75: pirámide',
    '76: revólver', '77: rinoceronte', '78: gallo', '79: saxofón', '80: goleta',
    '81: tijeras', '82: escorpión', '83: caballito_de_mar', '84: snoopy', '85: balón_fútbol',
    '86: grapadora', '87: estrella_de_mar', '88: estegosaurio', '89: señal_alto', '90: fresa',
    '91: girasol', '92: garrapata', '93: trilobites', '94: paraguas', '95: reloj',
    '96: nenúfar', '97: silla_de_ruedas', '98: gato_montés', '99: silla_windsor',
    '100: llave_inglesa', '101: yin_yang'
]

IMG_SIZE = 224

def build_model(num_classes=102):
    inputs = layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    model = EfficientNetB0(include_top=False, input_tensor=inputs, weights="imagenet")
    model.trainable = False

    x = layers.GlobalAveragePooling2D(name="avg_pool")(model.output)
    x = layers.BatchNormalization()(x)
    x = layers.Dropout(0.2, name="top_dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="pred")(x)

    model = keras.Model(inputs, outputs, name="EfficientNet")
    model.compile(optimizer=keras.optimizers.Adam(learning_rate=1e-2), loss="categorical_crossentropy", metrics=["accuracy"])
    return model

def start_model():
    model = build_model(num_classes=len(class_names))
    model.load_weights(WEIGHTS_PATH)
    return model

global_model = start_model()

def predecir_imagen(file_stream):
    sample = Image.open(io.BytesIO(file_stream.read())).convert('RGB')
    size = (IMG_SIZE, IMG_SIZE)
    sample_resized = tf.image.resize(sample, size)
    sample_expanded = tf.expand_dims(sample_resized, 0)

    prediction = global_model.predict(sample_expanded)
    top_idx = np.argsort(prediction)[0][-1]
    top_class = class_names[top_idx]
    confidence = float(np.max(prediction[0])) * 100

    return top_class, confidence