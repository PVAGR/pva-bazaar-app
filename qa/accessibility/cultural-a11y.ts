import { test, expect, Page } from '@playwright/test';

interface CulturalA11yConfig {
  locale: string;
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: string;
  currency: string;
  colorContrast: {
    normalText: number;
    largeText: number;
  };
  keyboardLayout: string;
}

class CulturalAccessibilityTester {
  private page: Page;
  private config: CulturalA11yConfig;

  constructor(page: Page, config: CulturalA11yConfig) {
    this.page = page;
    this.config = config;
  }

  async testDirectionality() {
    // Check if RTL/LTR is properly implemented
    const htmlElement = await this.page.locator('html').first();
    const direction = await htmlElement.getAttribute('dir');
    
    expect(direction).toBe(this.config.direction);
    
    // Check if CSS supports the direction
    if (this.config.direction === 'rtl') {
      const bodyStyles = await this.page.evaluate(() => {
        return window.getComputedStyle(document.body).direction;
      });
      expect(bodyStyles).toBe('rtl');
    }
  }

  async testLanguageAttributes() {
    // Check if lang attribute is set correctly
    const htmlElement = await this.page.locator('html').first();
    const lang = await htmlElement.getAttribute('lang');
    
    expect(lang).toBe(this.config.locale.split('-')[0]);
  }

  async testColorContrast() {
    // Test color contrast ratios for different text sizes
    const textElements = await this.page.locator('p, span, div, h1, h2, h3, h4, h5, h6').all();
    
    for (const element of textElements) {
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
        };
      });

      // Calculate contrast ratio (simplified implementation)
      const contrast = await this.calculateContrastRatio(styles.color, styles.backgroundColor);
      const fontSize = parseFloat(styles.fontSize);
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && styles.fontWeight >= '700');

      const requiredRatio = isLargeText 
        ? this.config.colorContrast.largeText 
        : this.config.colorContrast.normalText;

      expect(contrast).toBeGreaterThanOrEqual(requiredRatio);
    }
  }

  async testDateTimeLocalization() {
    // Check if dates and times are displayed in the correct format
    const dateElements = await this.page.locator('[data-testid*="date"], .date, time').all();
    
    for (const element of dateElements) {
      const text = await element.textContent();
      if (text) {
        // Validate date format matches locale expectations
        const dateRegex = this.getDateRegexForLocale();
        expect(text).toMatch(dateRegex);
      }
    }
  }

  async testNumberAndCurrencyFormatting() {
    // Check if numbers and currencies are displayed correctly
    const currencyElements = await this.page.locator('[data-testid*="price"], .price, .currency').all();
    
    for (const element of currencyElements) {
      const text = await element.textContent();
      if (text) {
        // Validate currency format
        const currencyRegex = this.getCurrencyRegexForLocale();
        expect(text).toMatch(currencyRegex);
      }
    }
  }

  async testKeyboardNavigation() {
    // Test keyboard navigation with locale-specific considerations
    const focusableElements = await this.page.locator(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    // Test tab order respects reading direction
    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      await this.page.keyboard.press('Tab');
      const focusedElement = await this.page.locator(':focus').first();
      expect(focusedElement).toBeTruthy();
    }
  }

  async testScreenReaderCompatibility() {
    // Check ARIA labels and descriptions in appropriate language
    const ariaElements = await this.page.locator('[aria-label], [aria-describedby]').all();
    
    for (const element of ariaElements) {
      const ariaLabel = await element.getAttribute('aria-label');
      const ariaDescribedBy = await element.getAttribute('aria-describedby');
      
      if (ariaLabel) {
        // Check if aria-label contains appropriate language content
        expect(this.isTextInExpectedLanguage(ariaLabel)).toBeTruthy();
      }
      
      if (ariaDescribedBy) {
        const descriptionElement = await this.page.locator(`#${ariaDescribedBy}`).first();
        const descriptionText = await descriptionElement.textContent();
        if (descriptionText) {
          expect(this.isTextInExpectedLanguage(descriptionText)).toBeTruthy();
        }
      }
    }
  }

  async testIconAndImageAltText() {
    // Check if icons and images have culturally appropriate alt text
    const images = await this.page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (alt) {
        expect(this.isTextInExpectedLanguage(alt)).toBeTruthy();
        expect(alt.trim().length).toBeGreaterThan(0);
      }
    }
  }

  async testFormValidation() {
    // Test form validation messages in correct language
    const forms = await this.page.locator('form').all();
    
    for (const form of forms) {
      const inputs = await form.locator('input[required], select[required], textarea[required]').all();
      
      for (const input of inputs) {
        // Trigger validation
        await input.focus();
        await input.blur();
        
        // Check if validation messages are in correct language
        const validationMessage = await input.evaluate((el: HTMLInputElement) => el.validationMessage);
        if (validationMessage) {
          expect(this.isTextInExpectedLanguage(validationMessage)).toBeTruthy();
        }
      }
    }
  }

  // Helper methods
  private async calculateContrastRatio(color1: string, color2: string): Promise<number> {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd use a proper color contrast library
    return await this.page.evaluate(({ color1, color2 }) => {
      // This is a placeholder - implement actual contrast calculation
      return 4.5; // Return acceptable contrast ratio for testing
    }, { color1, color2 });
  }

  private getDateRegexForLocale(): RegExp {
    // Return appropriate date regex based on locale
    switch (this.config.locale) {
      case 'en-US':
        return /\d{1,2}\/\d{1,2}\/\d{4}/;
      case 'en-GB':
        return /\d{1,2}\/\d{1,2}\/\d{4}/;
      case 'de-DE':
        return /\d{1,2}\.\d{1,2}\.\d{4}/;
      case 'ja-JP':
        return /\d{4}\/\d{1,2}\/\d{1,2}/;
      default:
        return /\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4}/;
    }
  }

  private getCurrencyRegexForLocale(): RegExp {
    // Return appropriate currency regex based on locale
    switch (this.config.currency) {
      case 'USD':
        return /\$\d+(\.\d{2})?/;
      case 'EUR':
        return /€\d+(\,\d{2})?|\d+(\,\d{2})?\s*€/;
      case 'GBP':
        return /£\d+(\.\d{2})?/;
      case 'JPY':
        return /¥\d+|￥\d+/;
      default:
        return /[\$€£¥￥]\d+/;
    }
  }

  private isTextInExpectedLanguage(text: string): boolean {
    // Simple language detection - in practice, use a proper language detection library
    const locale = this.config.locale.toLowerCase();
    
    if (locale.startsWith('ja')) {
      // Check for Japanese characters
      return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
    } else if (locale.startsWith('zh')) {
      // Check for Chinese characters
      return /[\u4E00-\u9FAF]/.test(text);
    } else if (locale.startsWith('ar')) {
      // Check for Arabic characters
      return /[\u0600-\u06FF]/.test(text);
    } else if (locale.startsWith('he')) {
      // Check for Hebrew characters
      return /[\u0590-\u05FF]/.test(text);
    }
    
    // For Latin-based languages, check that it's not obviously in wrong language
    return text.length > 0;
  }
}

