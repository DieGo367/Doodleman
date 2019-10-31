import httplib2
import io
import json
import os
import random
import time
from oauth2client.client import GoogleCredentials
from threading import Thread
from flask import Flask
from flask import jsonify
from flask import make_response
from flask import render_template
from flask import request
from flask import Response
from flask import send_file
from flask import send_from_directory
from flask_cors import CORS
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
cors = CORS(app, resources={"/net/*":{"origins": "*"}})

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

def render_main(launch_mode,literals={},strings={}):
	scs = []
	for script in scripts:
		scs.append(f"scripts/{script}")
	for script in gamemodes:
		scs.append(f"scripts/gamemodes/{script}")
	lits = {"GAME_LAUNCH": launch_mode}
	strs = {"NET_URL": net_url}
	for key, item in literals.items():
		lits[key] = item
	for key, item in strings.items():
		strs[key] = item
	return render_template("main.html",scripts=scs,literals=lits,strings=strs)

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

def send404(msg=""):
	return render_template("404.html",msg=msg), 404
@app.errorhandler(404)
def default404(e):
	return send404("Page not found")

@app.route("/")
def game():
	return render_main(0)

@app.route("/edit")
def editor():
	return render_main(1)

@app.route("/online")
def online_lobby():
	return render_main(4)

@app.route("/join/<int:id>")
def join(id):
	return render_main(0,literals={"NET_INVITE": id})

@app.route("/<folder>/<path:subpath>")
def get_static(folder,subpath):
	if folder in static_folders:
		return send_from_directory(folder,subpath)
	else:
		return send404("Directory does not exist")

@app.route("/list/<path:folderpath>.json")
def get_static_list(folderpath):
	folder = folderpath.split("/").pop(0)
	if folder in static_folders:
		paths = []
		for dirpath, _dirnames, filenames in os.walk(folderpath):
			for filename in filenames:
				path = os.path.join(dirpath,filename).replace('\\','/').replace(folderpath+"/","")
				paths.append(path)
		return jsonify(paths)
	else:
		return send404()

@app.route("/imagelist.json")
def get_preload_images():
	paths = []
	for filename in os.listdir("res"):
		ext = filename.split(".").pop()
		if ext == "png":
			paths.append(filename)
	for filename in os.listdir("res/GUI"):
		ext = filename.split(".").pop()
		if ext == "png":
			paths.append("GUI/"+filename)
	return jsonify(paths)

@app.route("/favicon.ico")
def get_ico():
	return send_file('favicon.ico')

@app.route("/manifest.json")
def get_manifest():
	return send_file("manifest.json")

@app.route("/worker.js")
def build_service_worker():
	paths = ['/','/edit', 'imagelist.json', '/favicon.ico', '/manifest.json']
	for dir in static_folders:
		paths.append(f"/list/{dir}.json")
		for dirpath, dirnames, filenames in os.walk(dir):
			for subpath in dirnames:
				paths.append(f"/list/{dirpath}/{subpath}.json")
			for filename in filenames:
				paths.append("/"+os.path.join(dirpath,filename).replace("\\","/"))
	str = ""
	with open("worker.js") as file:
		str = file.read()
	str = str.replace('"""staticFiles"""',f"{paths}")
	return send_file(io.BytesIO(str.encode()),attachment_filename="worker.js")

# Firebase - Realtime Database
database = "https://doodle-man.firebaseio.com/"
scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/firebase.database"
]
net_url = "/net/"
if os.getenv("GAE_ENV","").startswith("standard"):
	creds = GoogleCredentials.get_application_default().create_scoped(scopes)
else:
	try:
		creds = GoogleCredentials.from_stream("cred.json").create_scoped(scopes)
	except:
		# rely on app engine server if credentials not found on local server
		net_url = "https://doodle-man.appspot.com/net/"
@app.route("/net")
def net():
	return net_url

def fire_authed():
	h = httplib2.Http()
	return creds.authorize(h)
def fire_put(path,value=None):
	content = fire_authed().request(f"{database}{path}.json",method="PUT",body=json.dumps(value))[1]
	return json.loads(content)
def fire_get(path):
	content = fire_authed().request(f"{database}{path}.json",method="GET")[1]
	return json.loads(content)
def fire_delete(path):
	content = fire_authed().request(f"{database}{path}.json",method="DELETE")[1]
	return json.loads(content)
def fire_post(path,value=None):
	content = fire_authed().request(f"{database}{path}.json",method="POST",body=json.dumps(value))[1]
	return json.loads(content)
def fire_patch(path,value=None):
	content = fire_authed().request(f"{database}{path}.json",method="PATCH",body=json.dumps(value))[1]
	return json.loads(content)
