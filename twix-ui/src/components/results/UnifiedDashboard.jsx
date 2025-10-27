import React, { useState } from 'react';
import TemplateTypesViewer from '../template/TemplateTypesViewer';
import JSONViewer from './JSONViewer';
import TableViewer from './TableViewer';
import PDFViewerWithHighlighter from '../pdf/PDFViewerWithHighlighter';

const UnifiedDashboard = ({ extractedData, templateData, pdfUrl }) => {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedJsonPath, setSelectedJsonPath] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedHighlightId, setSelectedHighlightId] = useState(null);
  const [highlights] = useState([]);
  const [activeView, setActiveView] = useState('split'); // 'split', 'pdf', 'data'

  // Cross-component linking: When a template node is clicked
  const handleTemplateNodeClick = (node) => {
    setSelectedNodeId(node.node_id);
    
    // Find corresponding data in JSON
    if (extractedData && Array.isArray(extractedData)) {
      extractedData.forEach((record, recordIndex) => {
        if (record.content && Array.isArray(record.content)) {
          record.content.forEach((item, itemIndex) => {
            if (item.type === node.type) {
              setSelectedJsonPath(`root[${recordIndex}].content[${itemIndex}]`);
            }
          });
        }
      });
    }
  };

  // Cross-component linking: When JSON item is clicked
  const handleJsonItemClick = ({ path, key, value }) => {
    setSelectedJsonPath(path);
    
    // If it's a table or kv type, highlight in template
    if (value && typeof value === 'object' && value.type) {
      const nodeId = templateData?.findIndex(node => node.type === value.type);
      if (nodeId !== -1) {
        setSelectedNodeId(nodeId);
      }
    }
  };

  // Cross-component linking: When table cell is clicked
  const handleTableCellClick = ({ value, column, row, cellKey }) => {
    setSelectedCell(cellKey);
    
    // Find the field in template
    if (templateData && Array.isArray(templateData)) {
      templateData.forEach((node) => {
        if (node.fields && node.fields.includes(column)) {
          setSelectedNodeId(node.node_id);
        }
      });
    }
    
    // Try to set corresponding JSON path
    setSelectedJsonPath(`root[${row._recordIndex}].content`);
  };

  // Cross-component linking: When PDF highlight is clicked
  const handlePdfHighlightClick = (highlight) => {
    setSelectedHighlightId(highlight.id);
    // Can be extended to link to specific table cells or JSON paths
  };

  const renderLayout = () => {
    switch (activeView) {
      case 'pdf':
        return (
          <div className="h-full relative">
            {pdfUrl ? (
              <div className="absolute inset-0">
                <PDFViewerWithHighlighter
                  pdfUrl={pdfUrl}
                  highlights={highlights}
                  onHighlightClick={handlePdfHighlightClick}
                  selectedHighlightId={selectedHighlightId}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
                <p className="text-gray-500">No PDF available</p>
              </div>
            )}
          </div>
        );
      
      case 'data':
        return (
          <div className="grid grid-cols-1 gap-6 overflow-auto">
            <TemplateTypesViewer
              template={templateData}
              onNodeClick={handleTemplateNodeClick}
              selectedNodeId={selectedNodeId}
            />
            <JSONViewer
              data={extractedData}
              onItemClick={handleJsonItemClick}
              selectedPath={selectedJsonPath}
            />
            <TableViewer
              data={extractedData}
              onCellClick={handleTableCellClick}
              selectedCell={selectedCell}
            />
          </div>
        );
      
      case 'split':
      default:
        return (
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="overflow-auto border rounded-lg relative">
              {pdfUrl ? (
                <div className="absolute inset-0">
                  <PDFViewerWithHighlighter
                    pdfUrl={pdfUrl}
                    highlights={highlights}
                    onHighlightClick={handlePdfHighlightClick}
                    selectedHighlightId={selectedHighlightId}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-100">
                  <p className="text-gray-500">No PDF available</p>
                </div>
              )}
            </div>
            <div className="overflow-auto space-y-4">
              <TemplateTypesViewer
                template={templateData}
                onNodeClick={handleTemplateNodeClick}
                selectedNodeId={selectedNodeId}
              />
              <JSONViewer
                data={extractedData}
                onItemClick={handleJsonItemClick}
                selectedPath={selectedJsonPath}
              />
              <TableViewer
                data={extractedData}
                onCellClick={handleTableCellClick}
                selectedCell={selectedCell}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">TWIX Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Interactive data extraction viewer with cross-component linking
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveView('split')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'split'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Split View
              </button>
              <button
                onClick={() => setActiveView('pdf')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'pdf'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                PDF Only
              </button>
              <button
                onClick={() => setActiveView('data')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'data'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Data Only
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {renderLayout()}
      </div>

      {/* Legend/Help Panel */}
      <div className="bg-white border-t px-6 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-200 rounded mr-2"></div>
              <span>Selected/Linked</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-100 rounded mr-2"></div>
              <span>Hover</span>
            </div>
          </div>
          <div className="text-xs">
            💡 Click on any element to highlight related data across all views
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard;
