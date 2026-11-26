import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { COUNTRY_OPTIONS, filterCountryOptions } from '../data/countries';

export default function CountrySelect({
  id,
  value = '',
  onChange,
  options = COUNTRY_OPTIONS,
  required = false,
  disabled = false,
  placeholder = 'Select country...',
  searchPlaceholder = 'Search country...',
  emptyText = 'No matching countries',
  clearLabel = 'Clear selection',
  ariaLabel,
  variant = 'signup',
}) {
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionRefs = useRef([]);

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [openUpward, setOpenUpward] = useState(false);

  const normalizedValue = typeof value === 'string' ? value.trim().toUpperCase() : '';

  const selectedOption = useMemo(
    () =>
      options.find((option) => String(option.code).toUpperCase() === normalizedValue) ?? null,
    [options, normalizedValue],
  );

  const filteredOptions = useMemo(
    () => filterCountryOptions(options, searchQuery),
    [options, searchQuery],
  );

  const showClearOption = !required && Boolean(normalizedValue) && !searchQuery.trim();
  const totalSelectableItems = filteredOptions.length + (showClearOption ? 1 : 0);

  const selectedLabel = selectedOption
    ? (selectedOption.name ?? selectedOption.nameAr ?? selectedOption.code)
    : normalizedValue || '';

  useEffect(() => {
    if (!open) return undefined;

    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || totalSelectableItems === 0) return;
    if (highlightedIndex >= totalSelectableItems) {
      setHighlightedIndex(0);
    }
  }, [open, totalSelectableItems, highlightedIndex]);

  useEffect(() => {
    if (!open) return;
    const node = optionRefs.current[highlightedIndex];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [open, highlightedIndex]);

  const openMenu = () => {
    if (disabled) return;

    if (rootRef.current && typeof window !== 'undefined') {
      const rect = rootRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < 260 && spaceAbove > spaceBelow);
    }

    setSearchQuery('');
    const selectedIdx = options.findIndex(
      (option) => String(option.code).toUpperCase() === normalizedValue,
    );
    const offset = !required && Boolean(normalizedValue) ? 1 : 0;
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx + offset : 0);
    setOpen(true);
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const handleSelect = (nextCode) => {
    onChange?.(nextCode);
    closeMenu({ restoreFocus: true });
  };

  const handleClear = (event) => {
    event.stopPropagation();
    if (disabled) return;
    onChange?.('');
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event) => {
    if (disabled) return;

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!open) {
        openMenu();
      } else {
        closeMenu();
      }
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu({ restoreFocus: true });
      return;
    }

    if (event.key === 'Tab') {
      closeMenu();
      return;
    }

    if (totalSelectableItems === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % totalSelectableItems);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalSelectableItems) % totalSelectableItems);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (showClearOption && highlightedIndex === 0) {
        handleSelect('');
        return;
      }

      const optionIndex = showClearOption ? highlightedIndex - 1 : highlightedIndex;
      const picked = filteredOptions[optionIndex];
      if (picked) {
        handleSelect(picked.code);
      }
    }
  };

  const listboxId = id ? `${id}-listbox` : undefined;
  const searchId = id ? `${id}-search` : undefined;

  const hasClearButton = !required && Boolean(normalizedValue) && !disabled;

  return (
    <div
      ref={rootRef}
      className={`country-select country-select--${variant}${open ? ' country-select--open' : ''}${disabled ? ' country-select--disabled' : ''}${hasClearButton ? ' country-select--clearable' : ''}`}
    >
      <div className="country-select-control">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-label={ariaLabel}
          data-value={normalizedValue}
          disabled={disabled}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={handleTriggerKeyDown}
          className="country-select-trigger"
        >
          <span className={`country-select-value${!selectedLabel ? ' country-select-value--placeholder' : ''}`}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown
            size={16}
            className={`country-select-chevron${open ? ' country-select-chevron--rotated' : ''}`}
            aria-hidden="true"
          />
        </button>

        {hasClearButton && (
          <button
            type="button"
            className="country-select-clear-btn"
            onClick={handleClear}
            aria-label={clearLabel}
            title={clearLabel}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {open && (
        <div
          className={`country-select-popover${openUpward ? ' country-select-popover--upward' : ''}`}
        >
          <div className="country-select-search-wrap">
            <Search size={15} className="country-select-search-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              id={searchId}
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="country-select-search-input"
              autoComplete="off"
            />
          </div>

          <ul
            id={listboxId}
            role="listbox"
            className="country-select-listbox"
          >
            {showClearOption && (
              <li
                ref={(node) => {
                  optionRefs.current[0] = node;
                }}
                role="option"
                aria-selected={!normalizedValue}
                data-value=""
                onMouseEnter={() => setHighlightedIndex(0)}
                onClick={() => handleSelect('')}
                className={`country-select-option country-select-option--clear${highlightedIndex === 0 ? ' country-select-option--highlighted' : ''}`}
              >
                <span>{clearLabel}</span>
              </li>
            )}

            {filteredOptions.length === 0 ? (
              <li className="country-select-empty" role="presentation">
                {emptyText}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const itemIndex = showClearOption ? index + 1 : index;
                const optionLabel = option.name ?? option.nameAr ?? option.code;
                const isSelected = String(option.code).toUpperCase() === normalizedValue;
                const isHighlighted = highlightedIndex === itemIndex;

                return (
                  <li
                    key={option.code}
                    ref={(node) => {
                      optionRefs.current[itemIndex] = node;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    data-value={option.code}
                    onMouseEnter={() => setHighlightedIndex(itemIndex)}
                    onClick={() => handleSelect(option.code)}
                    className={`country-select-option${isSelected ? ' country-select-option--selected' : ''}${isHighlighted ? ' country-select-option--highlighted' : ''}`}
                  >
                    <span className="country-select-option-label">{optionLabel}</span>
                    <span className="country-select-option-meta">
                      <span className="country-select-option-code" dir="ltr">{option.code}</span>
                      {isSelected && <Check size={14} className="country-select-option-check" aria-hidden="true" />}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