# custom
def fire_append(path,value=None):
	data = fire_get(path)
	if data == 0:
		return fire_put(path,[value])
	elif isinstance(data,list):
		data.append(value)
		print(data)
		return fire_put(path,data)
def fire_pop(path,value=None,index=-1):
	data = fire_get(path)
	if isinstance(data,list):
		first = data.pop(index)
		if len(data)==0:
			fire_put(path,0)
		else:
			fire_put(path,data)
		return {"data":first}
def fire_popleft(path,value=None):
	return fire_pop(path,value,0)

# NET CODE

ROOM_TIMEOUT = 60 # minutes
ROOM_CLEANUP_PERIOD = 24 * 60 # 1 day
ROOM_CREATE_ATTEMPTS = 50

def net_gen_room_code():
	acceptable = "0123456789ABCDEFGHJKMNPQRTUVWXY"
	code = ""
	for _ in range(4):
		code += acceptable[round(random.random()*len(acceptable))]
	return code

def net_room_alive(room):
	timestamp = fire_get(f"rooms/{room}/timestamp")
	if timestamp == None:
		return False
	else:
		age = (time.time() - float(timestamp)) / 60 # seconds to minutes
		if age > ROOM_TIMEOUT:
			fire_delete(f"rooms/{room}")
			return False
		else:
			return True

def net_check_for_cleanup():
	last_cleanup = fire_get("lastCleanup")
	if last_cleanup == None or (time.time() - float(last_cleanup))/60 > ROOM_CLEANUP_PERIOD:
		thrd = Thread(target=net_cleanup_rooms)
		thrd.start()

def net_cleanup_rooms():
	fire_put("lastCleanup",str(time.time()))
	rooms = fire_get("rooms")
	if rooms:
		for room, data in rooms.items():
			if data:
				if "timestamp" in data:
					stamp = float(data["timestamp"])
					if (time.time() - stamp)/60 > ROOM_TIMEOUT:
						fire_delete(f"rooms/{room}")
				else:
					fire_delete(f"rooms/{room}")

@app.route("/net/createroom",methods=["POST"])
def net_create_room():
	net_check_for_cleanup()
	for _ in range(ROOM_CREATE_ATTEMPTS):
		room = net_gen_room_code()
		if not net_room_alive(room):
			fire_put(f"rooms/{room}",{
				"timestamp": str(time.time()),
				"hostSignal": 0,
				"clientSignal": 0,
				"clientQueue": 0
			})
			return jsonify({'success':True,'room':room})
	return jsonify({"success":False})

@app.route("/net/keepalive",methods=["POST"])
def net_room_keep_alive():
	data = request.get_json()
	if fire_get(f"rooms/{data['room']}/timestamp"):
		return jsonify(fire_put(f"rooms/{data['room']}/timestamp",str(time.time())))
	else:
		return send404("Room not found")

def net_post_signal(data,role):
	if data and net_room_alive(data["room"]):
		return jsonify(fire_put(f"rooms/{data['room']}/{role}Signal",data["signal"]))
	return send404("Room not found")
@app.route("/net/posthost",methods=["POST"])
def net_post_host_code():
	return net_post_signal(request.get_json(),"host")
@app.route("/net/postclient",methods=["POST"])
def net_post_client_code():
	return net_post_signal(request.get_json(),"client")

def net_take_signal(data,role):
	if data and net_room_alive(data["room"]):
		return jsonify(fire_put(f"rooms/{data['room']}/{role}Signal",0))
	return send404("Room not found")
@app.route("/net/takehost",methods=["POST"])
def net_take_host_code():
	return net_take_signal(request.get_json(),"host")
@app.route("/net/takeclient",methods=["POST"])
def net_take_client_code():
	return net_take_signal(request.get_json(),"client")

@app.route("/net/enterqueue",methods=["POST"])
def net_enter_queue():
	data = request.get_json()
	if data and net_room_alive(data["room"]):
		stamp = str(time.time())
		if fire_append(f"rooms/{data['room']}/clientQueue",stamp):
			return jsonify({"stamp":stamp})
	return send404("Room not found")

@app.route("/net/leavequeue",methods=["POST"])
def net_leave_queue():
	data = request.get_json()
	if data and net_room_alive(data["room"]):
		return jsonify(fire_popleft(f"rooms/{data['room']}/clientQueue"))
	return send404("Room not found")

@app.route("/net/lockroom",methods=["POST"])
def net_lock_room():
	data = request.get_json()
	if net_room_alive(data["room"]):
		return jsonify(fire_put(f"{data['room']}/locked",True))
	return send404("Room not found")

if __name__ == "__main__":
	app.run()
