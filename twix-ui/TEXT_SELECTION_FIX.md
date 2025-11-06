# PDF Text Selection Fix

## Problem
PDF text was not selectable - users couldn't click and drag to highlight text.

## Root Cause
The `react-pdf` library requires specific CSS files to be imported for the text layer to render properly. Without these CSS imports, the text layer doesn't display even though `renderTextLayer={true}` is set.

## Solution Applied

### Added Required CSS Imports

**Files Modified:**
1. `src/components/results/EnhancedPDFTableLinker.jsx`
2. `src/components/pdf/PDFViewer.jsx`

**Added these imports:**
```javascript
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
```

These CSS files:
- `AnnotationLayer.css` - Styles for PDF annotations
- `TextLayer.css` - **Critical** - Makes the text layer visible and selectable

## How to Verify Fix

### Step 1: Hard Refresh
```
Cmd + Shift + R (Mac)
Ctrl + Shift + R (Windows/Linux)
```

### Step 2: Check Text Layer Renders
1. Upload PDF and run phrase extraction
2. Open browser DevTools (F12)
3. Inspect the PDF page element
4. Look for `<div class="react-pdf__Page__textContent">`
5. Inside should be many `<span>` elements with text

**Example HTML structure you should see:**
```html
<div class="react-pdf__Page">
  <canvas class="react-pdf__Page__canvas"></canvas>
  <div class="react-pdf__Page__textContent">
    <span style="...">Investigation</span>
    <span style="...">Report</span>
    <!-- More spans -->
  </div>
</div>
```

### Step 3: Test Text Selection
1. Move your cursor over the PDF
2. Cursor should change to **text cursor** (I-beam) when over text
3. Click and drag to select text
4. Selected text should highlight in blue
5. Release mouse button
6. Console should log: "Text selected in PDF: [your text]"

### Step 4: Verify Selection Works
- **Table should highlight** matching cells in yellow
- **Match counter** should appear showing number of matches
- **Table should auto-scroll** to first match

## What This Fixes

| Before | After |
|--------|-------|
| ❌ Cursor stays as pointer | ✅ Cursor changes to I-beam over text |
| ❌ Can't select text | ✅ Can click and drag to select |
| ❌ No text layer visible | ✅ Text layer renders properly |
| ❌ No highlight on selection | ✅ Blue selection highlight appears |
| ❌ Can't trigger search | ✅ Selection triggers table search |

## Browser DevTools Inspection

### Check CSS is Loaded
1. Open DevTools (F12)
2. Go to "Elements" or "Inspector" tab
3. Find the PDF page div: `.react-pdf__Page__textContent`
4. Check "Computed" styles - should see:
   - `position: absolute`
   - `opacity: 0.2` or similar
   - Text spans should have positioning

### Check Text Spans
Each text span should have inline styles like:
```html
<span style="
  position: absolute;
  left: 100.5px;
  top: 200.3px;
  font-size: 12px;
  font-family: 'Times New Roman';
  transform: scaleX(1.1);
">
  Investigation
</span>
```

## Common Issues & Solutions

### Issue 1: Still Can't Select Text
**Check:**
- Is the text layer div present? (Inspect element)
- Are there span elements inside?
- Do spans have text content?

**Solutions:**
- Hard refresh (Cmd+Shift+R)
- Clear browser cache
- Check console for CSS load errors

### Issue 2: Text Layer Visible But Not Selectable
**Check:**
- Is pointer-events set to none?
- Is user-select disabled?

**Solution:**
Our CSS in `index.css` should override with:
```css
.react-pdf__Page__textContent {
  user-select: text !important;
}
```

### Issue 3: Scanned PDF (No Text Layer)
**Problem:** PDF is an image scan, not actual text

**Check:**
- Try selecting text in Adobe Reader/Preview
- If you can't select there either, it's a scanned image

**Solution:**
- Use a different PDF with actual text
- Or use OCR software to create text layer

## Testing Checklist

After refresh, verify:
- [ ] PDF loads without errors
- [ ] Green message: "✓ Text selection enabled"
- [ ] Cursor changes to I-beam over PDF text
- [ ] Can click and drag to select text
- [ ] Selected text highlights in blue
- [ ] Console logs: "Text selected in PDF: ..."
- [ ] Table cells highlight in yellow
- [ ] Match counter appears
- [ ] Navigation arrows appear (if >1 match)

## Technical Details

### Why CSS Import is Required

The `react-pdf` library separates rendering layers:
1. **Canvas layer** - Renders the visual PDF
2. **Text layer** - Invisible text overlays for selection
3. **Annotation layer** - Interactive elements

The text layer renders as positioned `<span>` elements that:
- Overlay exactly on top of canvas text
- Are styled to be transparent
- Are positioned absolutely using PDF coordinates
- Require CSS to set correct positioning, font sizes, and transforms

Without the CSS import:
- Spans render but have no positioning
- Text appears in wrong locations
- Selection doesn't work properly

### CSS File Contents

The imported CSS files handle:
- **Positioning**: Absolute positioning of text spans
- **Sizing**: Font sizes and scaling
- **Transforms**: Text rotation and skewing
- **Selection**: Text selection behavior
- **Visibility**: Transparency for overlay

## Additional Notes

- Text layer CSS is ~2KB, minimal overhead
- CSS is cached by browser after first load
- Works with all PDF.js supported fonts
- Compatible with rotated text
- Handles multi-line text properly

## Verification Command

To verify CSS files exist in node_modules:
```bash
ls -la node_modules/react-pdf/dist/esm/Page/*.css
```

Should show:
```
AnnotationLayer.css
TextLayer.css
```

---

**Status:** ✅ Fixed and ready to test

**Next:** Hard refresh browser and try selecting text in the PDF!
