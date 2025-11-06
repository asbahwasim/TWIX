import React, { useState } from 'react';
import TemplateView from './TemplateView';
import SequentialView from './SequentialView';

const ViewToggle = ({ data }) => {
  const [viewMode, setViewMode] = useState('sequential');
  const [activeTemplate, setActiveTemplate] = useState('');

  if (!data) {
    return <div>No data available</div>;
  }

  return (
    <div className="view-toggle-container">
      <div className="view-toggle-controls">
        <div className="toggle-buttons">
          <button
            className={`toggle-btn ${viewMode === 'sequential' ? 'active' : ''}`}
            onClick={() => setViewMode('sequential')}
          >
            Sequential View
          </button>
          <button
            className={`toggle-btn ${viewMode === 'template' ? 'active' : ''}`}
            onClick={() => setViewMode('template')}
          >
            Template View
          </button>
        </div>
      </div>

      <div className="view-content">
        {viewMode === 'sequential' ? (
          <SequentialView data={data.sequential} />
        ) : (
          <TemplateView
            data={data}
            activeTemplate={activeTemplate}
            onTemplateChange={setActiveTemplate}
          />
        )}
      </div>
    </div>
  );
};

export default ViewToggle;