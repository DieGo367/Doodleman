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

class MainHandler(webapp2.RequestHandler):
    def get(self):
        user = users.get_current_user()
        if user:
            name = user.nickname().split('@')[0];
            log_url = users.create_logout_url('/')
        else:
            name = "Guest"
            log_url = users.create_login_url('/')

        temp_vars = {
            "user": user,
            "name": name,
            "log_url": log_url
        }
        temp = env.get_template("main.html")
        self.response.out.write(temp.render(temp_vars))

app = webapp2.WSGIApplication([
    ('/', MainHandler)
], debug=True)
