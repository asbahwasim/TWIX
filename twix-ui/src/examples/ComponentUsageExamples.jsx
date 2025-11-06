/**
 * TWIX Component Usage Examples
 * 
 * This file demonstrates how to use the new TWIX components individually
 * or as part of the unified dashboard.
 */

import React from 'react';
import TemplateTypesViewer from '../components/template/TemplateTypesViewer';
import JSONViewer from '../components/results/JSONViewer';
import TableViewer from '../components/results/TableViewer';
import UnifiedDashboard from '../components/results/UnifiedDashboard';

// Example 1: Using Template Types Viewer
export const TemplateViewerExample = () => {
  const sampleTemplate = [
    {
      type: 'table',
      fields: ['Date', 'Number', 'Investigator'],
      bid: [0],
      child: -1,
      node_id: 0
    },
    {
      type: 'kv',
      fields: ['Name', 'Address', 'Phone'],
      bid: [1],
      child: -1,
      node_id: 1
    }
  ];

  const handleNodeClick = (node) => {
    console.log('Template node clicked:', node);
  };

  return (
    <TemplateTypesViewer
      template={sampleTemplate}
      onNodeClick={handleNodeClick}
      selectedNodeId={0}
    />
  );
};

// Example 2: Using JSON Viewer
export const JSONViewerExample = () => {
  const sampleData = {
    records: [
      {
        id: 0,
        content: [
          {
            type: 'table',
            content: [
              { Date: '1/27/2008', Number: '08-01', Investigator: 'John Doe' }
            ]
          }
        ]
      }
    ]
  };

  const handleItemClick = ({ path, key, value }) => {
    console.log('JSON item clicked:', { path, key, value });
  };

  return (
    <JSONViewer
      data={sampleData}
      onItemClick={handleItemClick}
      selectedPath="root.records[0]"
    />
  );
};

// Example 3: Using Table Viewer
export const TableViewerExample = () => {
  const sampleData = [
    {
      id: 0,
      content: [
        {
          type: 'table',
          content: [
            { Date: '1/27/2008', Number: '08-01', Status: 'Complete' },
            { Date: '1/28/2008', Number: '08-02', Status: 'Pending' },
            { Date: '1/29/2008', Number: '08-03', Status: 'Complete' }
          ]
        }
      ]
    }
  ];

  const handleCellClick = ({ value, column, row, cellKey }) => {
    console.log('Table cell clicked:', { value, column, row, cellKey });
  };

  return (
    <TableViewer
      data={sampleData}
      onCellClick={handleCellClick}
      selectedCell="record_0_0_Date"
    />
  );
};

// Example 4: Using Unified Dashboard (Recommended)
export const UnifiedDashboardExample = () => {
  const sampleExtractedData = [
    {
      id: 0,
      content: [
        {
          type: 'table',
          content: [
            { Date: '1/27/2008', Number: '08-01', Status: 'Complete' }
          ]
        },
        {
          type: 'kv',
          content: [
            { Name: 'John Doe' },
            { Address: '123 Main St' }
          ]
        }
      ]
    }
  ];

  const sampleTemplate = [
    {
      type: 'table',
      fields: ['Date', 'Number', 'Status'],
      bid: [0],
      child: -1,
      node_id: 0
    },
    {
      type: 'kv',
      fields: ['Name', 'Address'],
      bid: [1],
      child: -1,
      node_id: 1
    }
  ];

  const pdfUrl = '/path/to/sample.pdf'; // Replace with actual PDF URL

  return (
    <UnifiedDashboard
      extractedData={sampleExtractedData}
      templateData={sampleTemplate}
      pdfUrl={pdfUrl}
    />
  );
};

// Example 5: Integration in ProcessingStages
export const IntegrationExample = () => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Integration Example</h2>
      <p className="text-gray-700 mb-4">
        To integrate the unified dashboard into your existing TWIX workflow:
      </p>
      <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
{`// In ProcessingStages.jsx or your main component

import UnifiedDashboard from './components/results/UnifiedDashboard';

function MyComponent({ extractedData, templateData, files }) {
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Get PDF URL from uploaded files
  const pdfUrl = files && files.length > 0 
    ? URL.createObjectURL(files[0]) 
    : null;

  return (
    <div>
      <button onClick={() => setShowDashboard(!showDashboard)}>
        Toggle Dashboard
      </button>
      
      {showDashboard && (
        <UnifiedDashboard
          extractedData={extractedData}
          templateData={templateData}
          pdfUrl={pdfUrl}
        />
      )}
    </div>
  );
}`}
      </pre>
    </div>
  );
};

export default {
  TemplateViewerExample,
  JSONViewerExample,
  TableViewerExample,
  UnifiedDashboardExample,
  IntegrationExample
};
