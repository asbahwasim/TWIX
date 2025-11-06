import React, { useState, useEffect } from 'react';
import Cost from '../processing/Cost';

const DataDisplay = ({ data, cost }) => {
  const [processedData, setProcessedData] = useState([]);
  const [templatedData, setTemplatedData] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [viewMode, setViewMode] = useState('sequential');

  useEffect(() => {
    if (!data) {
      setProcessedData([]);
      setTemplatedData(null);
      return;
    }

    try {
      // Process the data for both views
      let actualData = data.data || data;
      let processedJson = typeof actualData === 'string' ? JSON.parse(actualData) : actualData;
      
      // Set sequential data
      setProcessedData(processedJson);
      
      // Process template data
      const templates = {};
      if (Array.isArray(processedJson)) {
        processedJson.forEach(record => {
          if (record.content && Array.isArray(record.content)) {
            record.content.forEach(item => {
              if (item.type === 'table' && item.content && item.content.length > 0) {
                const signature = JSON.stringify(Object.keys(item.content[0]).sort());
                if (!templates[signature]) {
                  templates[signature] = [];
                }
                templates[signature].push(item);
              }
            });
          }
        });
      }
      setTemplatedData({ templates });
    } catch (error) {
      console.error('Error processing data:', error);
      setProcessedData([]);
      setTemplatedData(null);
    }
  }, [data]);

  const toggleDetails = (key) => {
    setExpandedDetails(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDownload = (type = 'extracted') => {
    try {
      let dataToDownload = type === 'extracted' ? processedData : templatedData;
      const filename = `${type}_data.json`;
      
      const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error("Failed to download data:", e);
    }
  };

  const renderTable = (content) => {
    if (!content || !Array.isArray(content) || content.length === 0) return null;
    
    const headers = Object.keys(content[0]);
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header} className="px-4 py-2 bg-gray-50 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {headers.map(header => (
                  <td key={`${rowIndex}-${header}`} className="px-4 py-2 border-b text-sm">
                    {row[header] || 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderTemplateView = () => {
    if (!templatedData || !templatedData.templates) return null;
    
    return Object.entries(templatedData.templates).map(([signature, items], index) => (
      <div key={signature} className="mb-8 bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Template {index + 1}</h3>
          <div className="text-sm text-gray-500 mt-1">
            Fields: {JSON.parse(signature).join(', ')}
          </div>
        </div>
        <div className="p-4">
          {items.map((item, itemIndex) => (
            <div key={itemIndex} className="mb-4">
              {renderTable(item.content)}
            </div>
          ))}
        </div>
      </div>
    ));
  };

  const renderSequentialView = () => {
    return processedData.map((record, recordIndex) => (
      <div key={`record-${recordIndex}`} className="mb-6 bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Record {recordIndex + 1}</h3>
        </div>
        <div className="p-4">
          {record.content && Array.isArray(record.content) && record.content.map((item, itemIndex) => (
            <div key={`content-${itemIndex}`} className="mb-4">
              {item.type === 'table' && renderTable(item.content)}
            </div>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold">Extracted Data</h2>
          <div className="view-toggle-controls ml-4">
            <div className="toggle-buttons">
              <button
                className={`toggle-btn ${viewMode === 'sequential' ? 'active' : ''}`}
                onClick={() => setViewMode('sequential')}
              >
                Sequential View
              </button>
              <button
                className={`toggle-btn ${viewMode === 'template' ? 'active' : ''}`}
                onClick={() => setViewMode('template')}
              >
                Template View
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => handleDownload('extracted')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            Download Extracted
          </button>
          <button
            onClick={() => handleDownload('aggregated')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
          >
            Download Aggregated
          </button>
        </div>
      </div>

      {cost && <Cost value={cost} />}

      <div className="space-y-6">
        {viewMode === 'sequential' ? renderSequentialView() : renderTemplateView()}
      </div>
    </div>
  );
};

export default DataDisplay;