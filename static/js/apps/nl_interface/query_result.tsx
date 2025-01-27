/**
 * Copyright 2023 Google LLC
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
 * A single query for the NL interface
 */

import axios from "axios";
import _ from "lodash";
import React, { createRef, memo, useEffect, useState } from "react";
import { Container } from "reactstrap";

import { SubjectPageMainPane } from "../../components/subject_page/main_pane";
import { SearchResult } from "../../types/app/nl_interface_types";
import { BUILD_OPTIONS, DebugInfo } from "./debug_info";

const SVG_CHART_HEIGHT = 160;

export interface QueryResultProps {
  query: string;
  queryIdx: number;
  contextHistory: any[];
  addContextCallback: (any, number) => void;
}

export const QueryResult = memo(function QueryResult(
  props: QueryResultProps
): JSX.Element {
  const [chartsData, setChartsData] = useState<SearchResult | undefined>();
  const [selectedBuild, setSelectedBuild] = useState(BUILD_OPTIONS[0].value);
  const [isLoading, setIsLoading] = useState(true);
  const [debugData, setDebugData] = useState<any>();
  const scrollRef = createRef<HTMLDivElement>();
  const [errorMsg, setErrorMsg] = useState<string | undefined>();

  useEffect(() => {
    // Scroll to the top (assuming this is the last query to render, and other queries are memoized).
    // HACK: use a longer timeout to correct scroll errors after charts have rendered.
    const timer = setTimeout(() => {
      scrollRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "start",
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    fetchData(props.query, selectedBuild);
  }, [props.query, selectedBuild]);

  function fetchData(query: string, build: string): void {
    setIsLoading(true);
    console.log("context:", props.query, props.contextHistory);
    axios
      .post(`/nl/data?q=${query}&build=${build}`, {
        contextHistory: props.contextHistory,
      })
      .then((resp) => {
        if (
          resp.data["context"] === undefined ||
          resp.data["config"] === undefined
        ) {
          setIsLoading(false);
          props.addContextCallback(undefined, props.queryIdx);
          return;
        }
        const context: any = resp.data["context"];
        props.addContextCallback(context, props.queryIdx);

        // Filter out empty categories.
        const categories = _.get(resp, ["data", "config", "categories"], []);
        _.remove(categories, (c) => _.isEmpty(c));
        if (categories.length > 0) {
          setChartsData({
            place: {
              types: [context["place_type"]],
              name: context["place_name"],
              dcid: context["place_dcid"],
            },
            config: resp.data["config"],
          });
        } else {
          setErrorMsg(
            "Sorry, we couldn't answer your question. Could you try again?"
          );
        }
        if (context["debug"] !== undefined) {
          setDebugData(context["debug"]);
        }
        setIsLoading(false);
      })
      .catch((error) => {
        props.addContextCallback(undefined, props.queryIdx);
        console.error("Error fetching data for", props.query, error);
        setIsLoading(false);
        setErrorMsg(
          "Sorry, we didn’t understand your question. Could you try again?"
        );
      });
  }
  return (
    <>
      <div className="nl-query" ref={scrollRef}>
        <Container>
          <h2>Q: {props.query}</h2>
        </Container>
      </div>
      <div className="nl-result">
        <Container>
          {debugData && (
            <DebugInfo
              debugData={debugData}
              selectedBuild={selectedBuild}
              setSelectedBuild={setSelectedBuild}
            ></DebugInfo>
          )}
          {chartsData && chartsData.config && (
            <SubjectPageMainPane
              place={chartsData.place}
              pageConfig={chartsData.config}
              svgChartHeight={SVG_CHART_HEIGHT}
            />
          )}
          {errorMsg && (
            <div className="nl-query-error">
              <p>{errorMsg}</p>
            </div>
          )}
          {isLoading && (
            <div className="dot-loading-stage">
              <div className="dot-flashing"></div>
            </div>
          )}
        </Container>
      </div>
    </>
  );
});
