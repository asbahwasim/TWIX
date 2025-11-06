import React from 'react';
import TemplateTypesViewer from './components/template/TemplateTypesViewer';
import JSONViewer from './components/results/JSONViewer';
import TableViewer from './components/results/TableViewer';
import templateData from './json_files/template.json';

// Simple test page to verify new components are loaded
function TestNewComponents() {
  const sampleData = [
    {
      id: 0,
      content: [
        {
          type: 'table',
          content: [
            { Name: 'Test', Date: '2024-01-01', Status: 'Active' }
          ]
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h1 className="text-3xl font-bold text-green-600 mb-2">
            ✅ New Components Loaded Successfully!
          </h1>
          <p className="text-gray-600">
            If you can see this page with the components below, the new code is working.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            To access the full dashboard: Upload a PDF → Process all stages → Click "🎯 Unified Dashboard"
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold mb-4">1. Template Types Viewer</h2>
            <TemplateTypesViewer template={templateData} />
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold mb-4">2. JSON Viewer</h2>
            <JSONViewer data={templateData} />
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-bold mb-4">3. Table Viewer</h2>
            <TableViewer data={sampleData} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TestNewComponents;
