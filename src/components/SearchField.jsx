
import { Search } from 'lucide-react';
import React from 'react';

const SearchField = ({ value, onChange, onSearch, placeholder = 'Search...' }) => {
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    // Trigger search dynamically on each keystroke if handler is provided
    if (onSearch) {
      onSearch(newValue);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 w-full">
      <div className="relative flex-1">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full text-black placeholder:text-gray-400"
        />
      </div>
      <button
        onClick={() => onSearch && onSearch(value)}
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 flex items-center justify-center gap-2 w-full sm:w-auto"
      >
        Search
      </button>
    </div>
  );
};

export default SearchField;
