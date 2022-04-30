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
from flask import request
from flask import send_file
from flask import send_from_directory
from flask_cors import CORS
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
cors = CORS(app, resources={"/net/*":{"origins": "*"}})

static_folders = [
  "animations",
  "data",
  "levels",
  "res",
  "js"
]

def send404(msg=""):
	return msg, 404
@app.errorhandler(404)
def default404(e):
	return send404("Page not found")

@app.route("/")
def game():
	return send_file("index.html")

@app.route("/<folder>/<path:subpath>")
def get_static(folder,subpath):
	if folder in static_folders:
		return send_from_directory(folder,subpath)
	else:
		return send404("Directory does not exist")

@app.route("/list/<folder>.json")
def get_static_list_new(folder):
	paths = []
	if folder == "images":
		for filename in os.listdir("res"):
			ext = filename.split(".").pop()
			if ext == "png":
				paths.append("res/"+filename)
		for filename in os.listdir("res/GUI"):
			ext = filename.split(".").pop()
			if ext == "png":
				paths.append("res/GUI/"+filename)
	elif folder == "sounds":
		for dirpath, _dirnames, filenames in os.walk("res/sounds"):
			for filename in filenames:
				path = os.path.join(dirpath,filename).replace('\\','/')
				paths.append(path)
	elif folder in ["animations", "levels"]:
		for dirpath, _dirnames, filenames in os.walk(folder):
			for filename in filenames:
				path = os.path.join(dirpath,filename).replace('\\','/')
				paths.append(path)
	return jsonify(paths)

@app.route("/favicon.ico")
def get_ico():
	return send_file('favicon.ico')

@app.route("/manifest.json")
def get_manifest():
	return send_file("manifest.json")

@app.route("/sw.js")
def build_service_worker():
	paths = ["/", "/favicon.ico", "/manifest.json"]
	for dir in static_folders:
		paths.append(f"/list/{dir}.json")
		for dirpath, dirnames, filenames in os.walk(dir):
			for subpath in dirnames:
				paths.append(f"/list/{dirpath}/{subpath}.json")
			for filename in filenames:
				paths.append("/"+os.path.join(dirpath,filename).replace("\\","/"))
	with open("sw.js") as file:
		str = file.read()
	str = str.replace('["staticFiles"]',f"{paths}")
	return send_file(io.BytesIO(str.encode()),attachment_filename="sw.js")

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
def fire_pop(path,index=-1):
	data = fire_get(path)
	if isinstance(data,list):
		first = data.pop(index)
		if len(data)==0:
			fire_put(path,0)
		else:
			fire_put(path,data)
		return {"data":first}
def fire_popleft(path):
	return fire_pop(path,0)

# NET CODE

ROOM_TIMEOUT = 60 # minutes
ROOM_CLEANUP_PERIOD = 24 * 60 # 1 day
ROOM_CREATE_ATTEMPTS = 50

def net_gen_room_code():
	acceptable = "0123456789ABCDEFGHJKMNPQRTUVWXY"
	code = ""
	for _ in range(4):
		code += acceptable[round(random.random()*(len(acceptable)-1))]
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
def net_send_DNE():
	return jsonify({"doesNotExist":True})

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
				"clientQueue": 0,
				"locked": False
			})
			return jsonify({'success':True,'room':room})
	return jsonify({"success":False})

@app.route("/net/keepalive",methods=["POST"])
def net_room_keep_alive():
	data = request.get_json()
	if fire_get(f"rooms/{data['room']}/timestamp"):
		return jsonify(fire_put(f"rooms/{data['room']}/timestamp",str(time.time())))
	else:
		return net_send_DNE()

@app.route("/net/closeroom",methods=["POST"])
def net_close_room():
	data = request.get_json()
	if data and data["room"]:
		return jsonify(fire_delete(f"rooms/{data['room']}"))
	else:
		return send404("No room given")

def net_post_signal(data,role):
	if data and net_room_alive(data["room"]):
		return jsonify(fire_put(f"rooms/{data['room']}/{role}Signal",data["signal"]))
	return net_send_DNE()
@app.route("/net/posthost",methods=["POST"])
def net_post_host_code():
	return net_post_signal(request.get_json(),"host")
@app.route("/net/postclient",methods=["POST"])
def net_post_client_code():
	return net_post_signal(request.get_json(),"client")

def net_take_signal(data,role):
	if data and net_room_alive(data["room"]):
		return jsonify(fire_put(f"rooms/{data['room']}/{role}Signal",0))
	return net_send_DNE()
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
		if fire_get(f"rooms/{data['room']}/locked"):
			return jsonify({"locked": True})
		else:
			stamp = str(time.time())
			if fire_append(f"rooms/{data['room']}/clientQueue",stamp):
				return jsonify({"stamp":stamp,"locked":False})
	return net_send_DNE()

@app.route("/net/leavequeue",methods=["POST"])
def net_leave_queue():
	data = request.get_json()
	if data and net_room_alive(data["room"]):
		return jsonify(fire_popleft(f"rooms/{data['room']}/clientQueue"))
	return net_send_DNE()

@app.route("/net/lockroom",methods=["POST"])
def net_lock_room():
	data = request.get_json()
	if net_room_alive(data["room"]):
		return jsonify(fire_put(f"rooms/{data['room']}/locked",True))
	return net_send_DNE()

@app.route("/net/unlockroom",methods=["POST"])
def net_unlock_room():
	data = request.get_json()
	if net_room_alive(data["room"]):
		return jsonify(fire_put(f"rooms/{data['room']}/locked",False))
	return net_send_DNE()

if __name__ == "__main__":
	app.run()
