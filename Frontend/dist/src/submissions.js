// Frontend API Client for Submissions
class SubmissionAPI {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  // Helper method for making API calls
  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.baseURL}/api/submissions${endpoint}`;
      const response = await fetch(url, {
        headers: {
          ...options.headers,
        },
        ...options
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Submit asset data
  async submitAsset(formData) {
    return this.makeRequest('/asset', {
      method: 'POST',
      body: formData // FormData object
    });
  }

  // Submit certificate data
  async submitCertificate(formData) {
    return this.makeRequest('/certificate', {
      method: 'POST',
      body: formData // FormData object
    });
  }

  // Submit provenance record
  async submitProvenanceRecord(data) {
    return this.makeRequest('/provenance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
  }

  // Get submissions by type
  async getSubmissions(type, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/${type}${queryString ? '?' + queryString : ''}`;
    return this.makeRequest(endpoint);
  }

  // Get specific submission
  async getSubmission(type, id) {
    return this.makeRequest(`/${type}/${id}`);
  }

  // Update submission status
  async updateSubmissionStatus(type, id, status) {
    return this.makeRequest(`/${type}/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status })
    });
  }

  // Get statistics
  async getStats() {
    return this.makeRequest('/stats/overview');
  }
}

// Form Handler for Asset Creation
class AssetSubmissionForm {
  constructor(formId, apiClient) {
    this.form = document.getElementById(formId);
    this.api = apiClient;
    this.init();
  }

  init() {
    if (!this.form) return;
    
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
    this.setupValidation();
    this.setupPreview();
  }

  setupValidation() {
    // Real-time validation
    const requiredFields = this.form.querySelectorAll('[required]');
    requiredFields.forEach(field => {
      field.addEventListener('blur', this.validateField.bind(this));
      field.addEventListener('input', this.clearFieldError.bind(this));
    });
  }

  validateField(event) {
    const field = event.target;
    const value = field.value.trim();
    
    // Remove existing error
    this.clearFieldError({ target: field });
    
    if (field.hasAttribute('required') && !value) {
      this.showFieldError(field, 'This field is required');
      return false;
    }
    
    // Specific validations
    if (field.type === 'email' && value && !this.isValidEmail(value)) {
      this.showFieldError(field, 'Please enter a valid email address');
      return false;
    }
    
    if (field.type === 'number' && value && isNaN(value)) {
      this.showFieldError(field, 'Please enter a valid number');
      return false;
    }
    
    return true;
  }

  clearFieldError(event) {
    const field = event.target;
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
      errorElement.remove();
    }
    field.classList.remove('error');
  }

  showFieldError(field, message) {
    field.classList.add('error');
    
    // Remove existing error
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
    
    // Add new error
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.style.color = '#e74c3c';
    errorElement.style.fontSize = '0.8rem';
    errorElement.style.marginTop = '4px';
    
    field.parentNode.appendChild(errorElement);
  }

  setupPreview() {
    // Update preview when form fields change
    const previewFields = ['assetName', 'description', 'physicalValue', 'materials'];
    previewFields.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.addEventListener('input', this.updatePreview.bind(this));
      }
    });
  }

  updatePreview() {
    // Update any preview elements
    const previewElements = {
      'prev-assetName': 'assetName',
      'prev-value': 'physicalValue',
      'prev-materials': 'materials'
    };

    Object.entries(previewElements).forEach(([previewId, fieldId]) => {
      const previewEl = document.getElementById(previewId);
      const field = document.getElementById(fieldId);
      
      if (previewEl && field) {
        const value = field.value.trim();
        previewEl.textContent = value || `[${fieldId.toUpperCase()}]`;
      }
    });
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    // Validate all fields
    const isValid = this.validateForm();
    if (!isValid) {
      this.showMessage('Please fix the errors above before submitting.', 'error');
      return;
    }

    // Show loading state
    this.setLoadingState(true);

    try {
      // Collect form data
      const formData = new FormData(this.form);
      
      // Add any additional processing
      this.processFormData(formData);
      
      // Submit to API
      const result = await this.api.submitAsset(formData);
      
      if (result.ok) {
        this.showMessage('Asset submitted successfully!', 'success');
        this.handleSuccessfulSubmission(result.data);
      } else {
        throw new Error(result.message || 'Submission failed');
      }
      
    } catch (error) {
      console.error('Submission error:', error);
      this.showMessage(`Error: ${error.message}`, 'error');
    } finally {
      this.setLoadingState(false);
    }
  }

  processFormData(formData) {
    // Auto-generate IDs if not provided
    if (!formData.get('contractId')) {
      formData.set('contractId', this.generateContractId());
    }
    
    if (!formData.get('pvaSerial')) {
      formData.set('pvaSerial', this.generatePVASerial());
    }
    
    // Ensure boolean fields are properly set
    const agreeTerms = document.getElementById('agreeTerms');
    if (agreeTerms) {
      formData.set('agreeTerms', agreeTerms.checked);
    }
  }

  validateForm() {
    const requiredFields = this.form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
      if (!this.validateField({ target: field })) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  handleSuccessfulSubmission(data) {
    // Reset form
    this.form.reset();
    
    // Redirect or show next steps
    setTimeout(() => {
      if (data.assetId) {
        // Optionally redirect to asset view
        console.log('Asset created with ID:', data.assetId);
      }
    }, 2000);
  }

  setLoadingState(loading) {
    const submitButton = this.form.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = loading;
      submitButton.textContent = loading ? 'Submitting...' : 'Submit Asset';
    }
  }

  showMessage(text, type = 'info') {
    // Remove existing messages
    const existingMessages = this.form.querySelectorAll('.form-message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageEl = document.createElement('div');
    messageEl.className = `form-message form-message-${type}`;
    messageEl.textContent = text;
    
    // Style the message
    messageEl.style.padding = '12px';
    messageEl.style.borderRadius = '6px';
    messageEl.style.marginBottom = '16px';
    messageEl.style.fontWeight = '500';
    
    switch (type) {
      case 'success':
        messageEl.style.backgroundColor = '#d4edda';
        messageEl.style.color = '#155724';
        messageEl.style.border = '1px solid #c3e6cb';
        break;
      case 'error':
        messageEl.style.backgroundColor = '#f8d7da';
        messageEl.style.color = '#721c24';
        messageEl.style.border = '1px solid #f5c6cb';
        break;
      default:
        messageEl.style.backgroundColor = '#d1ecf1';
        messageEl.style.color = '#0c5460';
        messageEl.style.border = '1px solid #bee5eb';
    }
    
    // Insert at top of form
    this.form.insertBefore(messageEl, this.form.firstChild);
    
    // Auto-remove success messages
    if (type === 'success') {
      setTimeout(() => {
        if (messageEl.parentNode) {
          messageEl.remove();
        }
      }, 5000);
    }
  }

  generateContractId() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const time = String(Date.now()).slice(-4);
    return `PVA-${year}-${month}${day}-${time}`;
  }

  generatePVASerial() {
    return `PVA${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Form Handler for Certificate Submission
class CertificateSubmissionForm {
  constructor(formId, apiClient) {
    this.form = document.getElementById(formId);
    this.api = apiClient;
    this.init();
  }

  init() {
    if (!this.form) return;
    
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
  }

  async handleSubmit(event) {
    event.preventDefault();
    
    try {
      const formData = new FormData(this.form);
      const result = await this.api.submitCertificate(formData);
      
      if (result.ok) {
        alert('Certificate submitted successfully!');
        this.form.reset();
      } else {
        throw new Error(result.message || 'Submission failed');
      }
      
    } catch (error) {
      console.error('Certificate submission error:', error);
      alert(`Error: ${error.message}`);
    }
  }
}

// Data Display Manager
class DataDisplayManager {
  constructor(apiClient) {
    this.api = apiClient;
  }

  // Display assets in marketplace
  async displayMarketplaceItems(containerId, filters = {}) {
    try {
      const result = await this.api.getSubmissions('marketplace', filters);
      const container = document.getElementById(containerId);
      
      if (!container) return;
      
      if (result.ok && result.data.length > 0) {
        container.innerHTML = this.renderMarketplaceItems(result.data);
      } else {
        container.innerHTML = '<p>No items available at this time.</p>';
      }
      
    } catch (error) {
      console.error('Error loading marketplace items:', error);
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '<p>Error loading items. Please try again.</p>';
      }
    }
  }

  renderMarketplaceItems(items) {
    return items.map(item => `
      <div class="marketplace-item" data-id="${item.id}">
        <div class="item-image">
          ${item.images.length > 0 ? 
            `<img src="${item.images[0]}" alt="${item.title}" loading="lazy">` :
            '<div class="placeholder-image">No Image</div>'
          }
        </div>
        <div class="item-info">
          <h3 class="item-title">${item.title}</h3>
          <p class="item-description">${item.description.substring(0, 100)}...</p>
          <div class="item-features">
            ${item.features.materials ? `<span class="feature">Materials: ${item.features.materials}</span>` : ''}
            ${item.features.origin ? `<span class="feature">Origin: ${item.features.origin}</span>` : ''}
            ${item.features.authenticated ? '<span class="feature verified">Authenticated</span>' : ''}
          </div>
          <div class="item-footer">
            <span class="item-price">$${item.price.toLocaleString()}</span>
            <span class="item-seller">by ${item.seller.name}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Display portfolio items
  async displayPortfolioItems(containerId, userId) {
    try {
      const result = await this.api.getSubmissions('portfolio', { userId });
      const container = document.getElementById(containerId);
      
      if (!container) return;
      
      if (result.ok && result.data.length > 0) {
        container.innerHTML = this.renderPortfolioItems(result.data);
      } else {
        container.innerHTML = '<p>No items in portfolio.</p>';
      }
      
    } catch (error) {
      console.error('Error loading portfolio items:', error);
    }
  }

  renderPortfolioItems(items) {
    return items.map(item => `
      <div class="portfolio-item" data-id="${item.id}">
        <div class="item-thumbnail">
          ${item.thumbnail ? 
            `<img src="${item.thumbnail}" alt="${item.title}">` :
            '<div class="placeholder-thumbnail">No Image</div>'
          }
        </div>
        <div class="item-details">
          <h4>${item.title}</h4>
          <p class="item-category">${item.category}</p>
          <div class="item-value">
            <span>Current Value: $${item.currentValue ? item.currentValue.toLocaleString() : 'N/A'}</span>
            <span>Ownership: ${item.sharePercentage}%</span>
          </div>
          <div class="item-status status-${item.status}">${item.status}</div>
        </div>
      </div>
    `).join('');
  }

  // Display statistics dashboard
  async displayStatsDashboard(containerId) {
    try {
      const result = await this.api.getStats();
      const container = document.getElementById(containerId);
      
      if (!container) return;
      
      if (result.ok) {
        container.innerHTML = this.renderStatsDashboard(result.data);
      }
      
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  renderStatsDashboard(stats) {
    return `
      <div class="stats-dashboard">
        <div class="stat-card">
          <h3>Total Submissions</h3>
          <span class="stat-number">${stats.total}</span>
        </div>
        <div class="stat-card">
          <h3>Assets</h3>
          <span class="stat-number">${stats.assets.total}</span>
          <div class="stat-breakdown">
            <small>Pending: ${stats.assets.pending}</small>
            <small>Approved: ${stats.assets.approved}</small>
          </div>
        </div>
        <div class="stat-card">
          <h3>Certificates</h3>
          <span class="stat-number">${stats.certificates.total}</span>
        </div>
        <div class="stat-card">
          <h3>Marketplace</h3>
          <span class="stat-number">${stats.marketplace.active}</span>
          <div class="stat-breakdown">
            <small>Active Listings</small>
          </div>
        </div>
      </div>
    `;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize API client
  const api = new SubmissionAPI();
  
  // Initialize forms
  const assetForm = new AssetSubmissionForm('asset-form', api);
  const certificateForm = new CertificateSubmissionForm('certificate-form', api);
  
  // Initialize display manager
  const displayManager = new DataDisplayManager(api);
  
  // Auto-load data for specific pages
  if (document.getElementById('marketplace-items')) {
    displayManager.displayMarketplaceItems('marketplace-items');
  }
  
  if (document.getElementById('portfolio-items')) {
    // Get user ID from wherever it's stored (localStorage, etc.)
    const userId = localStorage.getItem('userId') || 'guest';
    displayManager.displayPortfolioItems('portfolio-items', userId);
  }
  
  if (document.getElementById('stats-dashboard')) {
    displayManager.displayStatsDashboard('stats-dashboard');
  }
  
  // Make API and managers globally available
  window.PVASubmissions = {
    api,
    assetForm,
    certificateForm,
    displayManager
  };
});