#!/usr/bin/env python
#
# Copyright 2007 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
import jinja2
import webapp2
from google.appengine.api import users

env = jinja2.Environment(loader=jinja2.FileSystemLoader("templates"))
scripts = [
  "project%20scribble.js",
  "game.js",
  "level.js",
  "animation.js",
  "controls.js",
  "collision.js",
  "classes.js",
  "gui.js",
  "devTools.js"
]
editor_scripts = [
  "project%20scribble.js",
  "editor.js",
  "level.js",
  "animation.js",
  "controls.js",
  "collision.js",
  "classes.js",
  "gui.js",
  "devTools.js"
]

def get_user_vars():
    user = users.get_current_user()
    if user:
        name = user.nickname().split('@')[0]
        log_url = users.create_logout_url('/')
    else:
        name = "Guest"
        log_url = users.create_login_url('/')
    return {"user": user, "name": name, "log_url": log_url}

class MainHandler(webapp2.RequestHandler):
    def get(self):
        script_html = ""
        for script in scripts:
            script_html += "<script src=\"scripts/%s\"></script>" % (script)

        temp_vars = get_user_vars()
        temp_vars["scripts"] = script_html
        temp = env.get_template("main.html")
        self.response.out.write(temp.render(temp_vars))

class EditorHandler(webapp2.RequestHandler):
    def get(self):
        script_html = ""
        for script in editor_scripts:
            script_html += "<script src=\"scripts/%s\"></script>" % (script)

        temp_vars = get_user_vars()
        temp_vars["scripts"] = script_html
        temp = env.get_template("editor.html")
        self.response.out.write(temp.render(temp_vars))

app = webapp2.WSGIApplication([
    ('/', MainHandler),
    ('/edit', EditorHandler)
], debug=True)
