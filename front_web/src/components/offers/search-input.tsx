import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";

interface SearchInputProps {
  value: string;
  setValue: (value: string) => void;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({
  value,
  setValue,
  onChange,
  placeholder = "Rechercher…",
}: SearchInputProps) {
  return (
    <div className="flex items-center gap-2 px-3 h-9 w-full sm:w-56 border border-gray-200 rounded-lg bg-white">
      <MagnifyingGlassIcon size={14} className="text-gray-400 flex-shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 border-none outline-none bg-transparent text-sm text-gray-900 placeholder-gray-400"
      />
      {value && (
        <button
          onClick={() => setValue("")}
          className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Effacer la recherche"
        >
          <XIcon size={12} weight="bold" />
        </button>
      )}
    </div>
  );
}