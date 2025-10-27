import React from 'react';

const TemplateTypesViewer = ({ template, onNodeClick, selectedNodeId }) => {
  if (!template || !Array.isArray(template) || template.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <p>No template data available</p>
      </div>
    );
  }

  const getNodeColor = (type) => {
    return type === 'table' 
      ? 'bg-blue-50 border-blue-300 hover:bg-blue-100'
      : 'bg-green-50 border-green-300 hover:bg-green-100';
  };

  const getNodeIcon = (type) => {
    return type === 'table' ? '📊' : '🔑';
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <span className="mr-2">📋</span>
        Template Structure
      </h3>
      <div className="space-y-3">
        {template.map((node, index) => {
          const isSelected = selectedNodeId === node.node_id;
          return (
            <div
              key={node.node_id || index}
              onClick={() => onNodeClick && onNodeClick(node)}
              className={`
                border-2 rounded-lg p-4 cursor-pointer transition-all
                ${getNodeColor(node.type)}
                ${isSelected ? 'ring-2 ring-offset-2 ring-blue-500 shadow-lg' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-2">{getNodeIcon(node.type)}</span>
                    <div>
                      <h4 className="font-semibold text-gray-800">
                        Node {node.node_id !== undefined ? node.node_id : index}
                      </h4>
                      <p className="text-xs text-gray-600 uppercase font-medium">
                        {node.type === 'table' ? 'Table' : 'Key-Value'}
                      </p>
                    </div>
                  </div>
                  
                  {node.fields && node.fields.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">
                        Fields ({node.fields.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {node.fields.map((field, fieldIndex) => (
                          <span
                            key={fieldIndex}
                            className="inline-block px-2 py-1 text-xs rounded bg-white border border-gray-300 text-gray-700"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {node.bid && node.bid.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Block ID: {node.bid.join(', ')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateTypesViewer;
