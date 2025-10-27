import React, { useState } from 'react';

const JSONViewer = ({ data, onItemClick, selectedPath }) => {
  const [expandedPaths, setExpandedPaths] = useState(new Set(['root']));
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = (path) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const expandAll = () => {
    const allPaths = new Set();
    const collectPaths = (obj, currentPath = 'root') => {
      allPaths.add(currentPath);
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          const newPath = `${currentPath}.${key}`;
          collectPaths(obj[key], newPath);
        });
      }
    };
    collectPaths(data);
    setExpandedPaths(allPaths);
  };

  const collapseAll = () => {
    setExpandedPaths(new Set(['root']));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert('JSON copied to clipboard!');
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderValue = (value, path, key, depth = 0) => {
    const isExpanded = expandedPaths.has(path);
    const isSelected = selectedPath === path;
    const indent = depth * 16;

    const matchesSearch = searchTerm && 
      (String(key).toLowerCase().includes(searchTerm.toLowerCase()) || 
       String(value).toLowerCase().includes(searchTerm.toLowerCase()));

    if (value === null || value === undefined) {
      return (
        <div
          className={`py-1 px-2 rounded cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-yellow-100' : ''}`}
          style={{ paddingLeft: `${indent}px` }}
          onClick={() => onItemClick && onItemClick({ path, key, value })}
        >
          <span className="text-gray-600 font-medium">{key}:</span>{' '}
          <span className="text-gray-400 italic">null</span>
        </div>
      );
    }

    if (typeof value === 'object') {
      const isArray = Array.isArray(value);
      const itemCount = isArray ? value.length : Object.keys(value).length;
      
      return (
        <div style={{ paddingLeft: `${indent}px` }} className={matchesSearch ? 'bg-yellow-50' : ''}>
          <div
            className={`py-1 px-2 rounded cursor-pointer hover:bg-gray-100 flex items-center ${isSelected ? 'bg-yellow-100' : ''}`}
            onClick={() => {
              toggleExpand(path);
              onItemClick && onItemClick({ path, key, value });
            }}
          >
            <span className="mr-1 text-gray-500">
              {isExpanded ? '▼' : '▶'}
            </span>
            <span className="text-blue-600 font-medium">{key}:</span>{' '}
            <span className="text-gray-500 text-sm ml-1">
              {isArray ? `[${itemCount}]` : `{${itemCount}}`}
            </span>
          </div>
          {isExpanded && (
            <div className="border-l-2 border-gray-200 ml-2">
              {isArray
                ? value.map((item, index) => (
                    <React.Fragment key={index}>
                      {renderValue(item, `${path}[${index}]`, index, depth + 1)}
                    </React.Fragment>
                  ))
                : Object.entries(value).map(([k, v]) => (
                    <React.Fragment key={k}>
                      {renderValue(v, `${path}.${k}`, k, depth + 1)}
                    </React.Fragment>
                  ))}
            </div>
          )}
        </div>
      );
    }

    // Primitive values
    const getValueColor = () => {
      if (typeof value === 'string') return 'text-green-600';
      if (typeof value === 'number') return 'text-blue-600';
      if (typeof value === 'boolean') return 'text-purple-600';
      return 'text-gray-800';
    };

    return (
      <div
        className={`py-1 px-2 rounded cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-yellow-100' : ''} ${matchesSearch ? 'bg-yellow-50' : ''}`}
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => onItemClick && onItemClick({ path, key, value })}
      >
        <span className="text-gray-600 font-medium">{key}:</span>{' '}
        <span className={getValueColor()}>
          {typeof value === 'string' ? `"${value}"` : String(value)}
        </span>
      </div>
    );
  };

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <p>No JSON data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="border-b p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-2">📄</span>
          JSON Viewer
        </h3>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={expandAll}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Collapse All
          </button>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            title="Copy to Clipboard"
          >
            📋
          </button>
          <button
            onClick={downloadJSON}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            title="Download JSON"
          >
            ⬇️
          </button>
        </div>
      </div>
      <div className="p-4 overflow-auto max-h-[600px] font-mono text-sm">
        {renderValue(data, 'root', 'root', 0)}
      </div>
    </div>
  );
};

export default JSONViewer;
