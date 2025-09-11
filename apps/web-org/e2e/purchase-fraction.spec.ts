import { test, expect, Page } from '@playwright/test';

// Page Object Model for Purchase Fraction functionality
class PurchaseFractionPage {
  constructor(private page: Page) {}

  // Selectors
  readonly productGridSelector = '[data-testid="product-grid"]';
  readonly productCardSelector = '[data-testid="product-card"]';
  readonly fractionSliderSelector = '[data-testid="fraction-slider"]';
  readonly fractionPercentageSelector = '[data-testid="fraction-percentage"]';
  readonly priceDisplaySelector = '[data-testid="price-display"]';
  readonly purchaseButtonSelector = '[data-testid="purchase-button"]';
  readonly walletConnectSelector = '[data-testid="wallet-connect"]';
  readonly paymentModalSelector = '[data-testid="payment-modal"]';
  readonly confirmPurchaseSelector = '[data-testid="confirm-purchase"]';
  readonly successMessageSelector = '[data-testid="success-message"]';
  readonly errorMessageSelector = '[data-testid="error-message"]';
  readonly loadingSpinnerSelector = '[data-testid="loading-spinner"]';

  // Navigation methods
  async navigateToProductGrid() {
    await this.page.goto('/products');
    await this.page.waitForSelector(this.productGridSelector);
  }

  async selectProduct(productIndex: number = 0) {
    const productCards = this.page.locator(this.productCardSelector);
    await productCards.nth(productIndex).click();
    await this.page.waitForURL(/\/products\/[a-zA-Z0-9]+/);
  }

  // Fraction selection methods
  async setFractionPercentage(percentage: number) {
    const slider = this.page.locator(this.fractionSliderSelector);
    await slider.fill(percentage.toString());
    
    // Wait for price to update
    await this.page.waitForFunction(
      (expectedPercentage) => {
        const percentageElement = document.querySelector('[data-testid="fraction-percentage"]');
        return percentageElement?.textContent?.includes(expectedPercentage.toString());
      },
      percentage
    );
  }

  async getFractionPercentage(): Promise<number> {
    const percentageText = await this.page.locator(this.fractionPercentageSelector).textContent();
    return parseInt(percentageText?.replace('%', '') || '0');
  }

  async getDisplayedPrice(): Promise<string> {
    return await this.page.locator(this.priceDisplaySelector).textContent() || '';
  }

  // Purchase flow methods
  async connectWallet() {
    await this.page.locator(this.walletConnectSelector).click();
    // Wait for wallet connection (in real scenario, would handle MetaMask popup)
    await this.page.waitForTimeout(2000);
  }

  async clickPurchaseButton() {
    await this.page.locator(this.purchaseButtonSelector).click();
  }

  async confirmPurchase() {
    await this.page.locator(this.confirmPurchaseSelector).click();
  }

  async waitForSuccessMessage() {
    await this.page.waitForSelector(this.successMessageSelector, { timeout: 30000 });
  }

  async waitForErrorMessage() {
    return await this.page.waitForSelector(this.errorMessageSelector, { timeout: 10000 });
  }

  // Validation methods
  async isPaymentModalVisible(): Promise<boolean> {
    return await this.page.locator(this.paymentModalSelector).isVisible();
  }

  async isPurchaseButtonEnabled(): Promise<boolean> {
    return await this.page.locator(this.purchaseButtonSelector).isEnabled();
  }

  async isLoadingSpinnerVisible(): Promise<boolean> {
    return await this.page.locator(this.loadingSpinnerSelector).isVisible();
  }
}

