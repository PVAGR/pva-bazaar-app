import React from "react";

export default function ShowroomSpecsPanel({ item }) {
  const catalog = item?.catalog || {};
  const sku = catalog.sku || item.id;
  const origin = catalog.origin || {};
  const dims = catalog.dimensions || {};
  const weight = catalog.weight || {};
  const gems = catalog.gemProperties || {};

  const specs = [
    { label: "SKU / ID", value: sku },
    { label: "Availability Status", value: catalog.availabilityStatus || "available" },
    { label: "Category", value: item.category || "N/A" },
    origin.country && { label: "Origin Country", value: origin.country },
    origin.region && { label: "Region", value: origin.region },
    dims.length && { label: "Dimensions", value: `${dims.length} × ${dims.width || 0} × ${dims.height || 0} ${dims.unit || "mm"}` },
    weight.value && { label: "Weight", value: `${weight.value} ${weight.unit || "ct"}` },
    gems.hardnessMohs && { label: "Mohs Hardness", value: gems.hardnessMohs },
    gems.color && { label: "Color", value: gems.color },
    gems.clarity && { label: "Clarity", value: gems.clarity },
    gems.cut && { label: "Cut / Shape", value: gems.cut },
    gems.treatmentStatus && { label: "Treatment", value: gems.treatmentStatus },
    catalog.isUnique && { label: "Uniqueness", value: "One-of-One" },
    !catalog.isUnique && catalog.bulkQuantity && { label: "Bulk Quantity", value: `${catalog.bulkQuantity} units` },
  ].filter(Boolean);

  return (
    <div className="showroom-specs-panel">
      <h2 className="specs-title">Technical Specifications</h2>
      <dl className="specs-grid">
        {specs.map((spec, idx) => (
          <div key={idx} className="spec-item">
            <dt className="spec-label">{spec.label}</dt>
            <dd className="spec-value">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
