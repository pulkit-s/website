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

import React, { useEffect, useState } from "react";
import { Button, Input, InputGroup } from "reactstrap";

interface TextSearchBarPropType {
  onSearch: (string) => void;
  initialValue: string;
  placeholder: string;
  shouldAutoFocus?: boolean;
  clearValueOnSearch?: boolean;
}

/**
 * Component for the search box in the rich search interface. The value of the
 * is not controlled to prevent constantly updating the hash URL.
 */
export function TextSearchBar(props: TextSearchBarPropType): JSX.Element {
  const [invalid, setInvalid] = useState(false);
  const [value, setValue] = useState<string>("");
  useEffect(() => {
    setValue(props.initialValue);
  }, [props.initialValue]);
  return (
    <div className="input-query">
      <InputGroup>
        <Input
          invalid={invalid}
          placeholder={props.placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setInvalid(false);
          }}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="pac-target-input"
          autoFocus={props.shouldAutoFocus}
        />
        <Button onClick={handleSearch} className="rich-search-button">
          <span className="material-icons search rich-search-icon">search</span>
        </Button>
      </InputGroup>
    </div>
  );

  function handleSearch(): void {
    if (value) {
      props.onSearch(value);
      if (props.clearValueOnSearch) {
        setValue("");
      }
    } else {
      setInvalid(true);
    }
  }
}
