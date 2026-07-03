import { MagnifyingGlassIcon } from '@phosphor-icons/react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher…' }: SearchInputProps) {
  return (
    <div className="flex items-center gap-2 px-3 h-9 w-56 border border-gray-200 rounded-lg bg-white">
      <MagnifyingGlassIcon size={14} className="text-gray-400 flex-shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 border-none outline-none bg-transparent text-sm text-gray-900 placeholder-gray-400"
      />
    </div>
  );
}