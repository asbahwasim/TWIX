# PDF-Table Bidirectional Linking

## Overview

The enhanced PDF-Table linker provides seamless bidirectional navigation between PDF documents and extracted data tables with phrase-level precision.

## Features Implemented

### ✅ 1. PDF Text Selection → Table Highlighting
- **How it works:** Select any text in the PDF by clicking and dragging
- **Result:** Automatically finds and highlights all matching cells in the table
- **Navigation:** Use next/previous arrows to jump between multiple matches

### ✅ 2. Table Cell Double-Click → PDF Navigation
- **How it works:** Double-click any cell in the table
- **Result:** Jumps to the corresponding location in the PDF
- **Highlighting:** Highlights the selected text in both PDF and table

### ✅ 3. Multiple Occurrence Navigation
- **Like "Find in Page":** When text appears multiple times, navigate with arrows
- **Match Counter:** Shows current match number (e.g., "2/5")
- **Smooth Scrolling:** Automatically scrolls to each match location

## How to Use

### Step 1: Access the Feature

1. Upload a PDF file
2. Click **"Phrase Extraction"** processing stage
3. Wait for processing to complete
4. The **Enhanced PDF-Table Linker** will appear below

### Step 2: PDF → Table Linking

1. **In the PDF viewer (left panel):**
   - Click and drag to select any text
   - Release the mouse
   
2. **Automatic results:**
   - Table cells with matching text highlight in yellow
   - Match counter shows total occurrences
   - Table automatically scrolls to first match

3. **Navigate matches:**
   - Click **→** (next) to jump to next occurrence
   - Click **←** (previous) to go back
   - Current match number displays (e.g., "1/3")

### Step 3: Table → PDF Linking

1. **In the table (right panel):**
   - Find any cell with data
   - **Double-click** the cell
   
2. **Automatic results:**
   - PDF jumps to the page with that text
   - Matching phrase highlights in the PDF
   - If multiple matches exist, use arrows to navigate

### Step 4: Clear Selection

- Click the **"Clear"** button to reset highlighting
- Or simply select new text to start over

## Visual Indicators

### Highlighting Colors

| Element | Color | Meaning |
|---------|-------|---------|
| Selected cell | Yellow with ring | Currently selected/clicked cell |
| Matching cells | Light yellow | Cells containing the selected text |
| Hover | Light blue | Cell is hoverable |
| Flash animation | Blue pulse | Cell just navigated to |

### Navigation Controls

```
┌─────────────────────────────────────────────────┐
│ "investigation" - 5 match(es)  [2/5] [←] [→] [Clear] │
└─────────────────────────────────────────────────┘
```

- **Selected text:** Shows what you're searching for
- **Match count:** Total number of occurrences found
- **Position:** Current match number / total matches
- **← →:** Navigate between matches
- **Clear:** Reset selection

## Use Cases

### 1. Data Verification
**Scenario:** You want to verify extracted data is correct

1. Double-click a suspicious value in the table
2. PDF jumps to original document location
3. Visually confirm the extraction is accurate

### 2. Understanding Context
**Scenario:** You need context around extracted data

1. Double-click any table cell
2. See the phrase in its original PDF context
3. View surrounding text and formatting

### 3. Finding All Occurrences
**Scenario:** A value appears multiple times

1. Select text in PDF or double-click table cell
2. See match counter (e.g., "5 matches")
3. Use arrows to visit each occurrence
4. Compare differences in context

### 4. Quality Assurance
**Scenario:** Reviewing extraction accuracy

1. Select a phrase in the PDF
2. Verify it appears in the correct table cells
3. Check that all occurrences are captured
4. Identify any missing extractions

## Technical Details

### What Gets Matched

The system searches for matches using:
- **Case-insensitive matching** (e.g., "John" matches "john")
- **Partial string matching** (e.g., "2024" matches "01/15/2024")
- **Exact phrase matching** when available

### Bounding Box Data

The linking uses bounding box coordinates from the phrase extraction:
```json
{
  "text": "John Doe",
  "x0": 100.5,
  "y0": 200.3,
  "x1": 150.2,
  "y1": 215.8,
  "page": 1
}
```

These coordinates enable precise PDF navigation.

### Performance

- **Fast matching:** Search happens instantly
- **Optimized scrolling:** Smooth animations
- **Pagination support:** Works with large tables
- **Memory efficient:** Only active page rendered

## Keyboard Shortcuts (Future Enhancement)

Planned keyboard shortcuts:
- `Ctrl+F`: Focus search
- `Enter`: Next match
- `Shift+Enter`: Previous match
- `Escape`: Clear selection

## Troubleshooting

### PDF Text Not Selectable

**Problem:** Can't select text in PDF

**Solutions:**
- Ensure PDF has text layer (not scanned image)
- Try increasing zoom level
- Check PDF is fully loaded

### Table Not Highlighting

**Problem:** Selected PDF text doesn't highlight table

**Solutions:**
- Text might not exist in extracted data
- Try selecting more specific text
- Check extraction completed successfully

### Double-Click Not Working

**Problem:** Table cell double-click doesn't jump to PDF

**Solutions:**
- Ensure PDF loaded completely
- Check bounding box data exists
- Text might be on different page

### Navigation Arrows Disabled

**Problem:** Can't navigate between matches

**Solutions:**
- Only appears when 2+ matches exist
- Try selecting more text
- Check table has data

## Comparison with Standard View

| Feature | Standard BoundingBoxTable | Enhanced PDF-Table Linker |
|---------|---------------------------|---------------------------|
| View bounding boxes | ✅ | ✅ |
| PDF viewing | ❌ | ✅ |
| PDF text selection | ❌ | ✅ |
| Table double-click nav | ❌ | ✅ |
| Multiple match nav | ❌ | ✅ |
| Bidirectional linking | ❌ | ✅ |
| Match counter | ❌ | ✅ |
| Auto-scroll | ❌ | ✅ |

## Best Practices

### For Data Verification

1. Start with suspicious or important values
2. Double-click to check original source
3. Use navigation to compare similar values
4. Note any extraction errors

### For Understanding Data

1. Select key terms in the PDF
2. Observe where they appear in table
3. Navigate between occurrences
4. Build mental model of data structure

### For Quality Control

1. Randomly sample table cells
2. Double-click to verify against PDF
3. Check extraction accuracy
4. Document any systematic errors

## Future Enhancements

Planned improvements:
- [ ] Highlight bounding boxes directly on PDF
- [ ] Color-code different field types
- [ ] Filter table by selected PDF region
- [ ] Export matched data
- [ ] Annotation support
- [ ] Multi-PDF comparison
- [ ] Batch verification mode

## API Reference

### EnhancedPDFTableLinker Props

```jsx
<EnhancedPDFTableLinker
  pdfFile={File}              // PDF file object
  boundingBoxData={Array}     // Bounding box data from extraction
  tableData={Array}           // Table data to display
/>
```

### Props Details

**pdfFile** (File object)
- Required: Yes
- Format: File object or blob URL
- Example: `files[0]` from file input

**boundingBoxData** (Array)
- Required: Yes
- Format: Array of objects with `{text, x0, y0, x1, y1, page}`
- Example: From phrase extraction API

**tableData** (Array)
- Required: Yes
- Format: Array of row objects
- Example: `[{Date: '2024-01-01', Name: 'John'}, ...]`

## Examples

### Basic Usage

```jsx
import EnhancedPDFTableLinker from './components/results/EnhancedPDFTableLinker';

function MyComponent({ pdfFile, extractedData }) {
  return (
    <EnhancedPDFTableLinker
      pdfFile={pdfFile}
      boundingBoxData={extractedData.boundingBoxes}
      tableData={extractedData.rows}
    />
  );
}
```

### With File Upload

```jsx
const [selectedFile, setSelectedFile] = useState(null);

return (
  <>
    <input
      type="file"
      accept=".pdf"
      onChange={(e) => setSelectedFile(e.target.files[0])}
    />
    
    {selectedFile && (
      <EnhancedPDFTableLinker
        pdfFile={selectedFile}
        boundingBoxData={boundingBoxData}
        tableData={tableData}
      />
    )}
  </>
);
```

---

## Summary

The Enhanced PDF-Table Linker provides:
✅ Click-and-drag selection in PDF
✅ Double-click navigation from table
✅ Multiple occurrence navigation with arrows
✅ Automatic highlighting and scrolling
✅ Bidirectional linking between views

**Usage:** Upload PDF → Run Phrase Extraction → Use the linker!

For questions or issues, see COMPONENTS_README.md or check the browser console for errors.
