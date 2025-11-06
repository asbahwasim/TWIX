# TWIX UI Components Documentation

## Overview

This document describes the new components added to the TWIX application for enhanced data visualization and interaction.

## New Components

### 1. PDF Viewer with Highlighter (`PDFViewerWithHighlighter.jsx`)

**Location:** `src/components/pdf/PDFViewerWithHighlighter.jsx`

**Features:**
- Interactive PDF viewing using `react-pdf-highlighter`
- Text highlighting functionality
- Click highlights to link to corresponding data
- Support for custom highlight colors
- Area selection support (Alt + drag)

**Usage:**
```jsx
import PDFViewerWithHighlighter from './components/pdf/PDFViewerWithHighlighter';

<PDFViewerWithHighlighter
  pdfUrl={pdfUrl}
  highlights={highlights}
  onHighlightClick={handleHighlightClick}
  selectedHighlightId={selectedHighlightId}
/>
```

**Props:**
- `pdfUrl` (string): URL to the PDF file
- `highlights` (array): Array of highlight objects
- `onHighlightClick` (function): Callback when a highlight is clicked
- `selectedHighlightId` (string): ID of the currently selected highlight

---

### 2. Template Types Viewer (`TemplateTypesViewer.jsx`)

**Location:** `src/components/template/TemplateTypesViewer.jsx`

**Features:**
- Display TWIX template structure
- Visual distinction between table and key-value nodes
- Field listing for each node
- Interactive node selection
- Cross-component linking support

**Usage:**
```jsx
import TemplateTypesViewer from './components/template/TemplateTypesViewer';

<TemplateTypesViewer
  template={templateData}
  onNodeClick={handleNodeClick}
  selectedNodeId={selectedNodeId}
/>
```

**Props:**
- `template` (array): Template data with nodes
- `onNodeClick` (function): Callback when a node is clicked
- `selectedNodeId` (number): ID of the currently selected node

---

### 3. JSON Viewer (`JSONViewer.jsx`)

**Location:** `src/components/results/JSONViewer.jsx`

**Features:**
- Interactive JSON tree viewer
- Expand/collapse functionality
- Search functionality
- Syntax highlighting
- Copy to clipboard
- Download JSON
- Path-based selection for cross-linking

**Usage:**
```jsx
import JSONViewer from './components/results/JSONViewer';

<JSONViewer
  data={jsonData}
  onItemClick={handleItemClick}
  selectedPath={selectedPath}
/>
```

**Props:**
- `data` (object/array): JSON data to display
- `onItemClick` (function): Callback when a JSON item is clicked
- `selectedPath` (string): Path of the currently selected item

**Features:**
- Expand All / Collapse All buttons
- Search across all keys and values
- Hierarchical path tracking
- Type-specific color coding (strings, numbers, booleans)

---

### 4. Table Viewer (`TableViewer.jsx`)

**Location:** `src/components/results/TableViewer.jsx`

**Features:**
- Powered by TanStack Table (React Table v8)
- Sortable columns
- Global search/filtering
- Pagination with customizable page size
- CSV export
- Cell selection for cross-linking
- Responsive design

**Usage:**
```jsx
import TableViewer from './components/results/TableViewer';

<TableViewer
  data={extractedData}
  onCellClick={handleCellClick}
  selectedCell={selectedCellKey}
/>
```

**Props:**
- `data` (array): Extracted data in TWIX format
- `onCellClick` (function): Callback when a cell is clicked
- `selectedCell` (string): Key of the currently selected cell

**Table Features:**
- Click column headers to sort
- Search box filters all columns
- Pagination controls with page size selector
- Export to CSV button
- Missing/N/A value handling

---

### 5. Unified Dashboard (`UnifiedDashboard.jsx`)

**Location:** `src/components/results/UnifiedDashboard.jsx`

**Features:**
- Integrated view of all components
- Three view modes: Split View, PDF Only, Data Only
- Cross-component linking system
- Synchronized highlighting across views
- Responsive layout

**Usage:**
```jsx
import UnifiedDashboard from './components/results/UnifiedDashboard';

<UnifiedDashboard
  extractedData={extractedData}
  templateData={templateData}
  pdfUrl={pdfUrl}
/>
```

