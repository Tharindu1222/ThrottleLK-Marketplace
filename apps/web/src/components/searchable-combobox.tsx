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
  onQueryChange: (query: string) => void;
  onSelect: (option: ComboboxOption) => void;
  onClear?: () => void;
};

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
      <label className="mb-1.5 block text-sm text-muted" htmlFor={inputId}>
        {label}
        {required ? ' *' : ''}
      </label>
      <div className="relative">
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
          className="w-full bg-background px-3 py-2.5 pr-16 text-sm text-foreground outline-none ring-1 ring-white/10 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
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
        {valueId ? (
          <button
            type="button"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-xs text-muted underline hover:text-accent"
            onClick={() => {
              onClear?.();
              setQuery('');
              onQueryChange('');
              setOpen(false);
            }}
          >
            Clear
          </button>
        ) : null}
      </div>
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto border border-white/15 bg-background shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2.5 text-sm text-muted">Searching…</li>
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
                      ? 'bg-accent/15 text-accent'
                      : 'text-foreground hover:bg-white/5'
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
