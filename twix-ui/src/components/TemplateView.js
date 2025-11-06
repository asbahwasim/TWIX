import React from 'react';
import { Table } from './Table';
import { KeyValuePairs } from './KeyValuePairs';

const TemplateView = ({ data, activeTemplate, onTemplateChange }) => {
  if (!data || !data.templates) {
    return <div>No template data available</div>;
  }

  const templates = Object.keys(data.templates);

  return (
    <div className="template-view">
      <div className="template-selector">
        <select 
          value={activeTemplate} 
          onChange={(e) => onTemplateChange(e.target.value)}
          className="template-select"
        >
          <option value="">Select a template</option>
          {templates.map((template) => (
            <option key={template} value={template}>
              {template.split(',').join(', ')}
            </option>
          ))}
        </select>
      </div>

      {activeTemplate && data.templates[activeTemplate] && (
        <div className="template-content">
          {data.templates[activeTemplate].map((item, index) => (
            <div key={index} className="template-item">
              {item.type === 'table' ? (
                <Table data={item.content} />
              ) : (
                <KeyValuePairs data={item.content} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateView;