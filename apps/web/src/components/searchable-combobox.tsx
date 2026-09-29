'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

export type ComboboxOption = {
  id: string;
  label: string;
  keywords?: string[];
};

type Props = {
  label: string;
  required?: boolean;
  placeholder: string;
  valueId: string;
  valueLabel: string;
  options: ComboboxOption[];
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  loadingText?: string;
  clearText?: string;
  onQueryChange: (query: string) => void;
  onSelect: (option: ComboboxOption) => void;
  onClear?: () => void;
};

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16.2 16.2 3.3 3.3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

export function SearchableCombobox({
  label,
  required,
  placeholder,
  valueId,
  valueLabel,
  options,
  disabled,
  loading,
  emptyText = 'No results found',
  loadingText = 'Searching…',
  clearText = 'Clear',
  onQueryChange,
  onSelect,
  onClear,
}: Props) {
  const listId = useId();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [options]);

  function commit(option: ComboboxOption) {
    onSelect(option);
    setQuery('');
    onQueryChange('');
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === 'Enter' && open && options[activeIndex]) {
      e.preventDefault();
      commit(options[activeIndex]!);
    }
  }

  const display = open ? query : valueLabel;

  return (
    <div ref={rootRef} className="relative text-left">
      <label
        className="mb-1.5 block text-sm font-semibold text-foreground"
        htmlFor={inputId}
      >
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-[#9ca3af]">
          <SearchIcon />
        </span>
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={display}
          className="h-12 w-full rounded-xl border border-[#d4d4d8] bg-white py-2.5 pr-16 pl-10 text-sm text-foreground outline-none transition placeholder:text-[#9ca3af] focus:border-accent/45 focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:bg-[#fafafa] disabled:opacity-60"
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery('');
            onQueryChange('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            onQueryChange(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="absolute top-1/2 right-3 z-[1] flex -translate-y-1/2 items-center gap-1">
          {valueId && onClear ? (
            <button
              type="button"
              aria-label={clearText}
              className="rounded p-0.5 text-[#9ca3af] transition hover:text-accent"
              onClick={() => {
                onClear();
                setQuery('');
                onQueryChange('');
                setOpen(false);
              }}
            >
              <ClearIcon />
            </button>
          ) : null}
          <span className="pointer-events-none text-[#9ca3af]">
            <ChevronIcon />
          </span>
        </div>
      </div>
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2.5 text-sm text-muted">{loadingText}</li>
          ) : options.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted">{emptyText}</li>
          ) : (
            options.map((opt, index) => {
              const active = index === activeIndex;
              const selected = opt.id === valueId;
              return (
                <li
                  key={opt.id}
                  role="option"
                  aria-selected={selected}
                  className={`cursor-pointer px-3 py-2.5 text-sm ${
                    active || selected
                      ? 'bg-accent/10 text-accent'
                      : 'text-foreground hover:bg-black/[0.03]'
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commit(opt)}
                >
                  {opt.label}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
