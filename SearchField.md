# Search Field Component (React + TailwindCSS)

This is a reusable search field (input + button) for React, styled with TailwindCSS. It triggers search only when the button is clicked.

```jsx
import { Search } from 'lucide-react';
import React, { useState } from 'react';

const SearchField = ({ onSearch }) => {
  const [searchInput, setSearchInput] = useState('');

  return (
    <div className="flex items-center gap-2 mb-4">
      <input
        type="text"
        placeholder="Search menu items..."
        value={searchInput}
        onChange={e => setSearchInput(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full max-w-xs"
      />
      <button
        onClick={() => onSearch(searchInput)}
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-xl hover:from-orange-600 hover:to-red-600 transition-all duration-300 flex items-center gap-2"
      >
        <Search size={18} />
        Search
      </button>
    </div>
  );
};

export default SearchField;
```

## Usage Example

```jsx
// ...existing code...
const [searchResults, setSearchResults] = useState(null);

const handleSearch = (query) => {
  if (!query.trim()) {
    setSearchResults(null);
  } else {
    setSearchResults(menuItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase())));
  }
};

<SearchField onSearch={handleSearch} />
// ...existing code...
```

- Place `<SearchField onSearch={handleSearch} />` above your menu grid.
- `searchResults` can be used to display filtered items.
