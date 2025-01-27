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

import unittest
import json
from unittest.mock import patch

from main import app


class TestRoute(unittest.TestCase):

  def test_homepage(self):
    response = app.test_client().get('/factcheck')
    assert response.status_code == 308  # redirect to /factcheck/

  def test_faq(self):
    response = app.test_client().get('/factcheck/faq')
    assert response.status_code == 200

  def test_blog(self):
    response = app.test_client().get('/factcheck/blog')
    assert response.status_code == 200

  @patch('routes.factcheck.list_blobs')
  def test_download(self, mock_list_blobs):
    mock_list_blobs.side_effect = (lambda bucket, max_blobs: [])
    response = app.test_client().get('/factcheck/download')
    assert response.status_code == 200
