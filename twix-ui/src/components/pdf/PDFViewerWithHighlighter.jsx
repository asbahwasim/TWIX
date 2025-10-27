import React, { useState } from 'react';
import { PdfLoader, PdfHighlighter, Highlight, Popup } from 'react-pdf-highlighter';

const PDFViewerWithHighlighter = ({ pdfUrl, highlights = [], onHighlightClick, selectedHighlightId }) => {
  const [currentHighlights, setCurrentHighlights] = useState(highlights);

  const addHighlight = (highlight) => {
    setCurrentHighlights([...currentHighlights, highlight]);
  };

  return (
    <div className="h-full w-full">
      <PdfLoader url={pdfUrl} beforeLoad={<div>Loading PDF...</div>}>
        {(pdfDocument) => (
          <PdfHighlighter
            pdfDocument={pdfDocument}
            enableAreaSelection={(event) => event.altKey}
            onScrollChange={() => {}}
            scrollRef={(scrollTo) => {
              // Store scroll function for external use
            }}
            onSelectionFinished={(
              position,
              content,
              hideTipAndSelection,
              transformSelection
            ) => (
              <div
                className="bg-white shadow-lg rounded-lg p-2 border-2 border-blue-500"
                style={{ position: 'absolute' }}
              >
                <button
                  onClick={() => {
                    addHighlight({
                      content,
                      position,
                      comment: { text: '', emoji: '' },
                      id: String(Math.random())
                    });
                    hideTipAndSelection();
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Highlight
                </button>
              </div>
            )}
            highlightTransform={(
              highlight,
              index,
              setTip,
              hideTip,
              viewportToScaled,
              screenshot,
              isScrolledTo
            ) => {
              const component = (
                <Highlight
                  isScrolledTo={isScrolledTo}
                  position={highlight.position}
                  comment={highlight.comment}
                  onClick={() => {
                    if (onHighlightClick) {
                      onHighlightClick(highlight);
                    }
                  }}
                />
              );

              return (
                <Popup
                  popupContent={<div className="p-2 bg-white rounded shadow">{highlight.comment.text}</div>}
                  onMouseOver={(popupContent) =>
                    setTip(highlight, (highlight) => popupContent)
                  }
                  onMouseOut={hideTip}
                  key={index}
                  children={component}
                />
              );
            }}
            highlights={currentHighlights}
          />
        )}
      </PdfLoader>
    </div>
  );
};

export default PDFViewerWithHighlighter;
