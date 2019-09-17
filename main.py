import io
import json
import os
from flask import Flask
from flask import make_response
from flask import render_template
from flask import request
from flask import send_file
from flask import send_from_directory
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

scripts = [
  "simplepeer.min.js",
  "game.js",
  "project scribble.js",
  "resource.js",
  "level.js",
  "animation.js",
  "controls.js",
  "collision.js",
  "classes.js",
  "gui.js",
  "devTools.js",
  "editorTools.js"
]
gamemodes = [
  "title.js",
  "editor.js",
  "sandbox.js",
  "survival.js",
  "online-lobby.js"
]
static_folders = [
  "animations",
  "data",
  "levels",
  "res",
  "scripts"
]

def get_script_lists(launch_mode):
    scs = []
    for script in scripts:
        scs.append(f"scripts/{script}")
    for script in gamemodes:
        scs.append(f"scripts/gamemodes/{script}")
    return [scs, [f"const GAME_LAUNCH = {launch_mode};"]]

def get_content_type(ext):
    types = {
        "css": "text/css",
        "js": "text/javascript",
        "json": "application/json",
        "ogg": "audio/ogg",
        "png": "image/png"
    }
    if ext in types.keys():
        return types[ext]
    else:
        return "text/html"

@app.route('/')
def game():
    script_list = get_script_lists(0)
    return render_template('main.html',scripts=script_list[0],statements=script_list[1])

@app.route('/edit')
def editor():
    script_list = get_script_lists(1)
    return render_template('main.html',scripts=script_list[0],statements=script_list[1])

@app.route('/online')
def online_lobby():
    script_list = get_script_lists(4)
    return render_template('main.html',scripts=script_list[0],statements=script_list[1])

@app.route('/join/<int:id>')
def join(id):
    script_list = get_script_lists(0)
    script_list[1].append(f"netInvite = '{id}';</script>")
    return render_template('main.html',scripts=script_list[0],statements=script_list[1])

@app.route('/<folder>/<path:subpath>')
def get_static(folder,subpath):
    if folder in static_folders:
        return send_from_directory(folder,subpath)
    else:
        return "this be a 404", 404

@app.route('/favicon.ico')
def get_ico():
    return send_file('favicon.ico')

@app.route('/manifest.json')
def get_manifest():
    return send_file("manifest.json")

@app.route('/worker.js')
def build_service_worker():
    paths = ['/','/edit','/favicon.ico', '/manifest.json']
    for dir in static_folders:
        for dirpath, dirnames, filenames in os.walk(dir):
            for filename in filenames:
                paths.append("/"+os.path.join(dirpath,filename).replace("\\","/"))
    str = ""
    with open("worker.js") as file:
        str = file.read()
    str = str.replace('"""staticFiles"""',f"{paths}")
    return send_file(io.BytesIO(str.encode()),attachment_filename="worker.js")

# NET CODE
rooms = []
@app.route('/net/createroom',methods=["POST"])
def net_create_room():
    new_room = {"discover": None, "signaling": []}
    rooms.append(new_room)
    return json.dumps([len(rooms)-1])

@app.route('/net/discovery',methods=["POST"])
def net_set_room_discovery():
    data = request.get_json()
    room = rooms[data["room"]]
    if room:
        room["discover"] = data["discover"]
        return "", 200
    else:
        return "Room not found", 404

@app.route('/net/signal',methods=["POST"])
def net_new_client_signal():
    data = request.get_json()
    room = rooms[data["room"]]
    if room:
        room["signaling"].append(data["client"])
        return "", 200
    else:
        return "Room not found", 404

@app.route('/net/checkclients',methods=["POST"])
def net_check_for_clients():
    data = request.get_json()
    room = rooms[data["room"]]
    if room:
        return json.dumps(room["signaling"])
    else:
        return "Room not found", 404

@app.route('/net/join',methods=["POST"])
def net_join_room():
    data = request.get_json()
    room = rooms[data["room"]]
    if room:
        return json.dumps([room["discover"]])
    else:
        return "Room not found", 404

@app.route('/net/confirmation',methods=["POST"])
def net_client_confirmation():
    data = request.get_json()
    room = rooms[data["room"]]
    if room:
        client = data["client"]
        sig = room["signaling"]
        if client in sig:
            i = sig.index(client)
            room["signaling"] = sig[:i] + sig[i+1:]
        return "", 200
    else:
        return "Room not found", 404

if __name__ == "__main__":
    app.run()
