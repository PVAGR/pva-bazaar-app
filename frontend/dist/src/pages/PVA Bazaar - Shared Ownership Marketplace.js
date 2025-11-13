// PVA Bazaar - Shared Ownership Marketplace Page JavaScript
// Handles interactive functionality for the shared ownership marketplace

document.addEventListener('DOMContentLoaded', function() {
    console.log('PVA Bazaar Shared Ownership Marketplace loaded');

    // Initialize page functionality
    initializeSearch();
    initializeWalletConnection();
    initializeOwnershipOptions();
    initializeInvestmentCalculator();
});

// Search functionality
function initializeSearch() {
    const searchToggle = document.getElementById('searchToggle');
    if (searchToggle) {
        searchToggle.addEventListener('click', function() {
            // Toggle search interface
            console.log('Search toggled');
            // Add search functionality here
        });
    }
}

// Wallet connection functionality
function initializeWalletConnection() {
    const connectWalletBtn = document.getElementById('connectWallet');
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', async function() {
            try {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';

                // Simulate wallet connection
                setTimeout(() => {
                    this.innerHTML = '<i class="fas fa-check"></i> Connected';
                    this.classList.add('connected');
                    console.log('Wallet connected successfully');
                }, 1500);

            } catch (error) {
                console.error('Wallet connection failed:', error);
                this.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
                alert('Failed to connect wallet. Please try again.');
            }
        });
    }
}

// Ownership options functionality
function initializeOwnershipOptions() {
    const optionButtons = document.querySelectorAll('.option-btn');
    optionButtons.forEach(button => {
        button.addEventListener('click', function() {
            const optionCard = this.closest('.option-card');
            const optionTitle = optionCard.querySelector('.option-title').textContent;
            const optionPrice = optionCard.querySelector('.option-price').textContent;

            console.log(`Selected: ${optionTitle} - ${optionPrice}`);

            // Add purchase logic here
            alert(`Redirecting to purchase ${optionTitle.toLowerCase()}...`);
        });
    });
}

// Investment calculator functionality
function initializeInvestmentCalculator() {
    // Add investment calculator logic here
    console.log('Investment calculator initialized');

    // Example: Update investment summary based on user input
    updateInvestmentSummary();
}

function updateInvestmentSummary() {
    // Calculate and display investment summary
    const investmentAmount = 100; // Default or user input
    const ownershipPercentage = (investmentAmount / 2450) * 100;

    console.log(`Investment: $${investmentAmount} (${ownershipPercentage.toFixed(2)}% ownership)`);

    // Update UI elements if they exist
    const summaryElement = document.querySelector('.investment-summary');
    if (summaryElement) {
        summaryElement.innerHTML = `
            <p>Investment Amount: $${investmentAmount}</p>
            <p>Ownership Percentage: ${ownershipPercentage.toFixed(2)}%</p>
        `;
    }
}

// Export functions for potential use by other modules
export {
    initializeSearch,
    initializeWalletConnection,
    initializeOwnershipOptions,
    initializeInvestmentCalculator,
    updateInvestmentSummary
};
