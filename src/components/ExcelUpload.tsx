/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/ExcelUpload.tsx
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import Suggestions from './Suggestions';
import allSuggestions from '../assets/Brand_Names_Govt.json';
import localCodeMap from '../assets/name_code_mapping.json';

const ExcelUpload: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionPosition, setSuggestionPosition] = useState<{ x: number; y: number } | null >(null);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{rowIndex: number; columnId: string} | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const binaryStr = e.target?.result;
      const workbook = XLSX.read(binaryStr, { type: 'binary' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];

      const cols = Object.keys(jsonData[0]).map((key) => ({
        Header: key,
        accessor: key,
      }));

      setColumns(cols);
      setData(jsonData);
    };

    reader.readAsBinaryString(file);
  };

  const handleCellClick = (brandName: string, event: React.MouseEvent<HTMLTableCellElement>, rowIndex: number, columnId: string) => {
    setSelectedCell({rowIndex, columnId});
    const suggestionsList = getSuggestions(brandName);
    console.log("suggestions : ", suggestionsList);
    setSuggestions(suggestionsList);
    setSuggestionPosition({ x: event.clientX, y: event.clientY });
    setIsSuggestionsVisible(true);
    console.log("variables after click", isSuggestionsVisible, suggestionPosition)
  };

  const handleOutsideClick = () => {
        // setIsSuggestionsVisible(false);
        // setSuggestions([]);
        // console.log("clicking outside box", isSuggestionsVisible, suggestionPosition)
  };

  const getSuggestions = (brandName: string): string[] => {
    return rankedSuggestions(allSuggestions, brandName);
  };

  const rankedSuggestions = (suggestions: string[], brandName: string): string[] => {
    // 1. Levenshtein Distance (Edit Distance)
    const levenshteinSimilarity = (a: string, b: string): number => {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          const cost = a[j-1] === b[i-1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i-1][j] + 1,    // deletion
            matrix[i][j-1] + 1,    // insertion
            matrix[i-1][j-1] + cost // substitution
          );
        }
      }
      const distance = matrix[b.length][a.length];
      return 1 - (distance / Math.max(a.length, b.length));
    };

    // 2. Jaro-Winkler Similarity (optimized for prefixes)
    const jaroWinkler = (a: string, b: string): number => {
      const [shorter, longer] = a.length < b.length ? [a, b] : [b, a];
      
      // Matching window size
      const matchWindow = Math.floor(Math.max(shorter.length / 2 - 1, 0));
      
      let matches = 0;
      let transpositions = 0;
      const matchesFlags = new Array(shorter.length).fill(false);
      
      for (let i = 0; i < longer.length; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, shorter.length);
        
        for (let j = start; j < end; j++) {
          if (!matchesFlags[j] && longer[i] === shorter[j]) {
            matchesFlags[j] = true;
            matches++;
            if (i !== j) transpositions++;
            break;
          }
        }
      }
      
      if (matches === 0) return 0;
      
      transpositions /= 2;
      const jaro = (
        (matches / a.length) +
        (matches / b.length) + 
        ((matches - transpositions) / matches)
      ) / 3;

      // Winkler boost for prefix matches (up to 4 characters)
      const prefixScale = 0.1;
      const prefixLimit = Math.min(4, a.length, b.length);
      let prefix = 0;
      
      while (prefix < prefixLimit && a[prefix] === b[prefix]) prefix++;
      
      return jaro + (prefix * prefixScale * (1 - jaro));
    };

    // Combine both metrics with weights
    const combinedScore = (a: string, b: string): number => {
      const jw = jaroWinkler(a, b);
      const ls = levenshteinSimilarity(a, b);
      return (jw * 0.6) + (ls * 0.4); // Adjust weights as needed
    };

    return suggestions
      .map(suggestion => ({
        suggestion,
        score: combinedScore(brandName.toLowerCase(), suggestion.toLowerCase())
      }))
      .sort((a, b) => b.score - a.score)// Threshold to filter poor matches
      .map(item => item.suggestion);
  };

  const handleSuggestionSelect = (selectedValue: string) => {
    if (!selectedCell) return;
    
    setData(prevData => 
      prevData.map((row, index) => {
        if (index === selectedCell.rowIndex) {
          // Get item code from localCodeMap
          const itemCode = localCodeMap[selectedValue as keyof typeof localCodeMap] || 'DEFAULT_CODE';
          
          return {
            ...row,
            [selectedCell.columnId]: selectedValue, // Update brand name
            'Local Item Code': itemCode // Update item code column
          };
        }
        return row;
      })
    );
    setIsSuggestionsVisible(false);
  };

  const handleDownload = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    
    // Create headers from columns
    const header = columns.map(col => col.Header);
    XLSX.utils.sheet_add_aoa(ws, [header], { origin: "A1" });

    // Generate Excel file
    XLSX.writeFile(wb, `brand_data_${new Date().toISOString()}.xlsx`);
  };

  return (
    <>

    <div style={{ marginBottom: '20px' }}>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
    </div>
    <div className='container' style={{ position: 'relative' }} onClick={handleOutsideClick}>
  
      <div className="data">
        {data.length > 0 && (
          <table style={{ marginTop: '20px', border: '1px solid black' }}>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.accessor} style={{ border: '1px solid black', padding: '10px' }}>
                    {col.Header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  {columns.map((col) => (
                    <td
                      key={col.accessor}
                      style={{ border: '1px solid black', padding: '10px' }}
                      onClick={(e) => col.accessor === 'Brand Name' && 
                        handleCellClick(row[col.accessor], e, index, col.accessor)}
                    >
                      {row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="suggestions">
      {isSuggestionsVisible && suggestionPosition && (
        <Suggestions 
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
        />
      )}

    </div>

    </div>

    {data.length > 0 && (
        <button 
        onClick={handleDownload}
        style={{
            marginLeft: '10px',
            marginTop: '10px',
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
        }}
        >
        Download Excel
        </button>
    )}
    </>
  );
};

export default ExcelUpload;