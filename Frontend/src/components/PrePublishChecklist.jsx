import React from 'react';
import './PrePublishChecklist.css';

export default function PrePublishChecklist({ form = {} }) {
  const checks = [
    {
      id: 'title',
      label: 'Item title',
      satisfied: !!form.title?.trim(),
      hint: 'Give it a clear, descriptive name (e.g., "Handmade Afghan Pattern Scarf")',
    },
    {
      id: 'description',
      label: 'Description',
      satisfied: !!form.description?.trim() && form.description.length >= 20,
      hint: 'At least 20 characters; describe condition, materials, any damages',
    },
    {
      id: 'category',
      label: 'Category',
      satisfied: !!form.category,
      hint: 'Pick the best match (art, jewelry, clothing, etc.)',
    },
    {
      id: 'price',
      label: 'Price',
      satisfied: !!form.price && parseFloat(form.price) > 0,
      hint: 'Enter a price in cents or dollars',
    },
    {
      id: 'images',
      label: 'Photos',
      satisfied: Array.isArray(form.images) && form.images.length >= 1,
      hint: 'At least 1 photo required; up to 6 supported',
    },
  ];

  const satisfied = checks.filter((c) => c.satisfied).length;
  const total = checks.length;
  const canPublish = satisfied === total;

  return (
    <div className="pre-publish-checklist">
      <div className="checklist-header">
        <span className="checklist-title">Before you publish:</span>
        <span className={`checklist-status ${canPublish ? 'ready' : 'pending'}`}>
          {satisfied}/{total} ready
        </span>
      </div>

      <div className="checklist-items">
        {checks.map((check) => (
          <div
            key={check.id}
            className={`checklist-item ${check.satisfied ? 'satisfied' : 'pending'}`}
          >
            <span className="checklist-icon">{check.satisfied ? '✓' : '○'}</span>
            <div className="checklist-content">
              <span className="checklist-label">{check.label}</span>
              <span className="checklist-hint">{check.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {canPublish && (
        <div className="checklist-success">🎉 All set! Your listing is ready to publish.</div>
      )}
    </div>
  );
}
