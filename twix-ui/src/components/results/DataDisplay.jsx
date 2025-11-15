import React, { useState, useEffect } from 'react';
import Cost from '../processing/Cost';
import SequentialView from './SequentialView';

const isRedactedValue = (val) => {
  if (val === null || val === undefined) return false;
  if (typeof val !== 'string') return false;
  const s = val.trim();
  if (!s) return false;
  // Patterns: XXXXX, XXXXXX (>=5 Xs), [REDACTED], REDACTED (case-insensitive)
  if (/^x{5,}$/i.test(s)) return true;
  if (/^\[?\s*redacted\s*\]?$/i.test(s)) return true;
  return false;
};

const DataDisplay = ({ data, cost, aggregatedTemplates, pdfFile, onCellSelect }) => {
  const [processedData, setProcessedData] = useState([]);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [originalOrderData, setOriginalOrderData] = useState([]);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState(0);
  const [viewMode, setViewMode] = useState('template'); // 'template' or 'sequential'

  useEffect(() => {
    // If the parent provided precomputed aggregated templates, prefer those
    if (aggregatedTemplates && Array.isArray(aggregatedTemplates) && aggregatedTemplates.length > 0) {
      try {
        const normalizedData = aggregatedTemplates.map((t, idx) => ({
          id: idx,
          templateId: t.templateId || t.key || `template_${idx}`,
          content: [{
            type: 'table',
            content: (Array.isArray(t.records) ? t.records : []).map(rec => {
              const normalizedRecord = {};
              (Array.isArray(t.fields) ? t.fields : Object.keys(rec)).forEach(field => {
                normalizedRecord[field] = (rec && rec[field] !== undefined) ? rec[field] : 'N/A';
              });
              return normalizedRecord;
            })
          }]
        }));
        setProcessedData(normalizedData);
        setSelectedTemplateIdx(0);
      } catch (e) {
        console.error('Failed to use aggregatedTemplates:', e);
      }
    }

    if (!data) {
      setProcessedData([]);
      setOriginalOrderData([]);
      return;
    }

    try {
      // Extract data from response
      let actualData = data;
      if (data.extractedData) actualData = data.extractedData;
      else if (data.data) actualData = data.data;
      else if (data.results) actualData = data.results;
      let processedJson = actualData;
      if (typeof actualData === 'string') {
        try { processedJson = JSON.parse(actualData); } catch (e) { return; }
      }
      if (!processedJson) {
        setProcessedData([]);
        setOriginalOrderData([]);
        return;
      }

      // New normalization: group table rows by header set and merge KV blocks across records into a single table
      let normalizedData = [];
      const templatesByHeader = new Map(); // key: sorted headers string -> { fields, records }

      // Accumulators for unified KV template
      const kvRows = []; // one row per record (merged kv)
      const kvFieldOrder = []; // preserve first-seen order
      const kvFieldSeen = new Set();

      if (processedJson.Investigations_Redacted_modified && Array.isArray(processedJson.Investigations_Redacted_modified)) {
        const records = processedJson.Investigations_Redacted_modified;

        records.forEach((record) => {
          if (!record || typeof record !== 'object' || !Array.isArray(record.content)) return;

          // 1) Collect table items and group by headers
          record.content
            .filter(item => item && item.type === 'table' && Array.isArray(item.content))
            .forEach(item => {
              item.content.forEach(row => {
                if (!row || typeof row !== 'object') return;
                const headers = Object.keys(row);
                const key = headers.sort().join(',');
                if (!templatesByHeader.has(key)) {
                  templatesByHeader.set(key, { fields: headers.slice(), records: [] });
                }
                // Ensure fields include any new headers (union + preserve original order where possible)
                const tpl = templatesByHeader.get(key);
                headers.forEach(h => { if (!tpl.fields.includes(h)) tpl.fields.push(h); });

                const normalizedRecord = {};
                tpl.fields.forEach(field => {
                  normalizedRecord[field] = (row && row[field] !== undefined) ? row[field] : 'N/A';
                });
                tpl.records.push(normalizedRecord);
              });
            });

          // 2) Merge all KV items in this record into a single row
          const kvItems = record.content.filter(item => item && item.type === 'kv');
          if (kvItems.length) {
            const merged = {};
            kvItems.forEach(kvItem => {
              const content = kvItem.content;
              if (Array.isArray(content)) {
                content.forEach(entry => {
                  if (entry && typeof entry === 'object') {
                    const keys = Object.keys(entry);
                    if (keys.length === 1) {
                      const k = keys[0];
                      merged[k] = entry[k];
                      if (!kvFieldSeen.has(k)) { kvFieldSeen.add(k); kvFieldOrder.push(k); }
                    } else {
                      // Multi-key object
                      keys.forEach(k => {
                        merged[k] = entry[k];
                        if (!kvFieldSeen.has(k)) { kvFieldSeen.add(k); kvFieldOrder.push(k); }
                      });
                    }
                  }
                });
              } else if (content && typeof content === 'object') {
                Object.keys(content).forEach(k => {
                  merged[k] = content[k];
                  if (!kvFieldSeen.has(k)) { kvFieldSeen.add(k); kvFieldOrder.push(k); }
                });
              }
            });
            // Push a row for this record if any kv fields found
            if (Object.keys(merged).length > 0) kvRows.push(merged);
          }
        });

        // Build template entries from grouped tables
        let templateIndex = 0;
        templatesByHeader.forEach((tpl) => {
          const fields = tpl.fields;
          const recordsArr = tpl.records.map(rec => {
            const r = {};
            fields.forEach(f => { r[f] = (rec && rec[f] !== undefined) ? rec[f] : 'N/A'; });
            return r;
          });
          normalizedData.push({ id: templateIndex++, templateId: fields.join(','), content: [{ type: 'table', content: recordsArr }] });
        });

        // Add unified KV template as a table (columns = kvFieldOrder, rows = kvRows normalized)
        if (kvRows.length > 0) {
          const kvRecords = kvRows.map(row => {
            const r = {};
            kvFieldOrder.forEach(k => { r[k] = (row && row[k] !== undefined) ? row[k] : 'N/A'; });
            return r;
          });
          normalizedData.push({ id: normalizedData.length, templateId: 'Unified KV', content: [{ type: 'table', content: kvRecords }] });
        }

        setProcessedData(normalizedData);
        setOriginalOrderData(records);
        setSelectedTemplateIdx(0);
      } else {
        setProcessedData([]);
        setOriginalOrderData([]);
      }
    } catch (e) {
      console.error('Template normalization failed:', e);
      setProcessedData([]);
      setOriginalOrderData([]);
    }
  }, [data, aggregatedTemplates]);

  const toggleDetails = (recordIndex) => {
    setExpandedDetails(prev => ({ ...prev, [recordIndex]: !prev[recordIndex] }));
  };

  const renderTableContent = (tableContent, recordIndex, itemIndex) => {
    if (!Array.isArray(tableContent) || tableContent.length === 0) {
      return <div>No table data available</div>;
    }

    // Use keys from first row for column order (fallback to union if needed)
    let columnOrder = Object.keys(tableContent[0] || {});
    if (columnOrder.length === 0) {
      const all = new Set();
      tableContent.forEach(r => { if (r && typeof r === 'object') Object.keys(r).forEach(k => all.add(k)); });
      columnOrder = Array.from(all);
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columnOrder.map((header) => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableContent.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                onDoubleClick={() => {
                  const firstKey = columnOrder.find(h => row[h] && String(row[h]).trim().length > 0);
                  const cellValue = firstKey ? row[firstKey] : '';
                  if (typeof onCellSelect === 'function') {
                    onCellSelect({ value: cellValue, rowIndex, columnKey: firstKey || (columnOrder[0] || ''), content: tableContent });
                  }
                }}
              >
                {columnOrder.map((column) => {
                  const value = row[column];
                  const displayValue = isRedactedValue(value) ? 'REDACTED' : (value || '');
                  return (
                    <td
                      key={column}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hover:bg-blue-50 cursor-pointer"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        const cellValue = row[column];
                        if (typeof onCellSelect === 'function') {
                          onCellSelect({ value: cellValue, rowIndex, columnKey: column, content: tableContent });
                        }
                      }}
                      onClick={() => {
                        const cellValue = row[column];
                        if (typeof onCellSelect === 'function') {
                          onCellSelect({ value: cellValue, rowIndex, columnKey: column, content: tableContent });
                        }
                      }}
                    >
                      {displayValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderKVContent = (kvContent) => {
    return (
      <div className="grid grid-cols-2 gap-4">
        {kvContent.filter(item => item.key && item.value).map((item, index) => (
          <React.Fragment key={index}>
            <div className="text-sm font-medium text-gray-500">{item.key.replace(/_/g, ' ')}</div>
            <div className="text-sm text-gray-900">{typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}</div>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const handleDownload = () => {
    try {
      if (!processedData || processedData.length === 0) {
        console.error('No data to download');
        return;
      }

      const dataToDownload = processedData.map(record => record.content);
      const filename = 'extracted_data.json';

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
      console.error('Failed to download data:', e);
    }
  };

  // If both views are empty, show no data
  if ((viewMode === 'template' && (!processedData || processedData.length === 0)) ||
      (viewMode === 'sequential' && (!originalOrderData || originalOrderData.length === 0))) {
    return <div className="text-gray-500">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Extracted Data</h2>
        </div>
        {/* Download button remains unchanged */}
        {processedData && processedData.length > 0 && (
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Data
          </button>
        )}
      </div>

      {/* Toggle for Sequential/Template View */}
      <div className="mb-6 flex items-center gap-4">
        <label className="font-medium text-gray-700">View Mode:</label>
        <button
          className={`px-3 py-1 rounded ${viewMode === 'template' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setViewMode('template')}
        >
          Template View
        </button>
        <button
          className={`px-3 py-1 rounded ${viewMode === 'sequential' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setViewMode('sequential')}
        >
          Sequential View
        </button>
      </div>

      {/* Template View: Dropdown and Table */}
      {viewMode === 'template' && (
        <>
          <div className="mb-6">
            <label htmlFor="template-select" className="mr-2 font-medium text-gray-700">Select Template:</label>
            <select
              id="template-select"
              value={selectedTemplateIdx}
              onChange={e => setSelectedTemplateIdx(Number(e.target.value))}
              className="px-2 py-1 border rounded"
            >
              {processedData.map((record, idx) => (
                <option key={record.templateId || idx} value={idx}>
                  {`Template ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
          {/* Only show the selected template's table */}
          {processedData[selectedTemplateIdx] && (
            <div key={`record-${selectedTemplateIdx}`} className="mb-10 pb-6 border-b border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {`Template ${selectedTemplateIdx + 1}`}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {Array.isArray(processedData[selectedTemplateIdx].content) && processedData[selectedTemplateIdx].content[0] && Array.isArray(processedData[selectedTemplateIdx].content[0].content)
                      ? `${processedData[selectedTemplateIdx].content[0].content.length} records found`
                      : ''}
                  </p>
                </div>
                <button 
                  onClick={() => setExpandedDetails(prev => ({ ...prev, [selectedTemplateIdx]: !prev[selectedTemplateIdx] }))}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                >
                  {expandedDetails[selectedTemplateIdx] ? 'Hide Details' : 'View Details'}
                  <svg className={`ml-1 h-4 w-4 transform ${expandedDetails[selectedTemplateIdx] ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {expandedDetails[selectedTemplateIdx] && (
                <div className="space-y-4">
                  {processedData[selectedTemplateIdx].content?.map((item, itemIndex) => (
                    <div key={`content-${selectedTemplateIdx}-${itemIndex}`} className="bg-white border rounded-lg shadow-sm">
                      <div className="p-4 bg-gray-50 border-b">
                        <h4 className="font-medium text-gray-700">
                          {item.type === 'table' ? 'Table Data' : 'Key-Value Data'}
                        </h4>
                      </div>
                      <div className="p-4">
                        {item.type === 'table' 
                          ? renderTableContent(item.content, selectedTemplateIdx, itemIndex) 
                          : renderKVContent(item.content)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Sequential View: Show extracted data in original order/hierarchy */}
      {viewMode === 'sequential' && (
        <SequentialView data={data} pdfFile={pdfFile} onCellSelect={onCellSelect} />
      )}

      {cost && <Cost cost={cost} />}
    </div>
  );
};

export default DataDisplay;