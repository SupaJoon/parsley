import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import styled from "@emotion/styled";
import IconButton from "@leafygreen-ui/icon-button";
import { palette } from "@leafygreen-ui/palette";
import { Option, Select } from "@leafygreen-ui/select";
import Icon from "components/Icon";
import IconWithTooltip from "components/IconWithTooltip";
import TextInputWithGlyph from "components/TextInputWithGlyph";
import { SearchBarActions } from "constants/enums";
import { CharKey, ModifierKey } from "constants/keys";
import { zIndex } from "constants/tokens";
import { useKeyboardShortcut } from "hooks";
import debounce from "utils/debounce";
import { leaveBreadcrumb } from "utils/errorReporting";

const { yellow } = palette;
interface SearchBarProps {
  disabled?: boolean;
  validator?: (value: string) => boolean;
  validatorMessage?: string;
  className?: string;
  onSubmit?: (selected: string, value: string) => void;
  onChange?: (selected: string, value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  className,
  disabled = false,
  onChange = () => {},
  onSubmit = () => {},
  validator = () => true,
  validatorMessage = "Invalid Input",
}) => {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(SearchBarActions.Search);

  const isFilter = selected === SearchBarActions.Filter;
  const isHighlight = selected === SearchBarActions.Highlight;
  const isSearch = selected === SearchBarActions.Search;
  const isValid = validator(input);

  const inputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcut(
    { charKey: CharKey.F, modifierKeys: [ModifierKey.Control] },
    () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    { disabled, ignoreFocus: true }
  );

  useKeyboardShortcut(
    { charKey: CharKey.S, modifierKeys: [ModifierKey.Control] },
    () => {
      // Iterate through SearchBarActions and select the next one.
      const SearchBarActionValues = Object.values(SearchBarActions);
      const keyIndex =
        (SearchBarActionValues.indexOf(selected) + 1) %
        SearchBarActionValues.length;
      const nextKey = Object.keys(SearchBarActions)[
        keyIndex
      ] as keyof typeof SearchBarActions;
      setSelected(SearchBarActions[nextKey]);
    },
    { disabled, ignoreFocus: true }
  );

  const handleOnSubmit = () => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
    if (isFilter || isHighlight) {
      setInput("");
    }
    leaveBreadcrumb("search-bar-submit", { selected, input }, "user");
    onSubmit(selected, input);
  };

  useEffect(() => {
    if (isSearch && input.length > 0) {
      handleOnSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearch]);

  // debounce the onChange handler to prevent excessive rerenders
  const debouncedHandleOnChangeCallback = useMemo(
    () => debounce((value: string) => onChange(selected, value), 1000),
    [selected, onChange]
  );

  const handleOnChange = (value: string) => {
    setInput(value);
    if (validator(value)) {
      debouncedHandleOnChangeCallback(value);
    }
  };

  const handleChangeSelect = (value: string) => {
    setSelected(value as SearchBarActions);
    leaveBreadcrumb("search-bar-select", { value }, "user");
  };

  return (
    <Container className={className}>
      <StyledSelect
        allowDeselect={false}
        aria-labelledby="searchbar-select"
        data-cy="searchbar-select"
        disabled={disabled}
        onChange={handleChangeSelect}
        popoverZIndex={zIndex.popover}
        value={selected}
      >
        <Option
          key={SearchBarActions.Search}
          data-cy="search-option"
          value={SearchBarActions.Search}
        >
          Search
        </Option>
        <Option
          key={SearchBarActions.Filter}
          data-cy="filter-option"
          value={SearchBarActions.Filter}
        >
          Filter
        </Option>
        <Option
          key={SearchBarActions.Highlight}
          data-cy="highlight-option"
          value={SearchBarActions.Highlight}
        >
          Highlight
        </Option>
      </StyledSelect>
      <StyledInput
        ref={inputRef}
        aria-label="searchbar-input"
        aria-labelledby="searchbar-input"
        data-cy="searchbar-input"
        disabled={disabled}
        icon={
          isValid ? (
            <IconButton
              aria-label="Select plus"
              data-cy="searchbar-submit"
              disabled={disabled || input.length === 0}
              onClick={handleOnSubmit}
            >
              <Icon glyph="Plus" />
            </IconButton>
          ) : (
            <IconWithTooltip
              data-cy="searchbar-warning"
              fill={yellow.base}
              glyph="Warning"
            >
              {validatorMessage}
            </IconWithTooltip>
          )
        }
        onChange={(e) => handleOnChange(e.target.value)}
        onKeyPress={(e: KeyboardEvent<HTMLInputElement>) =>
          e.key === "Enter" && isValid && handleOnSubmit()
        }
        placeholder="optional, regexp to search"
        spellCheck={false}
        type="text"
        value={input}
      />
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

// @ts-expect-error
const StyledSelect = styled(Select)`
  width: 120px;
  /* overwrite lg borders https://jira.mongodb.org/browse/PD-1995 */
  button {
    margin-top: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 0;
  }
`;

const StyledInput = styled(TextInputWithGlyph)`
  /* overwrite lg borders https://jira.mongodb.org/browse/PD-1995 */
  div input {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
`;

export default SearchBar;