test.describe('Purchase Fraction E2E Tests', () => {
  let purchasePage: PurchaseFractionPage;

  test.beforeEach(async ({ page }) => {
    purchasePage = new PurchaseFractionPage(page);
    
    // Mock wallet connection for testing
    await page.addInitScript(() => {
      (window as any).ethereum = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_getBalance') {
            return '0x1bc16d674ec80000'; // 2 ETH in wei
          }
          return Promise.resolve();
        },
        on: () => {},
        removeListener: () => {},
      };
    });
  });

  test.describe('Product Selection and Fraction Configuration', () => {
    test('should display product grid and allow product selection', async () => {
      await purchasePage.navigateToProductGrid();
      
      // Verify product grid is visible
      await expect(purchasePage.page.locator(purchasePage.productGridSelector)).toBeVisible();
      
      // Verify we have at least one product
      const productCount = await purchasePage.page.locator(purchasePage.productCardSelector).count();
      expect(productCount).toBeGreaterThan(0);
      
      // Select first product
      await purchasePage.selectProduct(0);
      
      // Verify we're on product detail page
      await expect(purchasePage.page).toHaveURL(/\/products\/[a-zA-Z0-9]+/);
    });

    test('should allow fraction percentage adjustment', async () => {
      await purchasePage.navigateToProductGrid();
      await purchasePage.selectProduct(0);
      
      // Test different fraction percentages
      const testPercentages = [10, 25, 50, 75, 100];
      
      for (const percentage of testPercentages) {
        await purchasePage.setFractionPercentage(percentage);
        
        const actualPercentage = await purchasePage.getFractionPercentage();
        expect(actualPercentage).toBe(percentage);
        
        // Verify price updates accordingly
        const priceText = await purchasePage.getDisplayedPrice();
        expect(priceText).toContain('ETH');
      }
    });

    test('should calculate correct fraction price', async () => {
      await purchasePage.navigateToProductGrid();
      await purchasePage.selectProduct(0);
      
      // Get full price
      await purchasePage.setFractionPercentage(100);
      const fullPriceText = await purchasePage.getDisplayedPrice();
      const fullPrice = parseFloat(fullPriceText.replace(/[^0-9.]/g, ''));
      
      // Test 50% fraction
      await purchasePage.setFractionPercentage(50);
      const halfPriceText = await purchasePage.getDisplayedPrice();
      const halfPrice = parseFloat(halfPriceText.replace(/[^0-9.]/g, ''));
      
      // Allow for small floating point differences
      expect(Math.abs(halfPrice - fullPrice / 2)).toBeLessThan(0.001);
    });
  });

  test.describe('Wallet Connection and Authentication', () => {
    test('should require wallet connection before purchase', async () => {
      await purchasePage.navigateToProductGrid();
      await purchasePage.selectProduct(0);
      await purchasePage.setFractionPercentage(25);
      
      // Purchase button should be disabled without wallet connection
      const isEnabled = await purchasePage.isPurchaseButtonEnabled();
      expect(isEnabled).toBeFalsy();
      
      // Connect wallet
      await purchasePage.connectWallet();
      
      // Purchase button should now be enabled
      await expect(purchasePage.page.locator(purchasePage.purchaseButtonSelector)).toBeEnabled();
    });

    test('should handle wallet connection errors gracefully', async () => {
      // Mock wallet connection failure
      await purchasePage.page.addInitScript(() => {
        (window as any).ethereum = {
          isMetaMask: true,
          request: async ({ method }: { method: string }) => {
            if (method === 'eth_requestAccounts') {
              throw new Error('User rejected the request');
            }
            return Promise.resolve();
          },
          on: () => {},
          removeListener: () => {},
        };
      });

      await purchasePage.navigateToProductGrid();
      await purchasePage.selectProduct(0);
      
      await purchasePage.connectWallet();
      
      // Should show error message
      const errorVisible = await purchasePage.waitForErrorMessage();
      expect(errorVisible).toBeTruthy();
    });
  });

  test.describe('Purchase Flow', () => {
    test.beforeEach(async () => {
      await purchasePage.navigateToProductGrid();
      await purchasePage.selectProduct(0);
      await purchasePage.setFractionPercentage(25);
      await purchasePage.connectWallet();
    });

    test('should complete successful purchase flow', async () => {
      // Click purchase button
      await purchasePage.clickPurchaseButton();
      
      // Verify payment modal appears
      const modalVisible = await purchasePage.isPaymentModalVisible();
      expect(modalVisible).toBeTruthy();
      
      // Confirm purchase
      await purchasePage.confirmPurchase();
      
      // Verify loading state
      const loadingVisible = await purchasePage.isLoadingSpinnerVisible();
      expect(loadingVisible).toBeTruthy();
      
      // Wait for success message
      await purchasePage.waitForSuccessMessage();
      
      // Verify success message is visible
      await expect(purchasePage.page.locator(purchasePage.successMessageSelector)).toBeVisible();
    });

    test('should validate minimum purchase amount', async () => {
      // Set very small fraction (1%)
      await purchasePage.setFractionPercentage(1);
      
      await purchasePage.clickPurchaseButton();
      
      // Should show error about minimum purchase amount
      const errorVisible = await purchasePage.waitForErrorMessage();
      expect(errorVisible).toBeTruthy();
      
      const errorText = await purchasePage.page.locator(purchasePage.errorMessageSelector).textContent();
      expect(errorText).toContain('minimum');
    });

    test('should handle insufficient balance error', async () => {
      // Mock insufficient balance
      await purchasePage.page.addInitScript(() => {
        (window as any).ethereum.request = async ({ method }: { method: string }) => {
          if (method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          if (method === 'eth_getBalance') {
            return '0x0'; // 0 ETH
          }
          return Promise.resolve();
        };
      });

      await purchasePage.clickPurchaseButton();
      await purchasePage.confirmPurchase();
      
      // Should show insufficient balance error
      const errorVisible = await purchasePage.waitForErrorMessage();
      expect(errorVisible).toBeTruthy();
      
      const errorText = await purchasePage.page.locator(purchasePage.errorMessageSelector).textContent();
      expect(errorText).toContain('insufficient');
    });
  });

  test.describe('UI/UX Validation', () => {
    test('should be responsive on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await purchasePage.navigateToProductGrid();
      await purchasePage.selectProduct(0);
      
      // Verify elements are still visible and functional
      await expect(page.locator(purchasePage.fractionSliderSelector)).toBeVisible();
      await expect(page.locator(purchasePage.priceDisplaySelector)).toBeVisible();
      await expect(page.locator(purchasePage.purchaseButtonSelector)).toBeVisible();
    });

    test('should have proper accessibility attributes', async () => {
      await purchasePage.navigateToProductGrid();
      await purchasePage.selectProduct(0);
      
      // Check ARIA labels and roles
      const slider = purchasePage.page.locator(purchasePage.fractionSliderSelector);
      await expect(slider).toHaveAttribute('aria-label');
      await expect(slider).toHaveAttribute('role', 'slider');
      
      const purchaseButton = purchasePage.page.locator(purchasePage.purchaseButtonSelector);
      await expect(purchaseButton).toHaveAttribute('aria-label');
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await purchasePage.navigateToProductGrid();
      await purchasePage.selectProduct(0);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to adjust slider with arrow keys
      const slider = page.locator(purchasePage.fractionSliderSelector);
      await slider.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      
      const percentage = await purchasePage.getFractionPercentage();
      expect(percentage).toBeGreaterThan(0);
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow retry after failed purchase', async () => {
      await purchasePage.navigateToProductGrid();
      await purchasePage.selectProduct(0);
      await purchasePage.setFractionPercentage(25);
      await purchasePage.connectWallet();
      
      // Mock network error
      await purchasePage.page.route('**/api/purchase', route => route.abort('failed'));
      
      await purchasePage.clickPurchaseButton();
      await purchasePage.confirmPurchase();
      
      // Wait for error
      await purchasePage.waitForErrorMessage();
      
      // Clear route interception
      await purchasePage.page.unroute('**/api/purchase');
      
      // Retry purchase
      await purchasePage.clickPurchaseButton();
      await purchasePage.confirmPurchase();
      
      // Should succeed this time
      await purchasePage.waitForSuccessMessage();
    });
  });
});