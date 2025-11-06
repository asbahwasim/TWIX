# TWIX Components Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         TWIX Application                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              ProcessingStages.jsx                       │    │
│  │  (Main Processing Orchestrator)                         │    │
│  └────────────────┬──────────────────────────────────────┬─┘    │
│                   │                                       │      │
│         ┌─────────▼──────────┐              ┌───────────▼──────┐│
│         │  DataDisplay.jsx   │              │ UnifiedDashboard ││
│         │  (Standard View)   │              │  (New View) ★    ││
│         └────────────────────┘              └──────────┬────────┘│
│                                                        │         │
│                                          ┌─────────────┴────────┐│
│                                          │  Cross-Linking Core  ││
│                                          └─────────┬────────────┘│
│                                                    │             │
│        ┌──────────────────┬────────────────────┬──┴─────┬──────┐│
│        │                  │                    │        │      ││
│  ┌─────▼─────┐   ┌───────▼────────┐  ┌───────▼─────┐ ┌▼────┐ ││
│  │    PDF    │   │  TemplateTypes │  │    JSON     │ │Table│ ││
│  │  Viewer   │   │    Viewer      │  │   Viewer    │ │View │ ││
│  │  ★        │   │    ★           │  │    ★        │ │ ★   │ ││
│  └───────────┘   └────────────────┘  └─────────────┘ └─────┘ ││
│                                                                 ││
└─────────────────────────────────────────────────────────────────┘│
  ★ = New Components
```

## Component Hierarchy

```
App.jsx
└── ProcessingStages.jsx
    ├── [Existing Components]
    │   ├── PDFUploader
    │   ├── PDFList
    │   ├── TemplateEditor
    │   └── DataDisplay
    │
    └── UnifiedDashboard.jsx (NEW)
        ├── PDFViewerWithHighlighter.jsx (NEW)
        ├── TemplateTypesViewer.jsx (NEW)
        ├── JSONViewer.jsx (NEW)
        └── TableViewer.jsx (NEW)
```

## Data Flow

```
┌─────────────┐
│  PDF Files  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│ Phrase Extract  │─────▶│  Bounding    │
│                 │      │  Box Data    │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│ Field Predict   │─────▶│  Fields List │
│                 │      │              │
└────────┬────────┘      └──────────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│Template Predict │─────▶│  Template    │────┐
│                 │      │  JSON        │    │
└────────┬────────┘      └──────────────┘    │
         │                                    │
         ▼                                    │
┌─────────────────┐      ┌──────────────┐    │
│ Data Extract    │─────▶│  Extracted   │    │
│                 │      │  Data JSON   │    │
└─────────────────┘      └──────┬───────┘    │
                                │            │
                                ▼            ▼
                         ┌──────────────────────┐
                         │  UnifiedDashboard    │
                         │                      │
                         │  - Template Display  │
                         │  - JSON Explorer     │
                         │  - Table View        │
                         │  - PDF Viewer        │
                         └──────────────────────┘
```

## Cross-Component Linking Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Cross-Component Linking System                  │
└─────────────────────────────────────────────────────────────┘

    User Interaction
         │
         ▼
    ┌────────────┐
    │  Template  │──┐
    │   Click    │  │
    └────────────┘  │
                    │
    ┌────────────┐  │    ┌─────────────────┐
    │   JSON     │──┼───▶│ State Manager   │
    │   Click    │  │    │                 │
    └────────────┘  │    │ - selectedNode  │
                    │    │ - selectedPath  │
    ┌────────────┐  │    │ - selectedCell  │
    │   Table    │──┘    │ - selectedPDF   │
    │   Click    │       └────────┬────────┘
    └────────────┘                │
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
    ┌─────────┐            ┌──────────┐           ┌───────────┐
    │Template │            │   JSON   │           │   Table   │
    │Highlight│            │ Highlight│           │ Highlight │
    └─────────┘            └──────────┘           └───────────┘
```

## State Management

