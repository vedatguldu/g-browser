/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useId, useMemo, useState } from "react";
import type { TFormItem } from "../../../chrome/common/modal-parent/utils/type.ts";
import {
  filterWorkspaceIconPickerOptions,
  getSafeWorkspaceIconPickerOptions,
  resolveWorkspaceIconPickerDisplayValue,
  selectWorkspaceIconPickerValue,
} from "../workspaceIconPickerModel.ts";

interface WorkspaceIconPickerFieldProps {
  item: TFormItem;
  value: string;
  onChange: (value: string) => void;
}

export function WorkspaceIconPickerField({
  item,
  value,
  onChange,
}: WorkspaceIconPickerFieldProps) {
  const [query, setQuery] = useState("");
  const radioGroupName = useId();
  const options = useMemo(
    () => getSafeWorkspaceIconPickerOptions(item.options ?? []),
    [item.options],
  );
  const visibleOptions = useMemo(
    () => filterWorkspaceIconPickerOptions(options, query),
    [options, query],
  );
  const displayValue = resolveWorkspaceIconPickerDisplayValue(
    value,
    item.displayValue,
    options,
  );
  const selectedOption = options.find((option) =>
    option.value === displayValue
  );
  const fieldLabel = item.label ?? item.id;
  const commitSelection = (candidate: string) => {
    const nextValue = selectWorkspaceIconPickerValue(
      value,
      candidate,
      options,
    );
    if (nextValue !== value) {
      onChange(nextValue);
    }
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    currentIndex: number,
  ) => {
    const total = visibleOptions.length;
    if (total === 0) return;

    let targetIndex = -1;
    const COLUMNS = 6;

    switch (event.key) {
      case "ArrowRight":
        targetIndex = (currentIndex + 1) % total;
        break;
      case "ArrowLeft":
        targetIndex = (currentIndex - 1 + total) % total;
        break;
      case "ArrowDown":
        targetIndex =
          currentIndex + COLUMNS < total
            ? currentIndex + COLUMNS
            : currentIndex;
        break;
      case "ArrowUp":
        targetIndex =
          currentIndex - COLUMNS >= 0
            ? currentIndex - COLUMNS
            : currentIndex;
        break;
      case "Home":
        targetIndex = 0;
        break;
      case "End":
        targetIndex = total - 1;
        break;
      default:
        return;
    }

    if (targetIndex >= 0 && targetIndex !== currentIndex) {
      event.preventDefault();
      const targetOption = visibleOptions[targetIndex];
      if (targetOption) {
        commitSelection(targetOption.value);
        const input = document.querySelector<HTMLInputElement>(
          `input[name="${radioGroupName}"][value="${targetOption.value}"]`,
        );
        input?.focus();
      }
    }
  };

  return (
    <fieldset className="mb-4 w-full">
      <legend className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
        {fieldLabel}
      </legend>

      {selectedOption?.icon && (
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-900 dark:text-white">
          <img
            src={selectedOption.icon}
            className="h-5 w-5"
            alt=""
          />
          <span>{selectedOption.label}</span>
        </div>
      )}

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={fieldLabel}
        placeholder={fieldLabel}
        className="mb-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0061E0] dark:border-[#42414D] dark:bg-[#42414D] dark:text-white"
      />

      <div
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {query ? `${visibleOptions.length} icons found` : ""}
      </div>

      <div
        role="radiogroup"
        aria-label={fieldLabel}
        className="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto rounded-md border border-gray-300 p-2 dark:border-[#42414D]"
      >
        {visibleOptions.length === 0 ? (
          <p className="col-span-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {item.placeholder ?? "No icons found"}
          </p>
        ) : (
          visibleOptions.map((option, index) => (
            <label
              key={option.value}
              className="block h-10 w-full cursor-pointer"
            >
              <input
                type="radio"
                name={radioGroupName}
                value={option.value}
                checked={displayValue === option.value}
                aria-label={option.label}
                className="peer sr-only"
                onChange={() => commitSelection(option.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                onClick={() => {
                  if (
                    displayValue === option.value && value !== option.value
                  ) {
                    commitSelection(option.value);
                  }
                }}
              />
              <span
                title={option.label}
                className={`flex h-full w-full items-center justify-center rounded-md border p-2 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#0061E0] ${
                  displayValue === option.value
                    ? "border-[#0061E0] bg-blue-50 dark:bg-[#42414D]"
                    : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                <img src={option.icon} className="h-5 w-5" alt="" />
              </span>
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}
