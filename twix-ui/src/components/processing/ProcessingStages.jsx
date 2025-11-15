
import { useState, useEffect, useRef, useMemo } from 'react';
import TemplateEditor from '../template/TemplateEditor';
import DataDisplay from '../results/DataDisplay';
import UnifiedDashboard from '../results/UnifiedDashboard';
import BoundingBoxTable from '../pdf/BoundingBoxTable';
import EnhancedPDFTableLinker from '../results/EnhancedPDFTableLinker';
import PDFHighlighterPane from '../pdf/PDFHighlighterPane';
import Cost from './Cost';
import { 
  processPhrase, 
  predictFields, 
  predictTemplate, 
  extractData, 
  saveTemplate,
  cleanup 
} from '../../services/api';

import defaultBoundingBoxData from '../../Investigations_Redacted_modified_extracted_bb.json';

// Utility: Merge kv-type templates by context/grouping
function mergeKvTemplates(templates) {
  // Merge template_1 through template_5 (kv-type) into a single template
  const kvTemplateIds = ["template_1", "template_2", "template_3", "template_4", "template_5"];
  const kvTemplates = templates.filter(tpl => kvTemplateIds.includes(tpl.templateId));
  const nonKvTemplates = templates.filter(tpl => !kvTemplateIds.includes(tpl.templateId));

  if (kvTemplates.length === 0) return templates;

  // Collect all unique fields
  const allFields = Array.from(new Set(kvTemplates.flatMap(tpl => tpl.fields)));

  // Merge records: align by index, fill missing fields as 'missing'
  const maxRecords = Math.max(...kvTemplates.map(tpl => tpl.records.length));
  const mergedRecords = [];
  for (let i = 0; i < maxRecords; i++) {
    const record = {};
    allFields.forEach(field => {
      // Find value from the corresponding template
      const tpl = kvTemplates.find(t => t.fields.includes(field));
      record[field] = tpl && tpl.records[i] && tpl.records[i][field] !== undefined ? tpl.records[i][field] : "missing";
    });
    mergedRecords.push(record);
  }

  const mergedKvTemplate = {
    templateId: "template_1_5_kv_merged",
    key: allFields.join(","),
    fields: allFields,
    records: mergedRecords
  };

  return [mergedKvTemplate, ...nonKvTemplates];
}