**Props:**
- `extractedData` (object/array): Extracted data from TWIX
- `templateData` (array): Template structure
- `pdfUrl` (string): URL to the PDF file

**View Modes:**
1. **Split View:** PDF on left, data components on right
2. **PDF Only:** Full-screen PDF viewer
3. **Data Only:** Stacked data components (Template, JSON, Table)

---

## Cross-Component Linking

The unified dashboard implements a sophisticated cross-component linking system:

### How It Works:

1. **Template → JSON/Table:**
   - Click a template node
   - Corresponding JSON section highlights
   - Related table rows highlight

2. **JSON → Template/Table:**
   - Click a JSON item
   - Related template node highlights
   - Matching table data highlights

3. **Table → Template/JSON:**
   - Click a table cell
   - Field's template node highlights
   - JSON path to data highlights

4. **PDF → Data (future enhancement):**
   - Click PDF highlight
   - Corresponding extracted data highlights

### State Management:

The linking system uses React state to track:
- `selectedNodeId`: Currently selected template node
- `selectedJsonPath`: Currently selected JSON path
- `selectedCell`: Currently selected table cell
- `selectedHighlightId`: Currently selected PDF highlight

---

## Integration with Existing TWIX UI

The components are integrated into the existing `ProcessingStages.jsx`:

```jsx
// In the extraction stage
{activeStage === 'extraction' && processedData && (
  <div>
    <button onClick={() => setShowUnifiedDashboard(!showUnifiedDashboard)}>
      {showUnifiedDashboard ? '📊 Standard View' : '🎯 Unified Dashboard'}
    </button>
    
    {showUnifiedDashboard ? (
      <UnifiedDashboard
        extractedData={processedData}
        templateData={templateData}
        pdfUrl={pdfUrl}
      />
    ) : (
      <DataDisplay data={processedData} />
    )}
  </div>
)}
```

---

## Demo Page

A standalone demo page is available at:
`src/components/demo/DemoPage.jsx`

This page loads sample data and showcases all components with cross-linking functionality.

---

## Dependencies

New dependencies added:
- `react-pdf-highlighter`: PDF viewing with highlighting
- `@tanstack/react-table`: Modern table library

Install with:
```bash
npm install react-pdf-highlighter @tanstack/react-table --legacy-peer-deps
```

---

## Styling

All components use Tailwind CSS for styling, consistent with the existing TWIX UI design system.

**Color Scheme:**
- Selected/Linked items: Yellow highlight (`bg-yellow-200`)
- Hover states: Light blue (`bg-blue-50`)
- Primary actions: Blue (`bg-blue-600`)
- Secondary actions: Gray (`bg-gray-200`)

---

## Future Enhancements

Potential improvements:
1. PDF text-to-data linking (map PDF regions to extracted values)
2. Real-time collaboration features
3. Custom highlight colors and categories
4. Export combined report (PDF + data)
5. Annotation and comment system
6. Diff view for comparing multiple extractions
7. Advanced search across all views
8. Keyboard shortcuts for navigation

---

## Troubleshooting

### PDF not loading
- Ensure the PDF URL is correct and accessible
- Check CORS settings if loading from external source
- Verify PDF is not corrupted

### Table not displaying
- Check that extractedData follows TWIX format
- Ensure data has `type: 'table'` entries
- Check console for data structure errors

### Cross-linking not working
- Verify all required props are passed
- Check that callback functions are defined
- Ensure data IDs are consistent across components

---

## Component Architecture

```
UnifiedDashboard (Container)
├── PDFViewerWithHighlighter
├── TemplateTypesViewer
├── JSONViewer
└── TableViewer
```

Each component is independent and can be used separately or within the unified dashboard.

---

## Testing

To test the components:

1. Run the development server:
   ```bash
   npm start
   ```

2. Upload PDF files through the TWIX UI

3. Complete the extraction process

4. Click "🎯 Unified Dashboard" in the extraction stage

5. Test cross-linking by clicking different elements

---

## Additional Resources

- [TanStack Table Documentation](https://tanstack.com/table/latest)
- [react-pdf-highlighter GitHub](https://github.com/agentcooper/react-pdf-highlighter)
- [TWIX Paper](https://arxiv.org/abs/2501.06659)

---

**Last Updated:** October 2025