```
UnifiedDashboard (Parent Component)
│
├── State Variables:
│   ├── selectedNodeId: number | null
│   ├── selectedJsonPath: string | null
│   ├── selectedCell: string | null
│   ├── selectedHighlightId: string | null
│   ├── highlights: Array<Highlight>
│   └── activeView: 'split' | 'pdf' | 'data'
│
├── Event Handlers:
│   ├── handleTemplateNodeClick(node)
│   ├── handleJsonItemClick({path, key, value})
│   ├── handleTableCellClick({value, column, row, cellKey})
│   └── handlePdfHighlightClick(highlight)
│
└── Child Components (Props):
    ├── PDFViewerWithHighlighter
    │   ├── pdfUrl
    │   ├── highlights
    │   ├── onHighlightClick
    │   └── selectedHighlightId
    │
    ├── TemplateTypesViewer
    │   ├── template
    │   ├── onNodeClick
    │   └── selectedNodeId
    │
    ├── JSONViewer
    │   ├── data
    │   ├── onItemClick
    │   └── selectedPath
    │
    └── TableViewer
        ├── data
        ├── onCellClick
        └── selectedCell
```

## Component Responsibilities

### PDFViewerWithHighlighter
```
┌─────────────────────────────────────┐
│  PDFViewerWithHighlighter           │
├─────────────────────────────────────┤
│ Responsibilities:                   │
│ • Load and display PDF              │
│ • Handle text selection             │
│ • Manage highlights                 │
│ • Support area selection (Alt+drag) │
│ • Emit highlight click events       │
│                                     │
│ Dependencies:                       │
│ • react-pdf-highlighter            │
│ • pdf.js (via react-pdf-highlighter)│
└─────────────────────────────────────┘
```

### TemplateTypesViewer
```
┌─────────────────────────────────────┐
│  TemplateTypesViewer                │
├─────────────────────────────────────┤
│ Responsibilities:                   │
│ • Display template structure        │
│ • Show node types (table/kv)       │
│ • List fields per node              │
│ • Handle node selection             │
│ • Visual type differentiation       │
│                                     │
│ Data Format:                        │
│ • Array of node objects             │
│ • Each node: {type, fields, bid,    │
│   child, node_id}                   │
└─────────────────────────────────────┘
```

### JSONViewer
```
┌─────────────────────────────────────┐
│  JSONViewer                         │
├─────────────────────────────────────┤
│ Responsibilities:                   │
│ • Render JSON tree                  │
│ • Expand/collapse nodes             │
│ • Search functionality              │
│ • Syntax highlighting               │
│ • Copy/download features            │
│ • Path tracking for cross-linking   │
│                                     │
│ Features:                           │
│ • Type-based coloring               │
│ • Expand/Collapse all               │
│ • Global search                     │
└─────────────────────────────────────┘
```

### TableViewer
```
┌─────────────────────────────────────┐
│  TableViewer                        │
├─────────────────────────────────────┤
│ Responsibilities:                   │
│ • Render data in table format       │
│ • Column sorting                    │
│ • Row filtering                     │
│ • Pagination                        │
│ • CSV export                        │
│ • Cell selection for cross-linking  │
│                                     │
│ Dependencies:                       │
│ • @tanstack/react-table            │
│                                     │
│ Features:                           │
│ • Multi-column sort                 │
│ • Global filter                     │
│ • Customizable page sizes           │
└─────────────────────────────────────┘
```

## View Modes

```
┌─────────────────────────────────────────────────┐
│              SPLIT VIEW (Default)                │
├────────────────────┬────────────────────────────┤
│                    │                            │
│   PDF Viewer       │   Template Viewer          │
│   (Left 50%)       │   +                        │
│                    │   JSON Viewer              │
│                    │   +                        │
│                    │   Table Viewer             │
│                    │   (Right 50%, scrollable)  │
│                    │                            │
└────────────────────┴────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              PDF ONLY VIEW                       │
├─────────────────────────────────────────────────┤
│                                                  │
│             PDF Viewer (Full Width)              │
│                                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              DATA ONLY VIEW                      │
├─────────────────────────────────────────────────┤
│         Template Viewer                          │
├─────────────────────────────────────────────────┤
│         JSON Viewer                              │
├─────────────────────────────────────────────────┤
│         Table Viewer                             │
└─────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────┐
│              Frontend Framework                  │
├─────────────────────────────────────────────────┤
│  React 18.2.0                                   │
│  └── Hooks: useState, useEffect, useMemo        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              Styling                             │
├─────────────────────────────────────────────────┤
│  Tailwind CSS 3.4.1                             │
│  └── Utility-first CSS framework                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│              Component Libraries                 │
├─────────────────────────────────────────────────┤
│  • react-pdf-highlighter                        │
│    └── PDF viewing and highlighting             │
│                                                  │
│  • @tanstack/react-table                        │
│    └── Advanced table functionality             │
└─────────────────────────────────────────────────┘
```

