import React, { useState, useEffect } from 'react';
import Cost from '../processing/Cost';

const DataDisplay = ({ data, cost, aggregatedTemplates }) => {
  const [processedData, setProcessedData] = useState([]);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [originalOrder, setOriginalOrder] = useState({});

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

        setOriginalOrder(() => {
          const order = {};
          normalizedData.forEach((rec, recordIndex) => {
            if (rec?.content && rec.content[0] && Array.isArray(rec.content[0].content) && rec.content[0].content[0]) {
              order[`record_${recordIndex}_item_0`] = Object.keys(rec.content[0].content[0]);
            }
          });
          return order;
        });

        setProcessedData(normalizedData);
        return;
      } catch (e) {
        console.error('Failed to use aggregatedTemplates:', e);
        // fallthrough to normal processing
      }
    }
    if (!data) {
      console.log("No data provided");
      setProcessedData([]);
      return;
    }

    try {
      console.log("Data received:", data);
      
      // Extract data from response
      let actualData = data;
      
      // Check for nested data structures
      if (data.extractedData) {
        actualData = data.extractedData;
      } else if (data.data) {
        actualData = data.data;
      } else if (data.results) {
        actualData = data.results;
      }

      // Log the actual data for debugging
      console.log("Actual data after extraction:", actualData);

      // Handle string data
      let processedJson = actualData;
      if (typeof actualData === 'string') {
        try {
          processedJson = JSON.parse(actualData);
        } catch (e) {
          console.error("Failed to parse data string:", e);
          return;
        }
      }

      // Log the processed JSON for debugging
      console.log("Processed JSON before normalization:", processedJson);

      // Validate and normalize the data
      if (!processedJson) {
        console.error("No valid data found in the response");
        setProcessedData([]);
        return;
      }

      // Handle different data structures
      let normalizedData = [];
      let templates = new Map(); // Store unique templates
      
      if (processedJson.Investigations_Redacted_modified) {
        // Handle the specific Investigations_Redacted_modified data structure
        const records = processedJson.Investigations_Redacted_modified;
        if (Array.isArray(records)) {
            // First pass: Identify unique templates
            // Some records are wrappers that contain nested `content` arrays. We'll recursively
            // flatten such wrappers until we reach plain row objects (key/value maps) and
            // group those rows by their field keys.
            const flattenToRows = (node) => {
              const rows = [];
              if (!node) return rows;

              if (Array.isArray(node)) {
                node.forEach(n => rows.push(...flattenToRows(n)));
                return rows;
              }

              if (typeof node !== 'object') return rows;

              // If node has a content array, descend into its items
              if (Array.isArray(node.content) && node.content.length > 0) {
                node.content.forEach(child => {
                  rows.push(...flattenToRows(child));
                });
                return rows;
              }

              // If node itself looks like a table container: { type: 'table', content: [...] }
              if (node.type === 'table' && Array.isArray(node.content)) {
                node.content.forEach(child => rows.push(...flattenToRows(child)));
                return rows;
              }

              // Otherwise assume it's a plain row object (map of fields to values)
              rows.push(node);
              return rows;
            };

            records.forEach(record => {
              if (!record || typeof record !== 'object') return;
              const innerRows = flattenToRows(record);
              innerRows.forEach(innerRow => {
                if (!innerRow || typeof innerRow !== 'object') return;
                const keys = Object.keys(innerRow).sort().join(',');
                if (!templates.has(keys)) {
                  templates.set(keys, {
                    fields: keys.split(','),
                    records: []
                  });
                }
                templates.get(keys).records.push(innerRow);
              });
            });
          
          console.log("Identified templates:", templates);
          
          // Convert templates to normalized format
          normalizedData = Array.from(templates.entries()).map(([templateKey, template], index) => {
            const fields = template.fields;
            const records = template.records;
            
            return {
              id: index,
              templateId: templateKey,
              content: [{
                type: 'table',
                content: records.map(record => {
                  const normalizedRecord = {};
                  fields.forEach(field => {
                    normalizedRecord[field] = record[field] || 'N/A';
                  });
                  return normalizedRecord;
                })
              }]
            };
          });
        }
      } else if (Array.isArray(processedJson)) {
        // If it's an array, normalize each item
        normalizedData = processedJson
          .filter(record => record !== null && typeof record === 'object')
          .map((record, index) => ({
            id: index,
            content: [{
              type: 'table',
              content: [record]
            }]
          }));
      } else if (typeof processedJson === 'object') {
        // If it's an object, wrap it as a record
        normalizedData = [{
          id: 0,
          content: [{
            type: 'table',
            content: [processedJson]
          }]
        }];
      }

      console.log("Normalized data:", normalizedData);

      const orderMap = {};

      normalizedData.forEach((record, recordIndex) => {
        if (record?.content) {
          record.content.forEach((item, itemIndex) => {
            if (item?.type === 'table' && Array.isArray(item.content) && item.content[0]) {
              const itemKey = `record_${recordIndex}_item_${itemIndex}`;
              orderMap[itemKey] = Object.keys(item.content[0]);
            }
          });
        }
      });

      setOriginalOrder(orderMap);
      setProcessedData(normalizedData);
    } catch (error) {
      console.error("Error processing data:", error);
      setProcessedData([]);
    }
  }, [data]);

  const toggleDetails = (recordIndex) => {
    setExpandedDetails(prev => ({
      ...prev,
      [recordIndex]: !prev[recordIndex]
    }));
  };

  const renderTableContent = (tableContent, recordIndex, itemIndex) => {
    if (!Array.isArray(tableContent) || tableContent.length === 0) {
      return <div>No table data available</div>;
    }

    const itemKey = `record_${recordIndex}_item_${itemIndex}`;
    const columnOrder = originalOrder[itemKey] || Object.keys(tableContent[0]);

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columnOrder.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableContent.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columnOrder.map((column) => (
                  <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {row[column] || ''}
                  </td>
                ))}
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
            <div className="text-sm font-medium text-gray-500">
              {item.key.replace(/_/g, ' ')}
            </div>
            <div className="text-sm text-gray-900">
              {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  };

  const handleDownload = () => {
    try {
      if (!processedData || processedData.length === 0) {
        console.error("No data to download");
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
      console.error("Failed to download data:", e);
    }
  };

  if (!processedData || processedData.length === 0) {
    return <div className="text-gray-500">No data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Extracted Data</h2>
          {(!processedData || processedData.length === 0) && (
            <p className="text-sm text-gray-500 mt-1">No valid data available</p>
          )}
        </div>
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

      {processedData.map((record, recordIndex) => (
        <div key={`record-${recordIndex}`} className="mb-10 pb-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Template {record.id !== undefined ? record.id + 1 : recordIndex + 1}
              </h3>
              <p className="text-sm text-gray-500">
                {Array.isArray(record.content) && record.content[0] && Array.isArray(record.content[0].content)
                  ? `${record.content[0].content.length} records found`
                  : ''}
              </p>
            </div>
            <button 
              onClick={() => toggleDetails(recordIndex)}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              {expandedDetails[recordIndex] ? 'Hide Details' : 'View Details'}
              <svg className={`ml-1 h-4 w-4 transform ${expandedDetails[recordIndex] ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {expandedDetails[recordIndex] && (
            <div className="space-y-4">
              {record.content?.map((item, itemIndex) => (
                <div key={`content-${recordIndex}-${itemIndex}`} className="bg-white border rounded-lg shadow-sm">
                  <div className="p-4 bg-gray-50 border-b">
                    <h4 className="font-medium text-gray-700">
                      {item.type === 'table' ? 'Table Data' : 'Key-Value Data'}
                    </h4>
                  </div>
                  <div className="p-4">
                    {item.type === 'table' 
                      ? renderTableContent(item.content, recordIndex, itemIndex) 
                      : renderKVContent(item.content)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {cost && <Cost cost={cost} />}
    </div>
  );
};

export default DataDisplay;