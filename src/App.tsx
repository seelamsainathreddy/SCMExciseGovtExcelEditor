// src/App.tsx
import React from 'react';
import ExcelUpload from './components/ExcelUpload';

const App: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Excel File Upload and Display</h1>
      <ExcelUpload />
    </div>
  );
};

export default App;