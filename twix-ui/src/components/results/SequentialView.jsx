import { useState, useEffect } from 'react';

const isRedactedValue = (val) => {
  if (val === null || val === undefined) return false;
  if (typeof val !== 'string') return false;
  const s = val.trim();
  if (!s) return false;
  if (/^x{5,}$/i.test(s)) return true; // XXXXX or more
  if (/^\[?\s*redacted\s*\]?$/i.test(s)) return true; // [REDACTED] or REDACTED
  return false;
};

const SequentialView = ({ data, pdfFile, onCellSelect }) => {
  const [processedData, setProcessedData] = useState([]);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [originalOrder, setOriginalOrder] = useState({});
  const [selectedRecordIdx, setSelectedRecordIdx] = useState(0);

  // Normalize incoming data to [{ id, content: [...] }]
  useEffect(() => {
    if (!data) {
      setProcessedData([]);
      setSelectedRecordIdx(0);
      return;
    }

    try {
      let actualData = data;
      if (data.data) actualData = data.data;

      let processedJson = actualData;
      if (typeof actualData === 'string') {
        try { processedJson = JSON.parse(actualData); } catch {}
      }

      let normalizedData = [];
      const orderMap = {};

      const captureTableFieldOrder = (item, itemIdx, recordIdx) => {
        if (item && item.type === 'table' && Array.isArray(item.content) && item.content.length > 0) {
          const itemKey = `record_${recordIdx}_item_${itemIdx}`;
          const firstRow = item.content[0];
          if (firstRow && typeof firstRow === 'object') {
            orderMap[itemKey] = Object.keys(firstRow);
          }
        }
      };

      const extractDataArrays = (obj) => {
        if (obj === null || typeof obj !== 'object') return [];

        if (Array.isArray(obj) && obj.length > 0 && obj.some(item => 'id' in item && 'content' in item)) {
          const hasTypeStructure = obj.some(item => item.content && Array.isArray(item.content) && item.content.some(ci => ci && typeof ci === 'object' && (ci.type === 'table' || ci.type === 'kv')));
          if (hasTypeStructure) return obj;
        }

        if (Array.isArray(obj) && obj.length > 0 && obj.some(item => 'type' in item && 'content' in item) && obj.some(item => item.type === 'table' || item.type === 'kv')) {
          return [{ id: 0, content: obj }];
        }

        let results = [];
        if (Array.isArray(obj)) {
          for (let i = 0; i < obj.length; i++) {
            const found = extractDataArrays(obj[i]);
            if (found.length) results = results.concat(found);
          }
        } else {
          for (const key in obj) {
            const found = extractDataArrays(obj[key]);
            if (found.length) results = results.concat(found);
          }
        }
        return results;
      };

      const extractedArrays = extractDataArrays(processedJson);
      if (extractedArrays.length > 0) {
        normalizedData = extractedArrays;
        normalizedData.forEach((record, recordIdx) => {
          if (Array.isArray(record.content)) {
            record.content.forEach((item, itemIdx) => {
              captureTableFieldOrder(item, itemIdx, recordIdx);
            });
          }
        });
      } else if (Array.isArray(processedJson) && processedJson.length > 0 && processedJson.some(it => 'id' in it && 'content' in it)) {
        normalizedData = processedJson;
        processedJson.forEach((record, recordIdx) => {
          if (Array.isArray(record.content)) {
            record.content.forEach((item, itemIdx) => {
              captureTableFieldOrder(item, itemIdx, recordIdx);
            });
          }
        });
      } else if (Array.isArray(processedJson) && processedJson.length > 0 && processedJson.some(it => 'type' in it && 'content' in it)) {
        normalizedData = [{ id: 0, content: processedJson }];
        processedJson.forEach((item, itemIdx) => {
          captureTableFieldOrder(item, itemIdx, 0);
        });
      } else if (processedJson && processedJson.data_file && Array.isArray(processedJson.data_file)) {
        if (processedJson.data_file.some(it => 'id' in it && 'content' in it)) {
          normalizedData = processedJson.data_file;
          processedJson.data_file.forEach((record, recordIdx) => {
            if (Array.isArray(record.content)) {
              record.content.forEach((item, itemIdx) => {
                captureTableFieldOrder(item, itemIdx, recordIdx);
              });
            }
          });
        } else if (processedJson.data_file.some(it => 'type' in it && 'content' in it)) {
          normalizedData = [{ id: 0, content: processedJson.data_file }];
          processedJson.data_file.forEach((item, itemIdx) => {
            captureTableFieldOrder(item, itemIdx, 0);
          });
        }
      } else if (processedJson && processedJson.Investigations_Redacted_modified && Array.isArray(processedJson.Investigations_Redacted_modified)) {
        normalizedData = processedJson.Investigations_Redacted_modified.map((item, index) => {
          const content = item.content || [item];
          return { id: index, content: Array.isArray(content) ? content : [content] };
        });
        processedJson.Investigations_Redacted_modified.forEach((item, recordIdx) => {
          if (Array.isArray(item.content)) {
            item.content.forEach((contentItem, itemIdx) => {
              captureTableFieldOrder(contentItem, itemIdx, recordIdx);
            });
          }
        });
      }

      setProcessedData(normalizedData);
      setOriginalOrder(orderMap);
      setSelectedRecordIdx(idx => (normalizedData.length ? Math.min(Math.max(0, idx), normalizedData.length - 1) : 0));

      const initialExpandedState = {};
      normalizedData.forEach((record, recordIndex) => {
        initialExpandedState[`record_${recordIndex}`] = false;
        if (record.content) {
          record.content.forEach((item, itemIndex) => {
            initialExpandedState[`section_${recordIndex}_${itemIndex}`] = false;
          });
        }
      });
      setExpandedDetails(initialExpandedState);
    } catch (error) {
      console.error('Error processing data:', error);
      setProcessedData([]);
    }
  }, [data]);

  const toggleDetails = (key) => {
    setExpandedDetails(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderValue = (value) => {
    if (value === null || value === undefined || value === 'missing') {
      return <span className="text-gray-400 italic">missing</span>;
    }
    if (isRedactedValue(value)) return <span className="text-gray-900">REDACTED</span>;
    if (value === 'N/A') return <span className="text-gray-400">N/A</span>;
    if (value === 'Not Stated') return <span className="text-gray-500">Not Stated</span>;

    if (typeof value === 'object') {
      return (
        <details className="cursor-pointer">
          <summary className="text-blue-600 hover:text-blue-800">View Details</summary>
          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-60">{JSON.stringify(value, null, 2)}</pre>
        </details>
      );
    }
    if (typeof value === 'string' && value.includes('(cid:')) return <span className="text-gray-500">{value}</span>;
    if (typeof value === 'string' && value.match(/^https?:\/\//i)) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">{value}</a>
      );
    }
    return String(value);
  };

  // Table renderer with click/double-click hooks for PDF highlight
  const renderTable = (tableData, tableIndex, recordIndex) => {
    if (!Array.isArray(tableData) || tableData.length === 0) {
      return <p className="text-gray-500 italic">No table data available</p>;
    }
    const itemKey = `record_${recordIndex}_item_${tableIndex}`;
    let headers = originalOrder[itemKey] || [];
    if (!headers.length && tableData.length > 0 && typeof tableData[0] === 'object') headers = Object.keys(tableData[0]);
    if (!headers.length) {
      const all = new Set();
      tableData.forEach(r => { if (r && typeof r === 'object') Object.keys(r).forEach(k => all.add(k)); });
      headers = Array.from(all);
    }

    return (
      <div className="overflow-x-auto border rounded-lg shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((h, idx) => (
                <th key={`h-${idx}`} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((row, rowIndex) => (
              <tr
                key={`row-${rowIndex}`}
                className="hover:bg-gray-50"
                onDoubleClick={() => {
                  const firstKey = headers.find(h => row[h] && String(row[h]).trim().length > 0);
                  const cellValue = firstKey ? row[firstKey] : '';
                  if (onCellSelect) onCellSelect({ value: cellValue, rowIndex, columnKey: firstKey || (headers[0] || ''), content: tableData });
                }}
              >
                {headers.map((header, cellIndex) => {
                  const cellVal = row[header];
                  const displayVal = isRedactedValue(cellVal) ? 'REDACTED' : cellVal;
                  return (
                    <td
                      key={`cell-${rowIndex}-${cellIndex}`}
                      className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 hover:bg-blue-50 cursor-pointer"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        const cellValue = row[header];
                        if (onCellSelect) onCellSelect({ value: cellValue, rowIndex, columnKey: header, content: tableData });
                      }}
                      onClick={() => {
                        const cellValue = row[header];
                        if (onCellSelect) onCellSelect({ value: cellValue, rowIndex, columnKey: header, content: tableData });
                      }}
                    >
                      {displayVal !== undefined ? renderValue(displayVal) : <span className="text-gray-400 italic">missing</span>}
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

  const renderKeyValuePairs = (data, itemIndex, recordIndex) => {
    if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return <p className="text-gray-500 italic">No key-value data available</p>;
    }

    const itemKey = `record_${recordIndex}_item_${itemIndex}`;
    const orderedKeys = originalOrder[itemKey] || [];

    let keyValuePairs = [];
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (typeof item === 'object' && item !== null) {
          const keys = Object.keys(item);
          if (keys.length === 1) keyValuePairs.push({ key: keys[0], value: item[keys[0]] });
        }
      });
    } else if (typeof data === 'object') {
      if (orderedKeys.length > 0) keyValuePairs = orderedKeys.map(key => ({ key, value: data[key] }));
      else keyValuePairs = Object.entries(data).map(([key, value]) => ({ key, value }));
    }

    return (
      <div className="bg-white border rounded-lg shadow-sm p-4">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
          {keyValuePairs.map((pair, index) => {
            const redacted = isRedactedValue(pair.value);
            return (
              <div key={`kv-${index}`} className="py-2 border-b">
                <dt className="text-sm font-medium text-gray-500">{pair.key}</dt>
                <dd className="mt-1 text-sm text-gray-900 break-words">
                  {redacted ? (
                    <pre className="text-xs bg-gray-50 p-2 rounded border">
{`{\n  "${pair.key}": null,\n  "meta": { "redacted": true }\n}`}
                    </pre>
                  ) : (
                    renderValue(pair.value)
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    );
  };

  const renderContent = (content, recordIndex) => {
    return content.map((item, itemIndex) => {
      if (!item || typeof item !== 'object' || !('type' in item) || !('content' in item)) {
        return (
          <div key={`invalid-content-${recordIndex}-${itemIndex}`} className="p-4 border border-yellow-300 bg-yellow-50 rounded-md mb-4">
            <p className="text-yellow-700">Invalid content format</p>
            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">{typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}</pre>
          </div>
        );
      }

      const sectionKey = `section_${recordIndex}_${itemIndex}`;
      const isExpanded = expandedDetails[sectionKey] || false;

      return (
        <div key={`content-${recordIndex}-${itemIndex}`} className="mb-6">
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
              <h4 className="font-medium text-gray-700">{item.type === 'table' ? 'Table Data' : 'Key-Value Data'}</h4>
              <button onClick={() => toggleDetails(sectionKey)} className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                {isExpanded ? 'Hide Details' : 'View Details'}
                <svg className={`ml-1 h-4 w-4 transform ${isExpanded ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className={`transition-all duration-300 ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
              <div className="p-3 bg-gray-100">
                <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-60">{JSON.stringify(item.content, null, 2)}</pre>
              </div>
            </div>
            <div className="p-4">
              {item.type === 'table' ? renderTable(item.content, itemIndex, recordIndex) : renderKeyValuePairs(item.content, itemIndex, recordIndex)}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-4">
      {processedData && processedData.length > 1 && (
        <div className="flex items-center gap-3 mb-2">
          <label className="font-medium text-gray-700">Select Record:</label>
          <select className="px-2 py-1 border rounded" value={selectedRecordIdx} onChange={(e) => setSelectedRecordIdx(Number(e.target.value))}>
            {processedData.map((rec, idx) => (
              <option key={`rec-opt-${idx}`} value={idx}>{`Record ${idx + 1}${rec?.id !== undefined ? ` (id: ${rec.id})` : ''}`}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={selectedRecordIdx <= 0} onClick={() => setSelectedRecordIdx(i => Math.max(0, i - 1))}>← Prev</button>
            <button className="px-2 py-1 text-sm border rounded disabled:opacity-50" disabled={selectedRecordIdx >= processedData.length - 1} onClick={() => setSelectedRecordIdx(i => Math.min(processedData.length - 1, i + 1))}>Next →</button>
          </div>
        </div>
      )}

      {processedData && processedData.length > 0 && (() => {
        const recordIndex = selectedRecordIdx;
        const record = processedData[recordIndex];
        if (!record || typeof record !== 'object' || !('content' in record)) {
          return (
            <div key={`invalid-record-${recordIndex}`} className="p-4 border border-yellow-300 bg-yellow-50 rounded-md mb-4">
              <p className="text-yellow-700">Invalid record format at index {recordIndex}</p>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">{typeof record === 'object' ? JSON.stringify(record, null, 2) : String(record)}</pre>
            </div>
          );
        }

        const recordKey = `record_${recordIndex}`;
        const isExpanded = expandedDetails[recordKey] || false;

        return (
          <div key={`record-${recordIndex}`} className="mb-10 pb-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Record: {record.id !== undefined ? record.id : recordIndex + 1}</h3>
              <button onClick={() => toggleDetails(recordKey)} className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                {isExpanded ? 'Hide Details' : 'View Details'}
                <svg className={`ml-1 h-4 w-4 transform ${isExpanded ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className={`transition-all duration-300 mb-6 ${isExpanded ? 'opacity-100 block' : 'opacity-0 hidden'}`}>
              <div className="bg-gray-100 rounded p-3">
                <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-60">{JSON.stringify(record, null, 2)}</pre>
              </div>
            </div>

            {Array.isArray(record.content) ? (
              renderContent(record.content, recordIndex)
            ) : (
              <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md mb-4">
                <p className="text-yellow-700">Content is not an array</p>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">{typeof record.content === 'object' ? JSON.stringify(record.content, null, 2) : String(record.content)}</pre>
              </div>
            )}
          </div>
        );
      })()}

      {/* Bottom embedded viewer removed; highlighting now happens in the left pane */}
    </div>
  );
};

export default SequentialView;