# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

from flask import Blueprint
from flask import render_template
from lib.gcs import list_blobs

_MAX_BLOBS = 1
_FC_FEEDS_BUCKET = 'datacommons-feeds'

# Define blueprint
bp = Blueprint("factcheck", __name__, url_prefix='/factcheck')


@bp.route('/')
def homepage():
  return render_template('factcheck/factcheck_homepage.html')


@bp.route('/faq')
def faq():
  return render_template('factcheck/factcheck_faq.html')


@bp.route('/blog')
def blog():
  return render_template('factcheck/factcheck_blog.html')


@bp.route('/download')
def download():
  recent_blobs = list_blobs(_FC_FEEDS_BUCKET, _MAX_BLOBS)
  return render_template('factcheck/factcheck_download.html',
                         recent_blobs=recent_blobs)
