# Copyright 2022 Google LLC
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
"""Endpoints for disaster dashboard"""

from flask import Blueprint, current_app, escape
import services.datacommons as dc
import json
import flask
import routes.api.place as place_api
from google.protobuf.json_format import MessageToJson

from config import subject_page_pb2
import lib.util
import lib.subject_page_config as lib_subject_page_config

DEFAULT_PLACE_DCID = "Earth"
DEFAULT_PLACE_TYPE = "Planet"

# Define blueprint
bp = Blueprint("disasters", __name__, url_prefix='/disasters')


@bp.route('/v0')
def disaster_dashboard_v0():
  european_countries = json.dumps(
      dc.get_places_in(["europe"], "Country").get("europe", []))
  return flask.render_template('custom_dc/stanford/disaster_dashboard_v0.html',
                               european_countries=european_countries)


@bp.route('/')
@bp.route('/<path:place_dcid>', strict_slashes=False)
def disaster_dashboard(place_dcid=DEFAULT_PLACE_DCID):
  all_configs = current_app.config['DISASTER_DASHBOARD_CONFIGS']
  if current_app.config['LOCAL']:
    # Reload configs for faster local iteration.
    # TODO: Delete this when we are close to launch
    all_configs = lib.util.get_disaster_dashboard_configs()

  if len(all_configs) < 1:
    return "Error: no config installed"

  # Find the config for the topic & place.
  dashboard_config = None
  default_config = None
  for config in all_configs:
    if place_dcid in config.metadata.place_dcid:
      dashboard_config = config
      break
    if DEFAULT_PLACE_DCID in config.metadata.place_dcid:
      # TODO: Add a better way to find the default config.
      default_config = config
  if not dashboard_config:
    # Use the default config instead
    dashboard_config = default_config

  place_type = DEFAULT_PLACE_TYPE
  if place_dcid != DEFAULT_PLACE_DCID:
    place_type = place_api.get_place_type(place_dcid)
    if not place_type:
      place_type = "Place"
  place_name = place_api.get_i18n_name([place_dcid
                                       ]).get(place_dcid, escape(place_dcid))

  all_stat_vars = lib_subject_page_config.get_all_variables(dashboard_config)
  stat_vars_existence = dc.observation_existence(all_stat_vars, [place_dcid])

  for stat_var in stat_vars_existence['variable']:
    if not stat_vars_existence['variable'][stat_var]['entity'][place_dcid]:
      # This is for the main place, only remove the tile type for single place.
      for tile_type in [
          subject_page_pb2.Tile.TileType.HISTOGRAM,
          subject_page_pb2.Tile.TileType.LINE,
          subject_page_pb2.Tile.TileType.BAR,
      ]:
        dashboard_config = lib_subject_page_config.trim_config(
            dashboard_config, stat_var, tile_type)

  return flask.render_template('custom_dc/stanford/disaster_dashboard.html',
                               place_type=place_type,
                               place_name=place_name,
                               place_dcid=place_dcid,
                               config=MessageToJson(dashboard_config))
