from flask import Flask
from flask import make_response
from flask import render_template
from flask import send_from_directory
app = Flask(__name__)

scripts = [
  "peer.min.js",
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

if __name__ == "__main__":
    app.run()
