import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * PDFHighlighterPane
 * - Lightweight PDF viewer that highlights target phrases using bounding boxes
 * - Props:
 *   - pdfFile: File | string (PDF source)
 *   - boundingBoxData: nested structure with per-field bounding_box and page
 *   - targetValue: string to highlight (from table selection)
 *   - targetRowIndex, targetColumnKey: optional metadata (unused in rendering, helpful for logs)
 */
const PDFHighlighterPane = ({ pdfFile, boundingBoxData, targetValue, targetRowIndex = null, targetColumnKey = null }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [pdfLoaded, setPdfLoaded] = useState(false);

  const pdfContainerRef = useRef(null);

  const handlePDFLoad = ({ numPages }) => {
    setNumPages(numPages);
    setPdfLoaded(true);
  };

  // Parse nested bounding box data (same structure as EnhancedPDFTableLinker)
  const parsedBoundingBoxes = useMemo(() => {
    if (!boundingBoxData || !Array.isArray(boundingBoxData)) return [];
    const all = [];
    boundingBoxData.forEach((page, pageIndex) => {
      if (!page?.content) return;
      page.content.forEach(section => {
        if (!section?.content) return;
        section.content.forEach(row => {
          Object.entries(row || {}).forEach(([fieldName, fieldData]) => {
            if (fieldName === 'bb' || !fieldData) return;
            if (fieldData.value && Array.isArray(fieldData.bounding_box)) {
              const [x0, y0, x1, y1] = fieldData.bounding_box;
              if (
                fieldData.value !== 'missing' &&
                [x0, y0, x1, y1].every(v => typeof v === 'number') &&
                x1 > x0 && y1 > y0
              ) {
                all.push({
                  text: String(fieldData.value).trim(),
                  x0, y0, x1, y1,
                  page: parseInt(fieldData.page) || pageIndex + 1,
                  fieldName
                });
              }
            }
          });
        });
      });
    });
    return all;
  }, [boundingBoxData]);

  const findBoundingBoxesForText = (searchText) => {
    if (!searchText || parsedBoundingBoxes.length === 0) return [];
    const lower = String(searchText).toLowerCase().trim();
    if (!lower) return [];

    // exact first
    let matches = parsedBoundingBoxes.filter(b => b.text.toLowerCase().trim() === lower);
    if (matches.length) return matches;

    // partial contains both ways (min 2 chars)
    matches = parsedBoundingBoxes.filter(b => {
      const t = b.text.toLowerCase().trim();
      if (!t) return false;
      return (t.length >= 2 && lower.includes(t)) || (lower.length >= 2 && t.includes(lower));
    });
    return matches;
  };

  const scrollToPDFHighlight = (bbox) => {
    if (!pdfContainerRef.current || !bbox) return;

    const pageWrapper = pdfContainerRef.current.querySelector('.react-pdf__Page');
    const pdfCanvas = pdfContainerRef.current.querySelector('.react-pdf__Page__canvas');
    if (!pageWrapper || !pdfCanvas) return;

    // Coordinates are already top-left origin per prior processing
    const htmlY = bbox.y0 * scale;
    const htmlX = bbox.x0 * scale;
    const width = (bbox.x1 - bbox.x0) * scale;
    const height = (bbox.y1 - bbox.y0) * scale;

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

    pageWrapper.style.position = 'relative';
    pageWrapper.appendChild(highlightDiv);

    setTimeout(() => {
      highlightDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);

    setTimeout(() => highlightDiv.remove(), 5000);
  };

  // React to new target selection
  useEffect(() => {
    if (!targetValue || !pdfLoaded || parsedBoundingBoxes.length === 0) return;
    const bboxes = findBoundingBoxesForText(targetValue);
    if (bboxes.length > 0) {
      const first = bboxes[0];
      setPageNumber(first.page);
      setTimeout(() => scrollToPDFHighlight(first), 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetValue, pdfLoaded, parsedBoundingBoxes]);

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <div className="text-sm font-medium text-gray-700">PDF Viewer</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNumber(p => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="px-2 py-1 text-sm border rounded disabled:opacity-50"
          >
            ←
          </button>
          <span className="text-xs">{pageNumber} / {numPages || '?'}</span>
          <button
            onClick={() => setPageNumber(p => Math.min(numPages || p, p + 1))}
            disabled={pageNumber >= (numPages || pageNumber)}
            className="px-2 py-1 text-sm border rounded disabled:opacity-50"
          >
            →
          </button>
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="px-2 py-1 text-sm border rounded">-</button>
          <span className="text-xs">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(2.5, s + 0.1))} className="px-2 py-1 text-sm border rounded">+</button>
        </div>
      </div>
      <div ref={pdfContainerRef} className="max-h-[80vh] overflow-auto p-3">
        {pdfFile ? (
          <Document
            file={pdfFile}
            onLoadSuccess={handlePDFLoad}
            onLoadError={(e) => console.error('PDF load error:', e)}
            loading={<div className="text-center p-4">Loading PDF...</div>}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderAnnotationLayer={false}
              renderTextLayer={true}
              className="pdf-page-with-text"
              loading={<div className="text-center p-4">Loading page...</div>}
            />
          </Document>
        ) : (
          <div className="h-[60vh] flex items-center justify-center text-gray-400">No PDF uploaded</div>
        )}
      </div>
    </div>
  );
};

export default PDFHighlighterPane;