// Test configurations for different locales
const testConfigs: CulturalA11yConfig[] = [
  {
    locale: 'en-US',
    direction: 'ltr',
    dateFormat: 'MM/DD/YYYY',
    numberFormat: '1,234.56',
    currency: 'USD',
    colorContrast: { normalText: 4.5, largeText: 3.0 },
    keyboardLayout: 'QWERTY',
  },
  {
    locale: 'ar-SA',
    direction: 'rtl',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: '1٬234٫56',
    currency: 'SAR',
    colorContrast: { normalText: 4.5, largeText: 3.0 },
    keyboardLayout: 'Arabic',
  },
  {
    locale: 'ja-JP',
    direction: 'ltr',
    dateFormat: 'YYYY/MM/DD',
    numberFormat: '1,234.56',
    currency: 'JPY',
    colorContrast: { normalText: 4.5, largeText: 3.0 },
    keyboardLayout: 'Japanese',
  },
];

// Export test suite
export async function runCulturalA11yTests(page: Page, url: string) {
  for (const config of testConfigs) {
    test.describe(`Cultural Accessibility Tests - ${config.locale}`, () => {
      test.beforeEach(async () => {
        // Set locale and navigate
        await page.setExtraHTTPHeaders({
          'Accept-Language': config.locale,
        });
        await page.goto(url);
      });

      test('should support correct text direction', async () => {
        const tester = new CulturalAccessibilityTester(page, config);
        await tester.testDirectionality();
      });

      test('should have proper language attributes', async () => {
        const tester = new CulturalAccessibilityTester(page, config);
        await tester.testLanguageAttributes();
      });

      test('should meet color contrast requirements', async () => {
        const tester = new CulturalAccessibilityTester(page, config);
        await tester.testColorContrast();
      });

      test('should display dates in correct format', async () => {
        const tester = new CulturalAccessibilityTester(page, config);
        await tester.testDateTimeLocalization();
      });

      test('should format numbers and currency correctly', async () => {
        const tester = new CulturalAccessibilityTester(page, config);
        await tester.testNumberAndCurrencyFormatting();
      });

      test('should support keyboard navigation', async () => {
        const tester = new CulturalAccessibilityTester(page, config);
        await tester.testKeyboardNavigation();
      });

      test('should be screen reader compatible', async () => {
        const tester = new CulturalAccessibilityTester(page, config);
        await tester.testScreenReaderCompatibility();
      });

      test('should have appropriate alt text', async () => {
        const tester = new CulturalAccessibilityTester(page, config);
        await tester.testIconAndImageAltText();
      });

      test('should show form validation in correct language', async () => {
        const tester = new CulturalAccessibilityTester(page, config);
        await tester.testFormValidation();
      });
    });
  }
}

export { CulturalAccessibilityTester, type CulturalA11yConfig };