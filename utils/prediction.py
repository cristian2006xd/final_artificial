import io
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers
import keras
from keras.applications import EfficientNetB0
from PIL import Image

class_names = [
    '0: accordion', '1: airplanes', '2: anchor', '3: ant', '4: background_google',
    '5: barrel', '6: bass', '7: beaver', '8: binocular', '9: bonsai', '10: brain',
    '11: brontosaurus', '12: buddha', '13: butterfly', '14: camera', '15: cannon',
    '16: car_side', '17: ceiling_fan', '18: cellphone', '19: chair', '20: chandelier',
    '21: cougar_body', '22: cougar_face', '23: crab', '24: crayfish', '25: crocodile',
    '26: crocodile_head', '27: cup', '28: dalmatian', '29: dollar_bill', '30: dolphin',
    '31: dragonfly', '32: electric_guitar', '33: elephant', '34: emu', '35: euphonium',
    '36: ewer', '37: faces', '38: faces_easy', '39: ferry', '40: flamingo',
    '41: flamingo_head', '42: garfield', '43: gerenuk', '44: gramophone', '45: grand_piano',
    '46: hawksbill', '47: headphone', '48: hedgehog', '49: helicopter', '50: ibis',
    '51: inline_skate', '52: joshua_tree', '53: kangaroo', '54: ketch', '55: lamp',
    '56: laptop', '57: leopards', '58: llama', '59: lobster', '60: lotus',
    '61: mandolin', '62: mayfly', '63: menorah', '64: metronome', '65: minaret',
    '66: motorbikes', '67: nautilus', '68: octopus', '69: okapi', '70: pagoda',
    '71: panda', '72: pigeon', '73: pizza', '74: platypus', '75: pyramid',
    '76: revolver', '77: rhino', '78: rooster', '79: saxophone', '80: schooner',
    '81: scissors', '82: scorpion', '83: sea_horse', '84: snoopy', '85: soccer_ball',
    '86: stapler', '87: starfish', '88: stegosaurus', '89: stop_sign', '90: strawberry',
    '91: sunflower', '92: tick', '93: trilobite', '94: umbrella', '95: watch',
    '96: water_lilly', '97: wheelchair', '98: wild_cat', '99: windsor_chair',
    '100: wrench', '101: yin_yang'
]

IMG_SIZE = 224

def build_model(num_classes=102):
    inputs = layers.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    model = EfficientNetB0(include_top=False, input_tensor=inputs, weights="imagenet")

    model.trainable = False

    x = layers.GlobalAveragePooling2D(name="avg_pool")(model.output)
    x = layers.BatchNormalization()(x)

    top_dropout_rate = 0.2
    x = layers.Dropout(top_dropout_rate, name="top_dropout")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="pred")(x)

    model = keras.Model(inputs, outputs, name="EfficientNet")
    optimizer = keras.optimizers.Adam(learning_rate=1e-2)
    model.compile(
        optimizer=optimizer, loss="categorical_crossentropy", metrics=["accuracy"]
    )
    return model

def start_model():
    model = build_model(num_classes=len(class_names))
    model.load_weights("pesos/model.h5")
    return model

global_model = start_model()

def predecir_imagen(file_stream):
    sample = Image.open(io.BytesIO(file_stream.read()))

    size = (IMG_SIZE, IMG_SIZE)
    sample_resized = tf.image.resize(sample, size)
    sample_expanded = tf.expand_dims(sample_resized, 0)

    prediction = global_model.predict(sample_expanded)

    top_idx = np.argsort(prediction)[0][-1]
    top_class = class_names[top_idx]
    confidence = float(np.max(prediction[0])) * 100

    return top_class, confidence