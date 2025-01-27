/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Component for rendering a ranking tile.
 */

import axios from "axios";
import _ from "lodash";
import React, { useEffect, useRef, useState } from "react";

import { ChartEmbed } from "../../place/chart_embed";
import { PointApiResponse } from "../../shared/stat_types";
import { NamedTypedPlace, StatVarSpec } from "../../shared/types";
import { RankingPoint } from "../../types/ranking_unit_types";
import { RankingTileSpec } from "../../types/subject_page_proto_types";
import { stringifyFn } from "../../utils/axios";
import { rankingPointsToCsv } from "../../utils/chart_csv_utils";
import { getPlaceNames } from "../../utils/place_utils";
import { formatString, getStatVarName } from "../../utils/tile_utils";
import { RankingUnit } from "../ranking_unit";

const RANKING_COUNT = 5;

interface RankingGroup {
  points: RankingPoint[];
  unit: string;
  scaling: number;
  numDataPoints?: number;
}

interface RankingData {
  [key: string]: RankingGroup; // Key is main statVarDcid.
}
interface RankingTilePropType {
  id: string;
  place: NamedTypedPlace;
  enclosedPlaceType: string;
  title: string;
  statVarSpec: StatVarSpec[];
  rankingMetadata: RankingTileSpec;
  className?: string;
}

export function RankingTile(props: RankingTilePropType): JSX.Element {
  const [rankingData, setRankingData] = useState<RankingData | undefined>(null);
  const embedModalElement = useRef<ChartEmbed>(null);
  const chartContainer = useRef(null);

  useEffect(() => {
    fetchData(props, setRankingData);
  }, [props]);

  const numRankingLists = getNumRankingLists(
    props.rankingMetadata,
    rankingData
  );
  return (
    <div
      className={`chart-container ranking-tile ${props.className}`}
      ref={chartContainer}
      style={{
        gridTemplateColumns:
          numRankingLists > 1 ? "repeat(2, 1fr)" : "repeat(1, 1fr)",
      }}
    >
      {rankingData &&
        Object.keys(rankingData).map((statVar) => {
          const points = rankingData[statVar].points;
          const unit = rankingData[statVar].unit;
          const scaling = rankingData[statVar].scaling;
          const svName = getStatVarName(statVar, props.statVarSpec);
          const numDataPoints = rankingData[statVar].numDataPoints;
          return (
            <React.Fragment key={statVar}>
              {props.rankingMetadata.showHighest && (
                <div className="ranking-unit-container">
                  <RankingUnit
                    key={`${statVar}-highest`}
                    unit={unit}
                    scaling={scaling}
                    title={
                      props.title ||
                      formatString(
                        props.rankingMetadata.highestTitle
                          ? props.rankingMetadata.highestTitle
                          : "Highest ${statVar}",
                        {
                          date: "",
                          place: "",
                          statVar: svName,
                        }
                      )
                    }
                    points={points.slice(-RANKING_COUNT).reverse()}
                    isHighest={true}
                  />
                  <footer>
                    <a
                      href="#"
                      onClick={(event) => {
                        handleEmbed(event, points);
                      }}
                    >
                      Export
                    </a>
                  </footer>
                </div>
              )}
              {props.rankingMetadata.showLowest && (
                <div>
                  <RankingUnit
                    key={`${statVar}-lowest`}
                    unit={unit}
                    scaling={scaling}
                    title={
                      props.title ||
                      formatString(
                        props.rankingMetadata.lowestTitle
                          ? props.rankingMetadata.lowestTitle
                          : "Lowest ${statVar}",
                        {
                          date: "",
                          place: "",
                          statVar: svName,
                        }
                      )
                    }
                    numDataPoints={numDataPoints}
                    points={points.slice(0, RANKING_COUNT)}
                    isHighest={false}
                  />
                  <footer>
                    <a
                      href="#"
                      onClick={(event) => {
                        handleEmbed(event, points);
                      }}
                    >
                      Export
                    </a>
                  </footer>
                </div>
              )}
            </React.Fragment>
          );
        })}
      <ChartEmbed ref={embedModalElement} />
    </div>
  );

  function handleEmbed(
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
    rankingPoints: RankingPoint[]
  ): void {
    e.preventDefault();
    embedModalElement.current.show(
      "",
      rankingPointsToCsv(rankingPoints),
      chartContainer.current.offsetWidth,
      0,
      "",
      "",
      []
    );
  }
}
function fetchData(
  props: RankingTilePropType,
  setRankingData: (data: RankingData) => void
): void {
  const variables = [];
  for (const spec of props.statVarSpec) {
    variables.push(spec.statVar);
    if (spec.denom) {
      variables.push(spec.denom);
    }
  }
  axios
    .get<PointApiResponse>("/api/observations/point/within", {
      params: {
        parent_entity: props.place.dcid,
        child_type: props.enclosedPlaceType,
        variables: variables,
      },
      paramsSerializer: stringifyFn,
    })
    .then((resp) => {
      const rankingData: RankingData = {};
      const statData = resp.data;
      // Get Ranking data
      for (const spec of props.statVarSpec) {
        if (!(spec.statVar in statData.data)) {
          continue;
        }
        const arr = [];
        for (const place in statData.data[spec.statVar]) {
          const rankingPoint = {
            placeDcid: place,
            value: statData.data[spec.statVar][place].value,
          };
          if (_.isUndefined(rankingPoint.value)) {
            console.log(`Skipping ${place}, missing ${spec.statVar}`);
            continue;
          }
          if (spec.denom) {
            if (spec.denom in statData.data) {
              rankingPoint.value /= statData.data[spec.denom][place].value;
            } else {
              console.log(`Skipping ${place}, missing ${spec.denom}`);
              continue;
            }
          }
          arr.push(rankingPoint);
        }
        arr.sort((a, b) => {
          return a.value - b.value;
        });
        const numDataPoints = arr.length;
        rankingData[spec.statVar] = {
          points: arr,
          unit: spec.unit,
          scaling: spec.scaling,
          numDataPoints,
        };
      }
      return rankingData;
    })
    .then((rankingData) => {
      // Fetch place names.
      const places: Set<string> = new Set();
      for (const statVar in rankingData) {
        for (const point of rankingData[statVar].points) {
          places.add(point.placeDcid);
        }
      }
      getPlaceNames(Array.from(places)).then((placeNames) => {
        for (const statVar in rankingData) {
          for (const point of rankingData[statVar].points) {
            point.placeName = placeNames[point.placeDcid] || point.placeDcid;
          }
        }
        setRankingData(rankingData);
      });
    });
}

/**
 * Gets the number of ranking lists that will be shown
 * @param rankingTileSpec ranking tile specifications
 * @param rankingData ranking data to be shown
 */
function getNumRankingLists(
  rankingTileSpec: RankingTileSpec,
  rankingData: { [sv: string]: RankingGroup }
): number {
  let numListsPerSv = 0;
  if (rankingTileSpec.showHighest) {
    numListsPerSv++;
  }
  if (rankingTileSpec.showLowest) {
    numListsPerSv++;
  }
  return rankingData ? Object.keys(rankingData).length * numListsPerSv : 0;
}
