import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const EnhancedPDFTableLinker = ({ pdfFile, boundingBoxData, tableData }) => {
  console.log('=== EnhancedPDFTableLinker RENDERED ===');
  console.log('pdfFile:', pdfFile);
  console.log('boundingBoxData:', boundingBoxData);
  console.log('boundingBoxData type:', typeof boundingBoxData);
  console.log('boundingBoxData is array?:', Array.isArray(boundingBoxData));
  console.log('boundingBoxData length:', boundingBoxData?.length);
  console.log('tableData length:', tableData?.length);
  
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [selectedText, setSelectedText] = useState(null);
  const [matchingRows, setMatchingRows] = useState([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [highlightedCell, setHighlightedCell] = useState(null);
  const [pdfHighlights, setPdfHighlights] = useState([]);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  const tableRef = useRef(null);
  const pdfContainerRef = useRef(null);

  // Log when PDF loads
  const handlePDFLoad = ({ numPages }) => {
    console.log('PDF loaded with', numPages, 'pages');
    setNumPages(numPages);
    setPdfLoaded(true);
  };

  // Parse bounding box data into searchable format
  const parsedBoundingBoxes = React.useMemo(() => {
    if (!boundingBoxData || !Array.isArray(boundingBoxData)) {
      console.warn('No bounding box data available or not an array', boundingBoxData);
      return [];
    }
    
    console.log('Parsing', boundingBoxData.length, 'bounding boxes');
    console.log('Raw bounding box data sample:', boundingBoxData.slice(0, 2));
    
    const parsed = boundingBoxData
      .map((item, index) => {
        const bbox = {
          text: item.text || item[0] || '',  // Try item.text or first element
          x0: parseFloat(item.x0 || item[1]),
          y0: parseFloat(item.y0 || item[2]),
          x1: parseFloat(item.x1 || item[3]),
          y1: parseFloat(item.y1 || item[4]),
          page: parseInt(item.page || item[5]) || 1
        };
        
        // Log first few for debugging
        if (index < 5) {
          console.log(`Bounding box ${index}:`, bbox, 'from raw:', item);
        }
        
        return bbox;
      });
    
    console.log('Before filtering:', parsed.length, 'boxes');
    
    // Filter out invalid bounding boxes
    const filtered = parsed.filter((bbox, index) => {
      const isValid = 
        bbox.text.trim().length > 0 &&  // Has text
        !isNaN(bbox.x0) && !isNaN(bbox.y0) && !isNaN(bbox.x1) && !isNaN(bbox.y1) && // Valid coordinates
        bbox.x0 >= 0 && bbox.y0 >= 0 &&  // Positive coordinates
        bbox.x1 > bbox.x0 && bbox.y1 > bbox.y0;  // Valid dimensions
      
      // Log why first invalid box is invalid
      if (!isValid && index < 5) {
        console.log(`Box ${index} is invalid:`, {
          hasText: bbox.text.trim().length > 0,
          validCoords: !isNaN(bbox.x0) && !isNaN(bbox.y0) && !isNaN(bbox.x1) && !isNaN(bbox.y1),
          positiveCoords: bbox.x0 >= 0 && bbox.y0 >= 0,
          validDimensions: bbox.x1 > bbox.x0 && bbox.y1 > bbox.y0,
          bbox
        });
      }
      
      return isValid;
    });
    
    console.log('Valid bounding boxes after filtering:', filtered.length);
    if (filtered.length > 0) {
      console.log('Sample of unique texts:', [...new Set(filtered.slice(0, 20).map(b => b.text))]);
      console.log('First valid box:', filtered[0]);
    } else {
      console.error('NO VALID BOUNDING BOXES! All were filtered out.');
    }
    
    return filtered;
  }, [boundingBoxData]);

  // Find matching rows in table based on selected text
  const findMatchingRows = (searchText) => {
    if (!tableData || !searchText) return [];
    
    const matches = [];
    tableData.forEach((row, rowIndex) => {
      Object.entries(row).forEach(([key, value]) => {
        if (String(value).toLowerCase().includes(searchText.toLowerCase())) {
          matches.push({
            rowIndex,
            columnKey: key,
            value,
            row
          });
        }
      });
    });
    
    return matches;
  };

  // Find bounding boxes for a specific text
  const findBoundingBoxesForText = (searchText) => {
    if (!searchText || !parsedBoundingBoxes.length) {
      console.log('No search text or no bounding boxes available');
      return [];
    }
    
    const searchLower = String(searchText).toLowerCase().trim();
    console.log('Searching bounding boxes for:', searchLower);
    console.log('Total bounding boxes available:', parsedBoundingBoxes.length);
    
    // Skip if search text is too short
    if (searchLower.length === 0) {
      console.log('Search text is empty');
      return [];
    }
    
    // First try exact match
    let matches = parsedBoundingBoxes.filter(bbox => 
      bbox.text.toLowerCase().trim() === searchLower
    );
    
    console.log('Exact matches found:', matches.length);
    
    // If no exact match, try contains (but both must have content)
    if (matches.length === 0) {
      matches = parsedBoundingBoxes.filter(bbox => {
        const bboxLower = bbox.text.toLowerCase().trim();
        
        // Skip empty bounding box text
        if (bboxLower.length === 0) return false;
        
        // Only match if there's actual overlap
        // Either bbox text contains search, or search contains bbox text
        // But require minimum 2 characters for match
        if (bboxLower.length >= 2 && searchLower.includes(bboxLower)) {
          return true;
        }
        if (searchLower.length >= 2 && bboxLower.includes(searchLower)) {
          return true;
        }
        
        return false;
      });
      console.log('Partial matches found:', matches.length);
    }
    
    // Log first few matches for debugging
    if (matches.length > 0) {
      console.log('First match:', matches[0]);
      if (matches.length > 1) {
        console.log('Second match:', matches[1]);
      }
    } else {
      console.warn('No matches found! Try searching for individual words.');
    }
    
    return matches;
  };

  // Handle text selection in PDF
  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    console.log('Text selected in PDF:', text);

    if (text) {
      setSelectedText(text);
      const matches = findMatchingRows(text);
      const bboxes = findBoundingBoxesForText(text);

      console.log('Found', matches.length, 'matching rows');
      console.log('Found', bboxes.length, 'bounding boxes');

      setMatchingRows(matches);
      setPdfHighlights(bboxes);
      setCurrentMatchIndex(0);

      // Scroll to first match in table
      if (matches.length > 0) {
        scrollToTableRow(matches[0].rowIndex);
      }
    }
  };

  // Handle double-click on table cell
  const handleCellDoubleClick = (cellValue, rowIndex, columnKey) => {
    console.log('=== CELL DOUBLE-CLICKED ===');
    console.log('Cell value:', cellValue);
    console.log('Row index:', rowIndex);
    console.log('Column key:', columnKey);
    
    const searchText = String(cellValue);
    setSelectedText(searchText);
    setHighlightedCell(`${rowIndex}_${columnKey}`);
    
    // Find in PDF
    const bboxes = findBoundingBoxesForText(searchText);
    console.log('Found', bboxes.length, 'bounding boxes for this cell');
    setPdfHighlights(bboxes);
    
    if (bboxes.length > 0) {
      // Jump to first occurrence in PDF
      const firstMatch = bboxes[0];
      console.log('Navigating to first match:', firstMatch);
      setPageNumber(firstMatch.page);
      
      // Scroll to location
      setTimeout(() => {
        scrollToPDFHighlight(firstMatch);
      }, 200);
    } else {
      console.warn('No bounding boxes found for this cell value!');
    }
    
    // Find all matching rows
    const matches = findMatchingRows(searchText);
    setMatchingRows(matches);
    setCurrentMatchIndex(0);
  };

  // Navigation between matches
  const navigateToNextMatch = () => {
    if (matchingRows.length === 0 && pdfHighlights.length === 0) return;
    
    // Prioritize table matches - navigate through table rows
    if (matchingRows.length > 0) {
      const nextIndex = (currentMatchIndex + 1) % matchingRows.length;
      setCurrentMatchIndex(nextIndex);
      
      console.log('Navigating to table match', nextIndex + 1, 'of', matchingRows.length);
      
      // Scroll to table row (which will handle page changes)
      scrollToTableRow(matchingRows[nextIndex].rowIndex);
      setHighlightedCell(`${matchingRows[nextIndex].rowIndex}_${matchingRows[nextIndex].columnKey}`);
      
      // If there's a corresponding PDF highlight, show it too
      if (pdfHighlights[nextIndex]) {
        setPageNumber(pdfHighlights[nextIndex].page);
        setTimeout(() => scrollToPDFHighlight(pdfHighlights[nextIndex]), 200);
      }
    } else if (pdfHighlights.length > 0) {
      // Only navigate PDF if no table matches
      const nextIndex = (currentMatchIndex + 1) % pdfHighlights.length;
      setCurrentMatchIndex(nextIndex);
      
      console.log('Navigating to PDF highlight', nextIndex + 1, 'of', pdfHighlights.length);
      
      if (pdfHighlights[nextIndex]) {
        setPageNumber(pdfHighlights[nextIndex].page);
        setTimeout(() => scrollToPDFHighlight(pdfHighlights[nextIndex]), 200);
      }
    }
  };

  const navigateToPreviousMatch = () => {
    if (matchingRows.length === 0 && pdfHighlights.length === 0) return;
    
    // Prioritize table matches - navigate through table rows
    if (matchingRows.length > 0) {
      const prevIndex = currentMatchIndex === 0 
        ? matchingRows.length - 1 
        : currentMatchIndex - 1;
      setCurrentMatchIndex(prevIndex);
      
      console.log('Navigating to table match', prevIndex + 1, 'of', matchingRows.length);
      
      // Scroll to table row (which will handle page changes)
      scrollToTableRow(matchingRows[prevIndex].rowIndex);
      setHighlightedCell(`${matchingRows[prevIndex].rowIndex}_${matchingRows[prevIndex].columnKey}`);
      
      // If there's a corresponding PDF highlight, show it too
      if (pdfHighlights[prevIndex]) {
        setPageNumber(pdfHighlights[prevIndex].page);
        setTimeout(() => scrollToPDFHighlight(pdfHighlights[prevIndex]), 200);
      }
    } else if (pdfHighlights.length > 0) {
      // Only navigate PDF if no table matches
      const prevIndex = currentMatchIndex === 0 
        ? pdfHighlights.length - 1 
        : currentMatchIndex - 1;
      setCurrentMatchIndex(prevIndex);
      
      console.log('Navigating to PDF highlight', prevIndex + 1, 'of', pdfHighlights.length);
      
      if (pdfHighlights[prevIndex]) {
        setPageNumber(pdfHighlights[prevIndex].page);
        setTimeout(() => scrollToPDFHighlight(pdfHighlights[prevIndex]), 200);
      }
    }
  };

  // Scroll to specific table row
  const scrollToTableRow = (rowIndex) => {
    if (!tableRef.current) return;
    
    // Calculate which page this row is on
    const pageSize = pagination.pageSize;
    const targetPage = Math.floor(rowIndex / pageSize);
    
    console.log('Scrolling to row', rowIndex, 'which is on page', targetPage + 1);
    
    // Jump to the correct page if needed
    if (targetPage !== pagination.pageIndex) {
      console.log('Changing from page', pagination.pageIndex + 1, 'to page', targetPage + 1);
      setPagination({
        ...pagination,
        pageIndex: targetPage
      });
    }
    
    // Wait for page change to render, then scroll to row
    setTimeout(() => {
      const row = tableRef.current.querySelector(`[data-row-index="${rowIndex}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('flash-highlight');
        setTimeout(() => row.classList.remove('flash-highlight'), 2000);
      } else {
        console.warn('Row not found after page change:', rowIndex);
      }
    }, 100);
  };

  // Scroll to PDF highlight
  const scrollToPDFHighlight = (bbox) => {
    if (!pdfContainerRef.current || !bbox) return;
    
    console.log('Navigating to bounding box:', bbox);
    
    // Get the PDF page wrapper to access the page dimensions
    const pageWrapper = pdfContainerRef.current.querySelector('.react-pdf__Page');
    const pdfCanvas = pdfContainerRef.current.querySelector('.react-pdf__Page__canvas');
    
    if (!pageWrapper || !pdfCanvas) {
      console.error('PDF page not found');
      return;
    }
    
    console.log('Bounding box coordinates:', { x0: bbox.x0, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1 });
    
    // IMPORTANT: The bounding box coordinates from phrase extraction are ALREADY
    // in top-left origin (not PDF's bottom-left origin), so we DON'T need to flip them!
    // Just scale them directly.
    const htmlY = bbox.y0 * scale;  // Use y0 (top) directly, already in correct coordinate system
    const htmlX = bbox.x0 * scale;
    const width = (bbox.x1 - bbox.x0) * scale;
    const height = (bbox.y1 - bbox.y0) * scale;
    
    console.log('Calculated position (no flip needed):', { htmlX, htmlY, width, height, scale });
    
    // Create a temporary highlight div
    const highlightDiv = document.createElement('div');
    highlightDiv.style.position = 'absolute';
    highlightDiv.style.left = `${htmlX}px`;
    highlightDiv.style.top = `${htmlY}px`;
    highlightDiv.style.width = `${width}px`;
    highlightDiv.style.height = `${height}px`;
    highlightDiv.style.backgroundColor = 'rgba(255, 255, 0, 0.6)';
    highlightDiv.style.border = '2px solid #FF6B6B';
    highlightDiv.style.pointerEvents = 'none';
    highlightDiv.style.zIndex = '1000';
    highlightDiv.style.boxShadow = '0 0 10px rgba(255, 107, 107, 0.5)';
    highlightDiv.className = 'pdf-highlight-temp';
    
    // Remove any existing temporary highlights
    pdfContainerRef.current.querySelectorAll('.pdf-highlight-temp').forEach(el => el.remove());
    
    // Add highlight to PDF container - pageWrapper already defined above
    pageWrapper.style.position = 'relative';
    pageWrapper.appendChild(highlightDiv);
    
    // Scroll to the highlight with a slight delay to ensure it's rendered
    setTimeout(() => {
      highlightDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    // Remove highlight after 5 seconds
    setTimeout(() => highlightDiv.remove(), 5000);
  };

  // Handle search
  const handleSearch = (query) => {
    if (!query || query.trim().length === 0) {
      clearSelection();
      return;
    }
    
    const searchText = query.trim();
    console.log('Searching for:', searchText);
    
    setSelectedText(searchText);
    
    // Search table
    const tableMatches = findMatchingRows(searchText);
    console.log('Found', tableMatches.length, 'table matches');
    setMatchingRows(tableMatches);
    
    // Search PDF
    const pdfMatches = findBoundingBoxesForText(searchText);
    console.log('Found', pdfMatches.length, 'PDF matches');
    setPdfHighlights(pdfMatches);
    
    setCurrentMatchIndex(0);
    
    // Jump to first match in table
    if (tableMatches.length > 0) {
      scrollToTableRow(tableMatches[0].rowIndex);
      setHighlightedCell(`${tableMatches[0].rowIndex}_${tableMatches[0].columnKey}`);
    }
    
    // Jump to first match in PDF
    if (pdfMatches.length > 0) {
      setPageNumber(pdfMatches[0].page);
      setTimeout(() => scrollToPDFHighlight(pdfMatches[0]), 200);
    }
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedText(null);
    setMatchingRows([]);
    setCurrentMatchIndex(0);
    setHighlightedCell(null);
    setPdfHighlights([]);
    setSearchQuery('');
  };

  // Flatten table data for display
  const flattenedData = React.useMemo(() => {
    if (!tableData || !Array.isArray(tableData)) return [];
    return tableData;
  }, [tableData]);

  // Generate columns
  const columns = React.useMemo(() => {
    if (flattenedData.length === 0) return [];
    
    const allKeys = new Set();
    flattenedData.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });

    return Array.from(allKeys).map(key => ({
      accessorKey: key,
      header: key,
      cell: ({ getValue, row }) => {
        const value = getValue();
        const rowIndex = row.index;
        const cellKey = `${rowIndex}_${key}`;
        const isHighlighted = highlightedCell === cellKey;
        const isMatching = matchingRows.some(
          match => match.rowIndex === rowIndex && match.columnKey === key
        );
        
        return (
          <div
            onDoubleClick={() => handleCellDoubleClick(value, rowIndex, key)}
            className={`cursor-pointer p-2 rounded transition-colors ${
              isHighlighted ? 'bg-yellow-300 ring-2 ring-yellow-500' :
              isMatching ? 'bg-yellow-100' :
              'hover:bg-blue-50'
            }`}
            title="Double-click to find in PDF"
          >
            {value === 'missing' || value === null || value === undefined ? (
              <span className="text-gray-400 italic">missing</span>
            ) : (
              String(value)
            )}
          </div>
        );
      },
    }));
  }, [flattenedData, highlightedCell, matchingRows]);

  const table = useReactTable({
    data: flattenedData,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with controls */}
      <div className="bg-white border-b shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">PDF-Table Linker</h2>
            <p className="text-sm text-gray-600">
              Search, select text in PDF, or double-click table cells
            </p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery);
                }
              }}
              placeholder="Search in PDF and Table... (Press Enter)"
              className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg 
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => handleSearch(searchQuery)}
            disabled={!searchQuery.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Search
          </button>
          {selectedText && (
            <button
              onClick={clearSelection}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Clear
            </button>
          )}
        </div>
        
        {/* Match navigation */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            {selectedText && (matchingRows.length > 0 || pdfHighlights.length > 0) ? (
              <span>
                Searching for "<strong>{selectedText}</strong>" - 
                <span className="ml-1 text-blue-600 font-medium">
                  {matchingRows.length} table match(es), {pdfHighlights.length} PDF match(es)
                </span>
              </span>
            ) : selectedText ? (
              <span className="text-gray-400">No matches found for "{selectedText}"</span>
            ) : null}
          </div>
          
          {selectedText && (matchingRows.length > 1 || pdfHighlights.length > 1) && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Match {currentMatchIndex + 1}/{Math.max(matchingRows.length, pdfHighlights.length)}
              </span>
              <button
                onClick={navigateToPreviousMatch}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="Previous match (Shift+Enter)"
              >
                ← Prev
              </button>
              <button
                onClick={navigateToNextMatch}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                title="Next match (Enter)"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main content - split view */}
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 overflow-hidden">
        {/* PDF Viewer */}
        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
          <div className="border-b px-4 py-2 flex items-center justify-between bg-gray-50">
            <div>
              <h3 className="font-semibold">PDF Viewer</h3>
              {pdfLoaded && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Text selection enabled - click and drag to select
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                ←
              </button>
              <span className="text-sm">
                {pageNumber} / {numPages || '?'}
              </span>
              <button
                onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
                disabled={pageNumber >= (numPages || pageNumber)}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                →
              </button>
              <button
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className="px-2 py-1 border rounded"
              >
                -
              </button>
              <span className="text-sm">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(s => Math.min(2.5, s + 0.1))}
                className="px-2 py-1 border rounded"
              >
                +
              </button>
            </div>
          </div>
          
          <div 
            ref={pdfContainerRef}
            className="flex-1 overflow-auto p-4"
            onMouseUp={handleTextSelection}
          >
            {pdfFile ? (
              <Document
                file={pdfFile}
                onLoadSuccess={handlePDFLoad}
                onLoadError={(error) => console.error('PDF load error:', error)}
                loading={<div className="text-center p-4">Loading PDF...</div>}
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderAnnotationLayer={false}
                  renderTextLayer={true}
                  className="pdf-page-with-text"
                  loading={<div className="text-center p-4">Loading page...</div>}
                  onLoadSuccess={() => console.log('Page', pageNumber, 'loaded')}
                />
              </Document>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📄</div>
                  <p>No PDF loaded</p>
                  <p className="text-xs mt-2">Upload a PDF and run phrase extraction</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Viewer */}
        <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
          <div className="border-b px-4 py-2">
            <h3 className="font-semibold">Extracted Data Table</h3>
            <p className="text-xs text-gray-500">Double-click any cell to find in PDF</p>
          </div>
          
          <div ref={tableRef} className="flex-1 overflow-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id}
                    data-row-index={row.index}
                    className="hover:bg-gray-50"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Controls */}
          <div className="border-t px-4 py-3 flex items-center justify-between bg-gray-50">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                ⏮ First
              </button>
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                ← Prev
              </button>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next →
              </button>
              <button
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Last ⏭
              </button>
            </div>
            
            <div className="text-sm text-gray-700">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()} | Total: {flattenedData.length} rows
            </div>
            
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className="px-3 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 20, 50, 100, 500].map(pageSize => (
                <option key={pageSize} value={pageSize}>
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedPDFTableLinker;
