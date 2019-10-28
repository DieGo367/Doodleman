import httplib2
import io
import json
import os
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
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

scripts = [
  "lib/simplepeer.min.js",
  "lib/lz-string.min.js",
  "lib/firebase_config.js",
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

def send404(msg=""):
	return render_template("404.html",msg=msg), 404
@app.errorhandler(404)
def default404(e):
	return send404("Page not found")

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
		return send404("Directory does not exist")

@app.route('/list/<path:folderpath>.json')
def get_static_list(folderpath):
	folder = folderpath.split("/").pop(0)
	if folder in static_folders:
		paths = []
		for dirpath, dirnames, filenames in os.walk(folderpath):
			for filename in filenames:
				path = os.path.join(dirpath,filename).replace('\\','/').replace(folderpath+"/","")
				paths.append(path)
		return jsonify(paths)
	else:
		return send404()

@app.route('/imagelist.json')
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

@app.route('/favicon.ico')
def get_ico():
	return send_file('favicon.ico')

@app.route('/manifest.json')
def get_manifest():
	return send_file("manifest.json")

@app.route('/worker.js')
def build_service_worker():
	paths = ['/','/edit', 'imagelist.json', '/favicon.ico', '/manifest.json']
	for dir in static_folders:
		paths.append(f"/list/{dir}")
		for dirpath, dirnames, filenames in os.walk(dir):
			for subpath in dirnames:
				paths.append(f"/list/{dirpath}/{subpath}")
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
creds = GoogleCredentials.from_stream("cred.json").create_scoped(scopes)
def fire_authed():
	h = httplib2.Http()
	return creds.authorize(h)
def fire_put(path,value=None):
	content = fire_authed().request(database+path+".json",method="PUT",body=json.dumps(value))[1]
	return json.loads(content)
def fire_get(path):
	content = fire_authed().request(database+path+".json",method="GET")[1]
	return json.loads(content)
def fire_delete(path):
	content = fire_authed().request(database+path+".json",method="DELETE")[1]
	return json.loads(content)
# currently ignoring PATCH and POST

# NET CODE
rooms = []
class Room:
	rooms = {}
	room_count = 0
	def __init__(self,code):
		self.code = code
		self.busy = False
		self.host_evt_start = False
		self.host_heartbeat = 0
		self.host_signal_queue = []
		self.client_evt_start = False
		self.client_heartbeat = 0
		self.client_signal_queue = []
	def refresh(self,role):
		if role == "host":
			self.host_evt_start = True
			self.host_heartbeat = HEARTBEAT
		elif role == "client":
			self.client_evt_start = True
			self.client_heartbeat = HEARTBEAT
	def client_complete(self):
		self.client_heartbeat = 0
		self.busy = False
	def signal_ready(self,role):
		if role == "host":
			return self.host_evt_start
		elif role == "client":
			return self.client_evt_start
	def claim_signals(self,role):
		if role == "host":
			self.host_evt_start = False
		elif role == "client":
			self.client_evt_start = False
	def stream_alive(self,role):
		if role == "host":
			self.host_heartbeat -= 1
			return (self.host_heartbeat > 0)
		elif role == "client":
			self.client_heartbeat -= 1
			return (self.client_heartbeat > 0)
	def pop_signal(self,role):
		if role == "host":
			if len(self.host_signal_queue) > 0:
				return self.host_signal_queue.pop(0)
			else:
				return None
		elif role == "client":
			if len(self.client_signal_queue) > 0:
				return self.client_signal_queue.pop(0)
			else:
				return None
	def push_signal(self,role,signal):
		if role == "host": # should send to client
			self.client_signal_queue.append(signal)
		elif role == "client": # should send to host
			self.host_signal_queue.append(signal)
	def mark_for_closing(self):
		thread = Thread(target=self.check_for_closing)
		thread.start()
	def check_for_closing(self):
		time.sleep(5)
		if self.host_heartbeat <= 0:
			self.close()
	def close(self):
		rooms = self.rooms
		del rooms[self.code]
	@classmethod
	def new_room(cls):
		room = cls(cls.room_count)
		cls.room_count += 1
		cls.rooms[room.code] = room
		return room
	@classmethod
	def get_room(cls,code):
		if code in cls.rooms.keys():
			return cls.rooms[code]
		else:
			print(code)
			print(cls.rooms)
			return None
	@classmethod
	def json(cls):
		copy = {}
		for code, room in cls.rooms.items():
			copy[code] = room.__dict__
		return jsonify(copy)

HEARTBEAT = 60 #seconds to expire
def signal_stream(role,room_code):
	active = True
	is_target_client = False
	while active:
		room = Room.get_room(room_code)
		if room:
			if room.signal_ready(role):
				room.claim_signals(role)
				yield "data:hello!\n\n"
			if role == "host" or is_target_client:
				if room.stream_alive(role):
					signal = room.pop_signal(role)
					if signal:
						yield f"event:signal\ndata:{signal}\n\n"
					time.sleep(1)
				else:
					active = False
					if is_target_client:
						room.busy = False
					elif role == "host":
						room.mark_for_closing()
			else:
				if not room.busy:
					room.busy = True
					is_target_client = True
		else:
			active = False

def try_close_room(code):
    room = rooms[code]
    if room and room["hostHeartbeat"] < 1:
        rooms[code] = None

@app.route('/net/createroom',methods=["POST"])
def net_create_room():
	room = Room.new_room()
	return jsonify([room.code])

@app.route('/net/discovery',methods=["POST"])
def net_set_room_discovery():
	data = request.get_json()
	room = Room.get_room(data["room"])
	if room:
		room.push_signal("host",data["discover"])
		return "", 200
	else:
		return send404("Room not found")

@app.route('/net/signal',methods=["POST"])
def net_new_client_signal():
	data = request.get_json()
	room = Room.get_room(data["room"])
	if room:
		room.push_signal("client",data["signal"])
		return "", 200
	else:
		return send404("Room not found")

@app.route('/net/checkclients/<int:room_code>')
def net_check_for_clients(room_code):
	room = Room.get_room(room_code)
	if room:
		room.refresh("host")
		return Response(signal_stream("host",room_code),mimetype="text/event-stream")
	else:
		return send404("Room not found")

@app.route('/net/join/<int:room_code>')
def net_join_room(room_code):
	room = Room.get_room(room_code)
	if room:
		room.refresh("client")
		return Response(signal_stream("client",room_code),mimetype="text/event-stream")
	else:
		return send404("Room not found")

@app.route('/net/confirmation',methods=["POST"])
def net_client_confirmation():
	data = request.get_json()
	room = Room.get_room(data["room"])
	if room:
		room.client_complete()
		return "", 200
	else:
		return send404("Room not found")

@app.route('/net/lockroom',methods=["POST"])
def net_lock_room():
	data = request.get_json()
	room = Room.get_room(data["room"])
	if room:
		room.close()
	return "", 200

@app.route('/net/roomlist')
def debug_roomlist():
	return Room.json()

if __name__ == "__main__":
	app.run()
