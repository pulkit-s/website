# Copyright 2021 Google LLC
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

from datetime import datetime
import hashlib
import json
import os
from google.protobuf import text_format
from config import subject_page_pb2

# This has to be in sync with static/js/shared/util.ts
PLACE_EXPLORER_CATEGORIES = [
    "economics",
    "health",
    "equity",
    "crime",
    "education",
    "demographics",
    "housing",
    "environment",
    "energy",
]

# key is topic_id, which should match the folder name under config/topic_page
# property is the list of filenames in that folder to load.
TOPIC_PAGE_CONFIGS = {
    'equity': ['USA', 'CA'],
    'poverty': ['USA', 'India'],
}


def get_chart_config():
  chart_config = []
  for filename in PLACE_EXPLORER_CATEGORIES:
    with open(os.path.join('config', 'chart_config', filename + '.json'),
              encoding='utf-8') as f:
      chart_config.extend(json.load(f))
  return chart_config


# Get the SubjectPageConfig of the textproto at the given filepath
def get_subject_page_config(filepath):
  with open(filepath, 'r') as f:
    data = f.read()
    subject_page_config = subject_page_pb2.SubjectPageConfig()
    text_format.Parse(data, subject_page_config)
    return subject_page_config


# Returns topic pages loaded as SubjectPageConfig protos:
# { topic_id: [SubjectPageConfig,...] }
def get_topic_page_config():
  topic_configs = {}
  for topic_id, filenames in TOPIC_PAGE_CONFIGS.items():
    configs = []
    for filename in filenames:
      filepath = os.path.join('config', 'topic_page', topic_id,
                              filename + '.textproto')
      configs.append(get_subject_page_config(filepath))
    topic_configs[topic_id] = configs
  return topic_configs


# Returns list of disaster dashboard configs loaded as SubjectPageConfig protos
def get_disaster_dashboard_configs():
  dashboard_configs = []
  dashboard_configs_dir = os.path.join("config", "disaster_dashboard")
  for filename in os.listdir(dashboard_configs_dir):
    filepath = os.path.join(dashboard_configs_dir, filename)
    dashboard_configs.append(get_subject_page_config(filepath))
  return dashboard_configs


# Returns a summary of the available topic page summaries as an object:
# {
#   topicPlaceMap: {
#        <topic_id>: list of places that this config can be used for
#   },
#   topicNameMap: {
#       <topic_id>: <topic_name>
#   }
# }
def get_topics_summary(topic_page_configs):
  topic_place_map = {}
  topic_name_map = {}
  for topic_id, config_list in topic_page_configs.items():
    if len(config_list) < 1:
      continue
    topic_name_map[topic_id] = config_list[0].metadata.topic_name
    if topic_id not in topic_place_map:
      topic_place_map[topic_id] = []
    for config in config_list:
      topic_place_map[topic_id].extend(config.metadata.place_dcid)
  return {"topicPlaceMap": topic_place_map, "topicNameMap": topic_name_map}


def hash_id(user_id):
  return hashlib.sha256(user_id.encode('utf-8')).hexdigest()


def parse_date(date_string):
  parts = date_string.split("-")
  if len(parts) == 1:
    return datetime.strptime(date_string, "%Y")
  elif len(parts) == 2:
    return datetime.strptime(date_string, "%Y-%m")
  elif len(parts) == 3:
    return datetime.strptime(date_string, "%Y-%m-%d")
  else:
    raise ValueError("Invalid date: %s", date_string)