function ProcessingStages({ currentStage, onStageChange, onProcessingStart, disabled, files }) {
  const [showConstructByExample, setShowConstructByExample] = useState(false);
  const [templateData, setTemplateData] = useState(null);
  const [editedTemplate, setEditedTemplate] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [editedTextContent, setEditedTextContent] = useState('');
  const [boundingBoxData, setBoundingBoxData] = useState([]);
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [aggregatedTemplates, setAggregatedTemplates] = useState(null);
  const [activeStage, setActiveStage] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCompleted, setProcessingCompleted] = useState(false);
  const [processingTime, setProcessingTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [stageIndividualCosts, setStageIndividualCosts] = useState({ phrase: null, field: null, template: null, extraction: null });
  const [totalCumulativeCost, setTotalCumulativeCost] = useState(0);
  // Removed Unified Dashboard state
  const [pdfViewerWidth, setPdfViewerWidth] = useState(550); // State for resizable PDF viewer (wider by default)
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(400);
  const pdfIframeRef = useRef(null);
  // Selected phrase to highlight in left PDF pane
  const [leftHighlight, setLeftHighlight] = useState(null);
  
  // Add caching for already processed stages
  const [cachedResults, setCachedResults] = useState({
    phrase: null,
    field: null,
    template: null,
    extraction: null
  });

  // Clear previous results when switching between stages
  useEffect(() => {
    if (activeStage) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [activeStage]);

  // Effect to log and ensure text content updates are visible
  useEffect(() => {
    if (textContent && textContent.length > 0) {
      console.log("Text content updated in state:", textContent);
      setShowResults(true);
    }
  }, [textContent]);

  // Effect to log template data updates
  useEffect(() => {
    if (templateData) {
      console.log("Template data updated in state:", templateData);
      console.log("Template data type:", typeof templateData);
      console.log("Template is array:", Array.isArray(templateData));
      setShowResults(true);
    }
  }, [templateData]);

  // Cleanup temporary files when component unmounts
  useEffect(() => {
    return () => {
      // Attempt to clean up temporary files
      cleanup().catch(err => console.error('Failed to cleanup:', err));
    };
  }, []);

  // Effect to calculate total cumulative cost whenever individual costs change
  useEffect(() => {
    let sum = 0;
    stages.forEach(stageInfo => {
      const cost = stageIndividualCosts[stageInfo.id];
      if (typeof cost === 'number') {
        sum += cost;
      }
    });
    setTotalCumulativeCost(sum);
  }, [stageIndividualCosts]);

  // Effect to handle the timer
  useEffect(() => {
    if (isProcessing) {
      // Reset and start timer
      setElapsedTime(0);
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    } else {
      // Clear timer when processing stops
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
    }
    
    // Cleanup interval on unmount
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [isProcessing]);

  // Format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const stages = [
    {
      id: 'phrase',
      label: 'Phrase Extraction',
      icon: '📝',
      description: 'Extract phrases',
      endpoint: 'phrase',
      apiFunction: processPhrase
    },
    {
      id: 'field',
      label: 'Field Prediction',
      icon: '🔍',
      description: 'Predict fields',
      endpoint: 'fields',
      apiFunction: predictFields
    },
    {
      id: 'template',
      label: 'Template Prediction',
      icon: '📋',
      description: 'View and edit template',
      endpoint: 'template',
      apiFunction: predictTemplate
    },
    {
      id: 'extraction',
      label: 'Data Extraction',
      icon: '📊',
      description: 'Extract and view data',
      endpoint: 'extract',
      apiFunction: extractData
    }
  ];

  // PDF Viewer resize handlers
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = pdfViewerWidth;
    // Capture events globally and prevent text selection
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    // Prevent iframe from stealing mouse events while dragging
    if (pdfIframeRef.current) {
      try { pdfIframeRef.current.style.pointerEvents = 'none'; } catch {}
    }
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;
    const delta = e.clientX - resizeStartXRef.current;
    const nextWidth = clamp(resizeStartWidthRef.current + delta, 250, 800);
    setPdfViewerWidth(nextWidth);
  };

  const handleMouseUp = () => {
    if (!isResizing) return;
    setIsResizing(false);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('blur', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (pdfIframeRef.current) {
      try { pdfIframeRef.current.style.pointerEvents = 'auto'; } catch {}
    }
  };

  // Handler to receive cell selections from the Sequential View
  const handleCellSelect = (selection) => {
    // selection: { value, rowIndex, columnKey, content }
    setLeftHighlight(selection);
  };

  // Download handlers for extraction stage
  const handleDownloadAggregated = () => {
    try {
      if (!aggregatedTemplates) {
        console.warn('No aggregated templates available to download');
        return;
      }
      const blob = new Blob([JSON.stringify({ templates: aggregatedTemplates }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aggregated_templates.json';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download aggregated templates:', e);
    }
  };

  const handleDownloadExtracted = () => {
    try {
      if (!processedData) {
        console.warn('No extracted data available to download');
        return;
      }
      const blob = new Blob([JSON.stringify(processedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'extracted_data.json';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Failed to download extracted data:', e);
    }
  };

  const handleStageClick = async (stage) => {
    try {
      // Hide results first for a smoother transition
      setShowResults(false);
      setError(null);
      setProcessingCompleted(false);
      setProcessingTime(null);
      setElapsedTime(0);
      
      // If clicking the same stage again, just toggle visibility
      if (stage === activeStage) {
        setActiveStage(null);
        return;
      }
      
      // Check if files are available
      if (!files || files.length === 0) {
        throw new Error('No files uploaded. Please upload PDF files first.');
      }
      
      // Set new active stage
      setActiveStage(stage);
      
      // Check if we have cached results for this stage
      if (cachedResults[stage]) {
        console.log(`Using cached results for ${stage} stage`);
        
        // Restore individual cost for this stage from cache
        const cachedIndividualCost = cachedResults[stage].cost;
        if (typeof cachedIndividualCost === 'number') {
          setStageIndividualCosts(prev => ({ ...prev, [stage]: cachedIndividualCost }));
        }
        
        // Restore cached data based on the stage
        if (stage === 'phrase') {
          setTextContent(cachedResults.phrase.textContent);
          setEditedTextContent(cachedResults.phrase.editedTextContent);
          if (cachedResults.phrase.boundingBoxData) {
            setBoundingBoxData(cachedResults.phrase.boundingBoxData);
          }
        } else if (stage === 'field') {
          setTextContent(cachedResults.field.textContent);
          setEditedTextContent(cachedResults.field.editedTextContent);
        } else if (stage === 'template') {
          setTemplateData(cachedResults.template.templateData);
          setEditedTemplate(cachedResults.template.editedTemplate);
        } else if (stage === 'extraction') {
          setProcessedData(cachedResults.extraction.processedData);
          if (cachedResults.extraction.aggregatedTemplates) {
            setAggregatedTemplates(cachedResults.extraction.aggregatedTemplates);
          }
        }
        
        setShowResults(true);
        onStageChange(stage, cachedResults[stage].data);
        return;
      }
      
      // If no cached results, process the stage
      setIsProcessing(true);
      const startTime = Date.now();
      
      // Notify parent component that processing has started
      if (onProcessingStart) {
        onProcessingStart();
      }
      
      // Clear previous stage data only for the current stage
      if (stage === 'phrase' || stage === 'field') {
        setTextContent('');
        setEditedTextContent('');
      } else if (stage === 'template') {
        setTemplateData(null);
        setEditedTemplate(null);
      } else if (stage === 'extraction') {
        setProcessedData(null);
      }
      
      const stageInfo = stages.find(s => s.id === stage);
      
      // Use the API service functions with the uploaded files
      let data;
      if (stage === 'phrase') {
        data = await stageInfo.apiFunction(files);
        console.log("Phrase data received:", data);
        
        let currentStageCost = 0;
        // Get individual cost for this stage run
        if (data.cost !== undefined) {
          currentStageCost = Number(data.cost) || 0;
        }
        // Update the state with the individual cost
        setStageIndividualCosts(prev => ({ ...prev, phrase: currentStageCost }));
        
        // Store bounding box data if available
        if (data.boundingBoxData) {
          console.log("Bounding box data received:", data.boundingBoxData);
          setBoundingBoxData(data.boundingBoxData);
        } else {
          setBoundingBoxData([]);
        }
        
        // Define a variable to store content for caching
        let phrasesContent = '';
        let phrases = [];
        
        // Use the exact content that was downloaded if available
        if (data.downloadedContent) {
          console.log("Using downloaded content for display:", data.downloadedContent);
          // Store as a single string to preserve exact formatting
          setTextContent(data.downloadedContent);
          setEditedTextContent(data.downloadedContent);
          phrasesContent = data.downloadedContent;
        } else {
          // Extract and process phrases from the response as before
          if (data.phrases) {
            console.log("Raw phrases data:", data.phrases);
            if (typeof data.phrases === 'object' && !Array.isArray(data.phrases)) {
              // If phrases is an object with nested data, extract all values
              Object.values(data.phrases).forEach(phraseGroup => {
                if (Array.isArray(phraseGroup)) {
                  phrases = phrases.concat(phraseGroup.filter(p => p && typeof p === 'string'));
                } else if (typeof phraseGroup === 'string') {
                  phrases.push(phraseGroup);
                }
              });
            } else if (Array.isArray(data.phrases)) {
              phrases = data.phrases.filter(p => p && typeof p === 'string');
            } else if (typeof data.phrases === 'string') {
              phrases = [data.phrases];
            }
          }
          
          // Remove any empty strings and duplicates
          phrases = [...new Set(phrases)].filter(Boolean);
          console.log("Processed phrases:", phrases);
          console.log("Phrases length:", phrases.length);
          
          if (phrases.length === 0) {
            console.log("No phrases found, using sample data");
            phrases = [
              "22222-- 30",
              "(Program MORNING",
              "Week 06/17/22",
              "11111-- 30",
              "(Program ACTION",
              "Week 06/17/22"
            ];
          }
          
          // Join phrases with newlines to match download format
          phrasesContent = phrases.join('\n');
          setTextContent(phrasesContent);
          setEditedTextContent(phrasesContent);
          console.log("Text content set to:", phrasesContent);
        }
        
        // Cache the results including cost
        setCachedResults(prev => ({
          ...prev,
          phrase: {
            data,
            textContent: phrasesContent || phrases,
            editedTextContent: phrasesContent || phrases,
            boundingBoxData: data.boundingBoxData || [],
            cost: currentStageCost
          }
        }));
      } else if (stage === 'field') {
        data = await stageInfo.apiFunction(files);
        // Ensure fields is an array
        const fields = Array.isArray(data.fields) ? data.fields : 
                      (data.fields ? [data.fields] : []);
        setTextContent(fields);
        setEditedTextContent(fields);
        
        let currentStageCost = 0;
        // Get individual cost for this stage run
        if (data.cost !== undefined) {
          currentStageCost = Number(data.cost) || 0;
        }
        // Update the state with the individual cost
        setStageIndividualCosts(prev => ({ ...prev, field: currentStageCost }));
        
        // Cache the results including cost
        setCachedResults(prev => ({
          ...prev,
          field: {
            data,
            textContent: fields,
            editedTextContent: fields,
            cost: currentStageCost
          }
        }));
      } else if (stage === 'template') {
        data = await stageInfo.apiFunction(files);
        console.log("Template data received:", data);
        
        let currentStageCost = 0;
        // Get individual cost for this stage run
        if (data.cost !== undefined) {
          currentStageCost = Number(data.cost) || 0;
        }
        // Update the state with the individual cost
        setStageIndividualCosts(prev => ({ ...prev, template: currentStageCost }));
        
        // Extract template from the response
        let template = [];
        
        if (data) {
          if (data.template) {
            // The backend returns { status: 'success', template: [...] }
            if (Array.isArray(data.template)) {
              template = data.template;
              console.log("Template is an array with", template.length, "sections");
            } else if (typeof data.template === 'object') {
              template = [data.template];
              console.log("Template is an object, converting to array");
            } else {
              console.error("Unexpected template format:", data.template);
            }
          } else if (Array.isArray(data)) {
            // The API might be returning the template directly as an array
            template = data;
            console.log("Data is directly an array with", template.length, "items");
          } else {
            console.error("Unexpected data format:", data);
          }
        }
        
        console.log("Raw template from backend:", template);
        
        // Extract fields from the log output if needed
        // This is a workaround for when the backend doesn't include fields in the response
        const extractFieldsFromLog = (nodeId) => {
          // This would normally parse the log output to find fields for a given node_id
          // For now, we'll return some default fields based on the section type
          if (nodeId === 0) {
            return ['Date', 'Number', 'Investigator', 'Date Assigned', 'Racial', 'Category / Type', 'Location Of Occurrence', 'Disposition', 'Completed', 'Recorded On Camera'];
          } else if (nodeId === 1) {
            return ['Address', 'H Phone', 'Gender', 'DOB', 'Complainant'];
          } else if (nodeId === 2) {
            return ['Type Of Complaint', 'Description', 'Complaint Disposition'];
          } else if (nodeId === 3) {
            return ['Name', 'ID No.', 'Rank', 'Division', 'Officer Disposition', 'Action Taken', 'Body Cam'];
          }
          return ['New Field']; // Default field
        };
        
        // Make sure each section has the necessary properties for the editor
        const normalizedTemplate = template.map(section => {
          console.log("Processing section:", section);
          
          // Create a new section object with all required properties
          const normalizedSection = {
            // Ensure type is either 'kv' or 'table'
            type: (section.type && (section.type === 'kv' || section.type === 'table')) 
                  ? section.type 
                  : 'kv',
                  
            // Ensure fields is an array
            fields: Array.isArray(section.fields) && section.fields.length > 0
                    ? [...section.fields] // Create a copy to avoid reference issues
                    : [],
                    
            // Copy other properties
            bid: section.bid || [],
            child: section.child || -1,
            node_id: section.node_id !== undefined ? section.node_id : 0
          };
          
          // If fields is empty but we have node_id, try to extract fields from the log output
          if (normalizedSection.fields.length === 0 && normalizedSection.node_id !== undefined) {
            console.log(`Section ${normalizedSection.node_id} has no fields, attempting to extract from template data`);
            normalizedSection.fields = extractFieldsFromLog(normalizedSection.node_id);
            console.log(`Extracted fields for section ${normalizedSection.node_id}:`, normalizedSection.fields);
          }
          
          return normalizedSection;
        });
        
        console.log("Normalized template:", normalizedTemplate);
        
        // Ensure the template is initialized to an empty array if null or undefined
        setTemplateData(normalizedTemplate || []);
        setEditedTemplate(normalizedTemplate || []);
        
        // Cache the results including cost
        setCachedResults(prev => ({
          ...prev,
          template: {
            data,
            templateData: normalizedTemplate || [],
            editedTemplate: normalizedTemplate || [],
            cost: currentStageCost
          }
        }));
      } else if (stage === 'extraction') {
        data = await stageInfo.apiFunction(files);
        console.log("Data extraction raw response:", data);
        
        let currentStageCost = 0;
        // Get individual cost for this stage run
        if (data.cost !== undefined) {
          currentStageCost = Number(data.cost) || 0;
        }
        // Update the state with the individual cost
        setStageIndividualCosts(prev => ({ ...prev, extraction: currentStageCost }));
        
        // Handle different data formats
        let extractedData = {};
        
        if (data) {
          if (data.data && data.status === 'success') {
            // If data is nested in a 'data' property
            extractedData = data.data;
            console.log("Using data property from response");
          } else if (data.data_file) {
            // If data has a data_file property
            console.log("Found data_file property in response");
            extractedData = data;
          } else if (Array.isArray(data)) {
            // If data is directly an array
            console.log("Data is an array with", data.length, "items");
            extractedData = data;
          } else if (typeof data === 'object') {
            // If data is directly an object
            console.log("Data is an object");
            extractedData = data;
          }
        }
        
        console.log("Processed extraction data:", extractedData);
        setProcessedData(extractedData);

        // Build aggregated templates from extracted data so UI/Downloads can use them
        try {
          const flattenToRows = (node) => {
            const rows = [];
            if (!node) return rows;
            if (Array.isArray(node)) {
              node.forEach(n => rows.push(...flattenToRows(n)));
              return rows;
            }
            if (typeof node !== 'object') return rows;
            if (Array.isArray(node.content) && node.content.length > 0) {
              node.content.forEach(child => rows.push(...flattenToRows(child)));
              return rows;
            }
            if (node.type === 'table' && Array.isArray(node.content)) {
              node.content.forEach(child => rows.push(...flattenToRows(child)));
              return rows;
            }
            // plain row object
            rows.push(node);
            return rows;
          };

          // Collect all candidate row objects from extractedData
          const allRows = [];
          const collect = (obj) => {
            if (!obj) return;
            if (Array.isArray(obj)) {
              obj.forEach(item => collect(item));
              return;
            }
            if (typeof obj === 'object') {
              // If object is a mapping of file -> records, iterate values
              const maybeArrayValues = Object.values(obj);
              // Heuristic: if top-level is mapping of arrays, flatten those arrays
              if (maybeArrayValues.length > 0 && maybeArrayValues.every(v => Array.isArray(v))) {
                maybeArrayValues.forEach(v => v.forEach(rec => allRows.push(...flattenToRows(rec))));
                return;
              }
              // Otherwise attempt to flatten this object itself
              allRows.push(...flattenToRows(obj));
            }
          };

          collect(extractedData);

          // Group rows by their sorted key set
          const templatesMap = new Map();
          allRows.forEach(row => {
            if (!row || typeof row !== 'object') return;
            const keys = Object.keys(row).sort();
            const key = keys.join(',');
            if (!templatesMap.has(key)) templatesMap.set(key, { fields: keys, records: [] });
            templatesMap.get(key).records.push(row);
          });

          let templatesArray = Array.from(templatesMap.entries()).map(([key, val], idx) => ({
            templateId: `template_${idx}`,
            key,
            fields: val.fields,
            records: val.records
          }));

          // Merge kv-type templates by context
          templatesArray = mergeKvTemplates(templatesArray);

          setAggregatedTemplates(templatesArray);

          // Cache merged templates as part of extraction cache
          setCachedResults(prev => ({
            ...prev,
            extraction: {
              data,
              processedData: extractedData,
              aggregatedTemplates: templatesArray,
              cost: currentStageCost
            }
          }));
        } catch (err) {
          console.error('Failed to build aggregated templates:', err);
          setAggregatedTemplates(null);
        }
        
        // Cache the results including cost
        setCachedResults(prev => ({
          ...prev,
          extraction: {
            data,
            processedData: extractedData,
            cost: currentStageCost
          }
        }));
      }

      // Show results after data is loaded
      setShowResults(true);
      setIsProcessing(false);
      setProcessingCompleted(true);
      const totalTime = (Date.now() - startTime) / 1000; // Convert to seconds
      setProcessingTime(totalTime); 
      // Also update elapsedTime to match the total time
      setElapsedTime(Math.round(totalTime));
      onStageChange(stage, data);
    } catch (err) {
      setError(err.message);
      console.error('Processing failed:', err);
      setIsProcessing(false);
      setProcessingCompleted(true);
      setProcessingTime(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextDownload = (stage) => {
    try {
      // Use the content directly if it's a string, otherwise convert array to string
      const content = typeof editedTextContent === 'string' 
                     ? editedTextContent 
                     : Array.isArray(editedTextContent) 
                       ? editedTextContent.join('\n') 
                       : '';
                     
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stage}_results.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Failed to download: ${err.message}`);
      console.error('Download failed:', err);
    }
  };

  const handleTemplateDownload = () => {
    try {
      const content = JSON.stringify(editedTemplate || [], null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(`Failed to download template: ${err.message}`);
      console.error('Template download failed:', err);
    }
  };

  const handleTemplateSave = async () => {
    try {
      await saveTemplate(editedTemplate || []);
      alert('Template saved successfully!');
    } catch (err) {
      setError(err.message);
      console.error('Failed to save template:', err);
    }
  };

  const handleCleanup = async () => {
    try {
      await cleanup();
      alert('Temporary files cleaned up successfully!');
    } catch (err) {
      setError(err.message);
      console.error('Failed to cleanup:', err);
    }
  };

  // Function to safely handle textarea changes
  const handleTextAreaChange = (e) => {
    try {
      const value = e.target.value;
      console.log("Textarea value changed");
      
      // Store as a string to preserve exact formatting
      setEditedTextContent(value);
    } catch (err) {
      console.error('Error updating text content:', err);
      setEditedTextContent('');
    }
  };

  return (
    <div className="space-y-4">
      {isProcessing && (
        <div className="bg-blue-50 p-3 rounded-lg mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-blue-700 font-medium">Processing...</span>
          </div>
          <span className="text-blue-700 font-medium">{formatTime(elapsedTime)}</span>
        </div>
      )}
      
      {processingCompleted && !isProcessing && (
        <div className="bg-green-50 p-3 rounded-lg mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700 font-medium">Processing completed</span>
          </div>
          <span className="text-green-700">
            {processingTime 
              ? formatTime(Math.round(processingTime))
              : formatTime(elapsedTime)}
          </span>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Processing Stages</h2>
        <div className="flex items-center">
          <button
            onClick={handleCleanup}
            className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
          >
            Cleanup Files
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage) => (
          <button
            key={stage.id}
            onClick={() => handleStageClick(stage.id)}
            disabled={disabled || isProcessing}
            className={`
              p-4 rounded-lg border transition-all
              ${activeStage === stage.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'}
              ${(disabled || isProcessing) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-2xl mb-2">{stage.icon}</div>
            <div className="font-medium text-gray-800">{stage.label}</div>
            <div className="text-sm text-gray-600 mt-1">{stage.description}</div>
          </button>
        ))}
      </div>

      {/* Results Section - Only show if a stage is active and showResults is true */}
      {showResults && (
        <div className="bg-white p-6 rounded-lg shadow-sm mt-4 border">
          {/* Calculate Cumulative Cost up to the active stage */}
          {(() => {
            let cumulativeUpToActive = 0;
            const activeStageIndex = stages.findIndex(s => s.id === activeStage);
            if (activeStageIndex !== -1) {
              for (let i = 0; i <= activeStageIndex; i++) {
                const stageId = stages[i].id;
                const cost = stageIndividualCosts[stageId];
                if (typeof cost === 'number') {
                  cumulativeUpToActive += cost;
                }
              }
            }
            
            return (
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {stages.find(s => s.id === activeStage)?.label} Results
                </h3>
                {/* Render cost only if the current stage completed */}
                {typeof stageIndividualCosts[activeStage] === 'number' && 
                  <Cost cost={cumulativeUpToActive} />
                }
              </div>
            );
          })()}
          
          {/* Text Content Editor (for phrase and field) */}
          {(activeStage === 'phrase' || activeStage === 'field') && (
            <div>
              {/* Move Download button up here for phrase stage */}
              {activeStage === 'phrase' && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => handleTextDownload(activeStage)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download Phrases
                  </button>
                </div>
              )}
              {/* Only display textarea for field prediction */}
              {activeStage === 'field' && (
                <div className="bg-white rounded-lg shadow-sm border p-4">
                  <textarea
                    value={typeof editedTextContent === 'string' 
                      ? editedTextContent 
                      : Array.isArray(editedTextContent) && editedTextContent.length > 0 
                        ? editedTextContent.join('\n') 
                        : 'No fields predicted yet...'}
                    onChange={handleTextAreaChange}
                    className="w-full h-96 font-mono text-sm p-4 border rounded bg-gray-50"
                    placeholder="No fields predicted yet..."
                  />
                </div>
              )}
              
              {/* Enhanced PDF-Table Linker (only for phrase stage) */}
              {activeStage === 'phrase' && boundingBoxData && boundingBoxData.length > 0 && (
                <div className="mt-8">
                  <EnhancedPDFTableLinker
                    pdfFile={files && files.length > 0 ? files[0] : null}
                    boundingBoxData={boundingBoxData}
                    tableData={boundingBoxData}
                  />
                </div>
              )}
            </div>
          )}

          {/* Template Editor */}
          {activeStage === 'template' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Template Editor</h3>
                <div className="space-x-2">
                  <button
                    onClick={handleTemplateSave}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Save Template
                  </button>
                  <button
                    onClick={handleTemplateDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Download Template
                  </button>
                </div>
              </div>
              
              {templateData !== null ? (
                <TemplateEditor 
                  template={editedTemplate || []} 
                  onChange={(newTemplate) => {
                    console.log("Template updated:", newTemplate);
                    setEditedTemplate(newTemplate);
                  }}
                />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
                  <p className="text-gray-600">No template structure detected. You can add sections manually.</p>
                  <button
                    onClick={() => {
                      const initialTemplate = [{type: 'kv', fields: ['New Field']}];
                      setEditedTemplate(initialTemplate);
                      setTemplateData(initialTemplate);
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Create Empty Template
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Data Display */}
          {activeStage === 'extraction' && processedData && (
            <div className="flex gap-0 w-full overflow-hidden">
              {/* PDF Viewer - Left Side (Resizable) */}
              <div style={{ width: pdfViewerWidth, minWidth: 250, maxWidth: 800, flexShrink: 0 }}>
                <div className="sticky top-4 pr-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">PDF Preview</h3>
                  <div className="border rounded-lg overflow-hidden bg-gray-50 shadow-sm">
                    {files && files.length > 0 ? (
                      <PDFHighlighterPane
                        pdfFile={files[0]}
                        boundingBoxData={(boundingBoxData && boundingBoxData.length) ? boundingBoxData : (defaultBoundingBoxData || [])}
                        targetValue={leftHighlight?.value}
                        targetRowIndex={leftHighlight?.rowIndex}
                        targetColumnKey={leftHighlight?.columnKey}
                      />
                    ) : (
                      <div className="p-8 text-gray-400 text-center">No PDF uploaded</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Resizable Divider */}
              <div
                onMouseDown={handleMouseDown}
                className="w-2 cursor-col-resize hover:bg-blue-200 active:bg-blue-300 transition-colors flex-shrink-0 relative group"
                style={{ marginLeft: -4, marginRight: -4 }}
              >
                <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gray-300 group-hover:bg-blue-400" />
              </div>

              {/* Data Display & Construct-by-Example area */}
              <div className="flex-1 min-w-0 pl-4 overflow-auto flex gap-4">
                {/* Show the main data view ONLY when Construct-by-Example is closed */}
                {!showConstructByExample && (
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">View Options</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleDownloadAggregated}
                          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          title="Download aggregated templates as JSON"
                        >
                          Download Aggregated
                        </button>

                        <button
                          onClick={handleDownloadExtracted}
                          className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                          title="Download raw extracted data as JSON"
                        >
                          Download Extracted
                        </button>

                        <button
                          className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
                          onClick={() => setShowConstructByExample(true)}
                          title="Use Construct-by-Example to create your desired output table format."
                        >
                          Construct-by-Example
                        </button>
                      </div>
                    </div>
                    <DataDisplay 
                      data={processedData} 
                      aggregatedTemplates={aggregatedTemplates} 
                      cost={totalCumulativeCost}
                      pdfFile={files && files.length > 0 ? files[0] : null}
                      onCellSelect={handleCellSelect}
                    />
                  </div>
                )}

                {/* When Construct-by-Example is open, expand it to take the full right area */}
                {showConstructByExample && (
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-lg shadow-lg p-4 border">
                      <div className="mb-2">
                        <h2 className="text-lg font-semibold">Construct-by-Example</h2>
                      </div>
                      <ConstructByExampleModal onClose={() => setShowConstructByExample(false)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Construct-by-Example Components ---

function ConstructByExampleModal({ onClose }) {
  const initialTable = useMemo(() => Array.from({ length: 10 }, () => Array(10).fill('')), []);
  const [table, setTable] = useState(initialTable);

  // Add Row
  const handleAddRow = () => {
    setTable(prev => [...prev, Array(prev[0].length).fill('')]);
  };
  // Add Column
  const handleAddColumn = () => {
    setTable(prev => prev.map(row => [...row, '']));
  };
  // Delete Row (except header)
  const handleDeleteRow = () => {
    setTable(prev => prev.length > 2 ? prev.slice(0, -1) : prev); // keep at least header + 1 row
  };
  // Delete Column (except one col)
  const handleDeleteColumn = () => {
    setTable(prev => prev[0].length > 1 ? prev.map(row => row.slice(0, -1)) : prev);
  };

  const handleCellChange = (rowIdx, colIdx, value) => {
    setTable(prev => {
      const updated = prev.map(row => [...row]);
      updated[rowIdx][colIdx] = value;
      return updated;
    });
  };

  const handleSave = () => {
    const headers = table[0].filter(h => h.trim() !== '');
    if (headers.length === 0) {
      alert('Please add at least one header in the first row.');
      return;
    }

    const rows = table.slice(1).filter(row => row.some(cell => cell.trim() !== ''));
    const result = rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      return obj;
    });

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'constructed_example.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => setTable(initialTable);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 border w-full max-w-full max-h-[90vh] flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Construct-by-Example</h2>

      {/* Table Controls */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs" onClick={handleAddRow}>Add Row</button>
        <button className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs" onClick={handleAddColumn}>Add Column</button>
        <button className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs" onClick={handleDeleteRow} disabled={table.length <= 2}>Delete Row</button>
        <button className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs" onClick={handleDeleteColumn} disabled={table[0].length <= 1}>Delete Column</button>
      </div>

      <div className="overflow-auto mb-4 border rounded-lg flex-1">
        <table className="min-w-full border-collapse">
          <tbody>
            {table.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, colIdx) => (
                  <td key={colIdx} className={`border p-1 ${rowIdx === 0 ? 'bg-gray-100 font-bold' : ''}`}>
                    <input
                      type="text"
                      value={cell}
                      onChange={e => handleCellChange(rowIdx, colIdx, e.target.value)}
                      className="w-20 px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={rowIdx === 0 ? `Header ${colIdx + 1}` : ''}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2 justify-end mt-2">
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleSave}
        >
          Save Example
        </button>
        <button
          className="px-3 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          onClick={handleClear}
        >
          Clear Table
        </button>
        <button
          className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="mt-2 text-sm text-gray-500">
        Fill the first row with headers, then add example values below. Save to download as JSON.
      </div>
    </div>
  );
}

export default ProcessingStages; 