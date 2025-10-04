/**
 * Real-time Updates Manager for PVA Bazaar
 * Connects to Server-Sent Events to receive live updates
 */

class PVARealtimeManager {
  constructor() {
    this.eventSource = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
  }

  /**
   * Connect to the real-time events stream
   */
  connect() {
    if (this.eventSource && this.isConnected) {
      console.log('Already connected to real-time updates');
      return;
    }

    try {
      const apiBaseUrl = this.getApiBaseUrl();
      this.eventSource = new EventSource(`${apiBaseUrl}/api/events/stream`);

      this.eventSource.onopen = () => {
        console.log('✅ Connected to PVA real-time updates');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.showConnectionStatus('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleUpdate(data);
        } catch (error) {
          console.error('Error parsing real-time update:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Real-time connection error:', error);
        this.isConnected = false;
        this.showConnectionStatus('disconnected');
        this.attemptReconnect();
      };

    } catch (error) {
      console.error('Failed to establish real-time connection:', error);
      this.showConnectionStatus('error');
    }
  }

  /**
   * Disconnect from the real-time stream
   */
  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected = false;
      this.showConnectionStatus('disconnected');
      console.log('Disconnected from real-time updates');
    }
  }

  /**
   * Add a listener for specific update types
   */
  addListener(updateType, callback) {
    if (!this.listeners.has(updateType)) {
      this.listeners.set(updateType, []);
    }
    this.listeners.get(updateType).push(callback);
  }

  /**
   * Remove a listener
   */
  removeListener(updateType, callback) {
    if (this.listeners.has(updateType)) {
      const callbacks = this.listeners.get(updateType);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming updates
   */
  handleUpdate(updateData) {
    const { type, data, timestamp } = updateData;
    
    console.log('📡 Real-time update received:', type, data);

    // Call specific listeners
    if (this.listeners.has(type)) {
      this.listeners.get(type).forEach(callback => {
        try {
          callback(data, timestamp);
        } catch (error) {
          console.error('Error in update listener:', error);
        }
      });
    }

    // Handle common update types
    switch (type) {
      case 'new_asset':
        this.handleNewAsset(data);
        break;
      case 'new_certificate':
        this.handleNewCertificate(data);
        break;
      case 'new_marketplace_listing':
        this.handleNewMarketplaceListing(data);
        break;
      case 'connected':
        console.log('Connected to real-time updates:', data);
        break;
      default:
        console.log('Unknown update type:', type);
    }
  }

  /**
   * Handle new asset submissions
   */
  handleNewAsset(assetData) {
    // Update dashboard if visible
    this.updateDashboardStats();
    
    // Show notification
    this.showNotification('New Asset Created', `${assetData.name} by ${assetData.artisan}`, 'success');
    
    // Update portfolio if this is user's asset
    this.updatePortfolioDisplay();
  }

  /**
   * Handle new certificate submissions
   */
  handleNewCertificate(certData) {
    // Update certificates display
    this.updateCertificatesDisplay();
    
    // Show notification
    this.showNotification('New Certificate', `Certificate for ${certData.name}`, 'info');
  }

  /**
   * Handle new marketplace listings
   */
  handleNewMarketplaceListing(listingData) {
    // Update marketplace display
    this.updateMarketplaceDisplay();
    
    // Show notification
    this.showNotification('New Item Listed', `${listingData.title} - $${listingData.price}`, 'success');
  }

  /**
   * Update dashboard statistics
   */
  updateDashboardStats() {
    // Check if we're on the dashboard page
    if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('pvadashboard')) {
      // Refresh stats without full page reload
      if (typeof window.loadDashboardStats === 'function') {
        window.loadDashboardStats();
      }
    }
  }

  /**
   * Update portfolio display
   */
  updatePortfolioDisplay() {
    if (window.location.pathname.includes('portfolio')) {
      // Refresh portfolio without full page reload
      if (typeof window.loadPortfolioData === 'function') {
        window.loadPortfolioData();
      }
    }
  }

  /**
   * Update marketplace display
   */
  updateMarketplaceDisplay() {
    if (window.location.pathname.includes('marketplace')) {
      // Refresh marketplace without full page reload
      if (typeof window.loadMarketplaceItems === 'function') {
        window.loadMarketplaceItems();
      }
    }
  }

  /**
   * Update certificates display
   */
  updateCertificatesDisplay() {
    if (window.location.pathname.includes('cert') || window.location.pathname.includes('certificate')) {
      // Refresh certificates without full page reload
      if (typeof window.loadCertificates === 'function') {
        window.loadCertificates();
      }
    }
  }

  /**
   * Show connection status indicator
   */
  showConnectionStatus(status) {
    // Create or update status indicator
    let indicator = document.getElementById('realtime-status');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'realtime-status';
      indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        font-weight: bold;
        z-index: 10000;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(indicator);
    }

    switch (status) {
      case 'connected':
        indicator.textContent = '🟢 Live';
        indicator.style.backgroundColor = '#4CAF50';
        indicator.style.color = 'white';
        break;
      case 'disconnected':
        indicator.textContent = '🔴 Offline';
        indicator.style.backgroundColor = '#f44336';
        indicator.style.color = 'white';
        break;
      case 'error':
        indicator.textContent = '⚠️ Error';
        indicator.style.backgroundColor = '#ff9800';
        indicator.style.color = 'white';
        break;
    }
  }

  /**
   * Show notification to user
   */
  showNotification(title, message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 50px;
      right: 20px;
      max-width: 300px;
      padding: 15px;
      border-radius: 5px;
      color: white;
      font-weight: bold;
      z-index: 10001;
      animation: slideIn 0.3s ease-out;
    `;

    // Set colors based on type
    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#4CAF50';
        break;
      case 'error':
        notification.style.backgroundColor = '#f44336';
        break;
      case 'warning':
        notification.style.backgroundColor = '#ff9800';
        break;
      default:
        notification.style.backgroundColor = '#2196F3';
    }

    notification.innerHTML = `
      <div style="font-size: 14px; margin-bottom: 5px;">${title}</div>
      <div style="font-size: 12px; opacity: 0.9;">${message}</div>
    `;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
  }

  /**
   * Attempt to reconnect
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.disconnect();
      this.connect();
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Get API base URL
   */
  getApiBaseUrl() {
    // In development, use localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://${window.location.hostname}:3001`;
    }
    // In production, use current origin
    return window.location.origin;
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(300px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(300px); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Create global instance
window.PVARealtimeManager = new PVARealtimeManager();

// Auto-connect when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Small delay to ensure page is fully loaded
  setTimeout(() => {
    window.PVARealtimeManager.connect();
  }, 1000);
});

// Disconnect when page unloads
window.addEventListener('beforeunload', () => {
  window.PVARealtimeManager.disconnect();
});