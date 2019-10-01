import io
import json
import os
from flask import Flask
from flask import make_response
from flask import render_template
from flask import request
from flask import Response
from flask import send_file
from flask import send_from_directory
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

scripts = [
  "lib/simplepeer.min.js",
  "lib/lz-string.min.js",
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
def host_signal(room_code):
    while True:
        room = rooms[room_code]
        if room["startHostEvt"]:
            room["startHostEvt"] = False
            yield "data:hello!\n\n"
        signals = room["client_signals"]
        if len(signals)>0:
            yield f"event:signal\ndata:{signals.pop(0)}\n\n"

def client_signal(room_code):
    while True:
        room = rooms[room_code]
        if room["startClientEvt"]:
            room["startClientEvt"] = False
            yield "data:hello!\n\n"
        signals = room["host_signals"]
        if len(signals) > 0:
            yield f"event:signal\ndata:{signals.pop(0)}\n\n"

@app.route('/net/createroom',methods=["POST"])
def net_create_room():
    new_room = {"host_signals": [], "client_signals": []}
    rooms.append(new_room)
    return json.dumps([len(rooms)-1])

@app.route('/net/discovery',methods=["POST"])
def net_set_room_discovery():
    data = request.get_json()
    room = rooms[data["room"]]
    if room:
        room["host_signals"].append(data["discover"])
        return "", 200
    else:
        return "Room not found", 404

@app.route('/net/signal',methods=["POST"])
def net_new_client_signal():
    data = request.get_json()
    room = rooms[data["room"]]
    if room:
        room["client_signals"].append(data["signal"])
        return "", 200
    else:
        return "Room not found", 404

@app.route('/net/checkclients/<int:room_code>')
def net_check_for_clients(room_code):
    room = rooms[room_code]
    if room:
        room["startHostEvt"] = True
        return Response(host_signal(room_code),mimetype="text/event-stream")
    else:
        return "Room not found", 404

@app.route('/net/join/<int:room_code>')
def net_join_room(room_code):
    room = rooms[room_code]
    if room:
        room["startClientEvt"] = True
        room["busy"] = True
        return Response(client_signal(room_code),mimetype="text/event-stream")
    else:
        return "Room not found", 404

@app.route('/net/confirmation',methods=["POST"])
def net_client_confirmation():
    data = request.get_json()
    room = rooms[data["room"]]
    if room:
        room["busy"] = False
        return "", 200
    else:
        return "Room not found", 404

@app.route('/net/lockroom',methods=["POST"])
def net_lock_room():
    data = request.get_json()
    room = rooms[data["room"]]
    if room:
        rooms[data["room"]] = None
    return "", 200

@app.route('/net/roomlist')
def debug_roomlist():
    return json.dumps(rooms)

if __name__ == "__main__":
    app.run()
