import React, { useState } from "react";

export default function ShowroomInquiryForm({ item, onSubmit }) {
  const [formData, setFormData] = useState({
    requesterName: "",
    requesterEmail: "",
    requesterCompany: "",
    quantityRequested: 1,
    requestType: "sample",
    message: "",
    reservationRequested: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    // Validation
    if (!formData.requesterName.trim()) {
      setValidationError("Your name is required");
      return;
    }
    if (!formData.requesterEmail.trim()) {
      setValidationError("Your email is required");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.requesterEmail)) {
      setValidationError("Please enter a valid email address");
      return;
    }
    if (!formData.message.trim()) {
      setValidationError("Please leave a message with your inquiry");
      return;
    }
    if (formData.quantityRequested < 1) {
      setValidationError("Quantity must be at least 1");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        quantityRequested: Number(formData.quantityRequested) || 1,
      });
      // Reset form after successful submission
      setFormData({
        requesterName: "",
        requesterEmail: "",
        requesterCompany: "",
        quantityRequested: 1,
        requestType: "sample",
        message: "",
        reservationRequested: false,
      });
    } catch (err) {
      setValidationError(err.message || "Failed to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="showroom-inquiry-form" onSubmit={handleSubmit}>
      <h2 className="form-title">Send Your Inquiry</h2>
      <p className="form-subtitle">Tell us about your interest and needs. We'll respond within 24 hours.</p>

      <div className="form-grid">
        <input
          type="text"
          placeholder="Your Full Name *"
          value={formData.requesterName}
          onChange={(e) => handleChange("requesterName", e.target.value)}
          className="form-input"
          required
        />
        <input
          type="email"
          placeholder="Your Email *"
          value={formData.requesterEmail}
          onChange={(e) => handleChange("requesterEmail", e.target.value)}
          className="form-input"
          required
        />
        <input
          type="text"
          placeholder="Company / Brand Name"
          value={formData.requesterCompany}
          onChange={(e) => handleChange("requesterCompany", e.target.value)}
          className="form-input"
        />
        <input
          type="number"
          min="1"
          placeholder="Quantity Needed"
          value={formData.quantityRequested}
          onChange={(e) => handleChange("quantityRequested", e.target.value)}
          className="form-input"
        />
        <select
          value={formData.requestType}
          onChange={(e) => handleChange("requestType", e.target.value)}
          className="form-input"
        >
          <option value="sample">Sample Request</option>
          <option value="availability">Availability Check</option>
          <option value="bulk">Bulk Order</option>
          <option value="custom">Custom Specification</option>
          <option value="other">Other Inquiry</option>
        </select>
      </div>

      <textarea
        placeholder="Describe your needs and any specific requirements *"
        value={formData.message}
        onChange={(e) => handleChange("message", e.target.value)}
        rows={4}
        className="form-textarea"
        required
      />

      <label className="form-checkbox">
        <input
          type="checkbox"
          checked={formData.reservationRequested}
          onChange={(e) => handleChange("reservationRequested", e.target.checked)}
        />
        <span>Reserve this item while we discuss (if available)</span>
      </label>

      {validationError && (
        <div className="form-error">
          <span>⚠ {validationError}</span>
        </div>
      )}

      <button
        type="submit"
        className="form-submit-btn"
        disabled={submitting}
      >
        {submitting ? "Sending..." : "Submit Inquiry"}
      </button>
    </form>
  );
}
