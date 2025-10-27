import React, { useState, useEffect } from 'react';
import UnifiedDashboard from '../results/UnifiedDashboard';
import templateData from '../../json_files/template.json';

const DemoPage = () => {
  const [extractedData, setExtractedData] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    // Load the extracted data
    fetch('/json_files/Investigations_Redacted_original_extracted.json')
      .then(res => res.json())
      .then(data => {
        console.log('Loaded extracted data:', data);
        setExtractedData(data);
      })
      .catch(err => console.error('Failed to load extracted data:', err));

    // Set a sample PDF URL if available
    // You can update this to point to an actual PDF file
    const samplePdfUrl = '/sample.pdf'; // Update with actual PDF path
    setPdfUrl(samplePdfUrl);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            TWIX Component Demo
          </h1>
          <p className="text-gray-600">
            This demo showcases all the TWIX components with cross-component linking:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-600 space-y-1">
            <li><strong>PDF Viewer:</strong> View and highlight PDF documents (react-pdf-highlighter)</li>
            <li><strong>Template Types:</strong> View extracted template structure with node types and fields</li>
            <li><strong>JSON Viewer:</strong> Interactive JSON explorer with syntax highlighting</li>
            <li><strong>Table Viewer:</strong> Sortable, filterable table view powered by TanStack Table</li>
            <li><strong>Cross-linking:</strong> Click any element to highlight related data across all views</li>
          </ul>
        </div>

        {extractedData ? (
          <UnifiedDashboard
            extractedData={extractedData}
            templateData={templateData}
            pdfUrl={pdfUrl}
          />
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading demo data...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoPage;