## File Structure

```
twix-ui/
├── src/
│   ├── components/
│   │   ├── pdf/
│   │   │   ├── PDFViewer.jsx              [existing]
│   │   │   ├── PDFViewerWithHighlighter.jsx  [NEW]
│   │   │   ├── PDFUploader.jsx            [existing]
│   │   │   ├── PDFList.jsx                [existing]
│   │   │   └── BoundingBoxTable.jsx       [existing]
│   │   │
│   │   ├── template/
│   │   │   ├── TemplateEditor.jsx         [existing]
│   │   │   └── TemplateTypesViewer.jsx    [NEW]
│   │   │
│   │   ├── results/
│   │   │   ├── DataDisplay.jsx            [existing]
│   │   │   ├── JSONViewer.jsx             [NEW]
│   │   │   ├── TableViewer.jsx            [NEW]
│   │   │   └── UnifiedDashboard.jsx       [NEW]
│   │   │
│   │   ├── processing/
│   │   │   ├── ProcessingStages.jsx       [modified]
│   │   │   ├── ProcessingStatus.jsx       [existing]
│   │   │   └── Cost.js                    [existing]
│   │   │
│   │   ├── demo/
│   │   │   └── DemoPage.jsx               [NEW]
│   │   │
│   │   └── layout/
│   │       ├── Navbar.jsx                 [existing]
│   │       └── Footer.jsx                 [existing]
│   │
│   ├── examples/
│   │   └── ComponentUsageExamples.jsx     [NEW]
│   │
│   ├── services/
│   │   └── api.js                         [existing]
│   │
│   └── json_files/
│       ├── template.json                  [existing]
│       ├── twix_key.txt                   [existing]
│       └── Investigations_*.json          [existing]
│
├── COMPONENTS_README.md                    [NEW]
├── IMPLEMENTATION_SUMMARY.md               [NEW]
├── QUICK_START.md                          [NEW]
├── ARCHITECTURE.md                         [NEW - this file]
└── package.json                            [modified]
```

## Performance Considerations

```
┌─────────────────────────────────────────────────┐
│           Performance Optimizations              │
├─────────────────────────────────────────────────┤
│                                                  │
│  React Optimization:                             │
│  • useMemo for expensive computations            │
│  • Conditional rendering                         │
│  • Lazy loading of views                         │
│                                                  │
│  Table Optimization:                             │
│  • TanStack Table's built-in virtualization     │
│  • Pagination (5/10/20/50/100 rows)             │
│  • Memoized column definitions                   │
│                                                  │
│  JSON Viewer Optimization:                       │
│  • Collapsed by default                          │
│  • Lazy expansion of nodes                       │
│  • Search indexing                               │
│                                                  │
│  PDF Optimization:                               │
│  • Page-by-page rendering                        │
│  • Canvas-based rendering                        │
│  • Worker thread for PDF parsing                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Security Considerations

```
┌─────────────────────────────────────────────────┐
│           Security Best Practices                │
├─────────────────────────────────────────────────┤
│                                                  │
│  • PDF files processed client-side              │
│  • No sensitive data sent to external services  │
│  • CORS-compliant PDF loading                   │
│  • XSS protection via React's JSX escaping      │
│  • No eval() or dangerous innerHTML usage       │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

**Document Version:** 1.0  
**Last Updated:** October 2025  
**Status:** Complete
