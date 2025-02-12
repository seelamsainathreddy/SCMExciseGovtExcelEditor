// src/Suggestions.tsx
import React, { useState } from 'react';
import '../index.css'; // Ensure you import your CSS file

interface SuggestionsProps {
  suggestions: string[];
  onSelect: (value: string) => void;
}

const Suggestions: React.FC<SuggestionsProps> = ({ suggestions, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredSuggestions = suggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container">
      <div className="suggestions">
        <input
          type="text"
          placeholder="Search suggestions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            padding: '10px',
            marginBottom: '10px',
            width: '100%',
            borderRadius: '5px',
            border: '1px solid #ccc'
          }}
        />
        <div
          className='data'
          style={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            padding: '10px',
            borderRadius: '4px',
            maxHeight: '60vh', // 3/4 of viewport minus space for search box
            overflowY: 'auto', // Enable vertical scroll
            width: '300px', // Fixed width for better appearance
            minHeight: '100px' // Minimum height even with few items
          }}
        >
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
            {filteredSuggestions.map((suggestion, index) => (
              <li 
                key={index} 
                style={{ padding: '5px 0', cursor: 'pointer' }}
                onClick={() => onSelect(suggestion)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Suggestions;