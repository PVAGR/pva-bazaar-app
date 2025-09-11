import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';

interface BrandToken {
  name: string;
  value: string;
  category: 'color' | 'typography' | 'spacing' | 'shadow' | 'border' | 'animation';
  usage: string[];
  restrictions?: string[];
}

interface BrandGuidelinesConfig {
  primaryColors: Record<string, string>;
  secondaryColors: Record<string, string>;
  typography: {
    fonts: Record<string, string>;
    sizes: Record<string, string>;
    weights: Record<string, string>;
  };
  spacing: Record<string, string>;
  shadows: Record<string, string>;
  borders: Record<string, string>;
  animations: Record<string, string>;
  logoUsage: {
    minSize: string;
    clearSpace: string;
    acceptableBackgrounds: string[];
    prohibitedUsage: string[];
  };
}

interface BrandViolation {
  type: 'color' | 'typography' | 'spacing' | 'logo' | 'general';
  severity: 'error' | 'warning' | 'info';
  element: string;
  expected: string;
  actual: string;
  message: string;
  selector: string;
}

class BrandTokenValidator {
  private guidelines: BrandGuidelinesConfig;
  private violations: BrandViolation[] = [];
  private reportPath: string;

  constructor(guidelinesPath?: string) {
    this.reportPath = './brand-compliance-reports';
    
    // Load brand guidelines
    if (guidelinesPath && fs.existsSync(guidelinesPath)) {
      this.guidelines = JSON.parse(fs.readFileSync(guidelinesPath, 'utf-8'));
    } else {
      // Default PVA Bazaar brand guidelines
      this.guidelines = this.getDefaultGuidelines();
    }

    // Ensure report directory exists
    if (!fs.existsSync(this.reportPath)) {
      fs.mkdirSync(this.reportPath, { recursive: true });
    }
  }

  /**
   * Validate brand compliance on a page
   */
  async validatePage(page: Page): Promise<BrandViolation[]> {
    console.log('Starting brand compliance validation...');
    this.violations = [];

    await this.validateColors(page);
    await this.validateTypography(page);
    await this.validateSpacing(page);
    await this.validateLogos(page);
    await this.validateAnimations(page);

    await this.generateReport(page.url());
    return this.violations;
  }

  /**
   * Validate color usage against brand guidelines
   */
  private async validateColors(page: Page): Promise<void> {
    const colorUsage = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const colorMap: Array<{
        selector: string;
        color: string;
        backgroundColor: string;
        borderColor: string;
        element: string;
      }> = [];

      elements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const selector = this.generateSelector(element, index);
        
        colorMap.push({
          selector,
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          borderColor: styles.borderColor,
          element: element.tagName.toLowerCase(),
        });
      });

      return colorMap.slice(0, 100); // Limit for performance
    });

    const approvedColors = {
      ...this.guidelines.primaryColors,
      ...this.guidelines.secondaryColors,
      'rgb(255, 255, 255)': 'white',
      'rgb(0, 0, 0)': 'black',
      'rgba(0, 0, 0, 0)': 'transparent',
    };

    colorUsage.forEach(usage => {
      // Check text color
      if (usage.color && usage.color !== 'rgba(0, 0, 0, 0)') {
        if (!this.isColorApproved(usage.color, approvedColors)) {
          this.violations.push({
            type: 'color',
            severity: 'warning',
            element: usage.element,
            expected: 'Approved brand color',
            actual: usage.color,
            message: `Unapproved text color used: ${usage.color}`,
            selector: usage.selector,
          });
        }
      }

      // Check background color
      if (usage.backgroundColor && usage.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        if (!this.isColorApproved(usage.backgroundColor, approvedColors)) {
          this.violations.push({
            type: 'color',
            severity: 'warning',
            element: usage.element,
            expected: 'Approved brand color',
            actual: usage.backgroundColor,
            message: `Unapproved background color used: ${usage.backgroundColor}`,
            selector: usage.selector,
          });
        }
      }
    });
  }

  /**
   * Validate typography against brand guidelines
   */
  private async validateTypography(page: Page): Promise<void> {
    const typographyUsage = await page.evaluate(() => {
      const textElements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, button, label'));
      
      return textElements.map((element, index) => {
        const styles = window.getComputedStyle(element);
        const selector = this.generateSelector(element, index);
        
        return {
          selector,
          fontFamily: styles.fontFamily,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          lineHeight: styles.lineHeight,
          letterSpacing: styles.letterSpacing,
          element: element.tagName.toLowerCase(),
          hasText: element.textContent?.trim().length > 0,
        };
      }).filter(item => item.hasText).slice(0, 50);
    });

    const approvedFonts = Object.keys(this.guidelines.typography.fonts);
    const approvedSizes = Object.values(this.guidelines.typography.sizes);
    const approvedWeights = Object.values(this.guidelines.typography.weights);

    typographyUsage.forEach(usage => {
      // Check font family
      const fontFamilyApproved = approvedFonts.some(font => 
        usage.fontFamily.toLowerCase().includes(font.toLowerCase())
      );

      if (!fontFamilyApproved) {
        this.violations.push({
          type: 'typography',
          severity: 'error',
          element: usage.element,
          expected: `One of: ${approvedFonts.join(', ')}`,
          actual: usage.fontFamily,
          message: `Unapproved font family: ${usage.fontFamily}`,
          selector: usage.selector,
        });
      }

      // Check font size
      if (!approvedSizes.includes(usage.fontSize)) {
        this.violations.push({
          type: 'typography',
          severity: 'warning',
          element: usage.element,
          expected: `One of: ${approvedSizes.join(', ')}`,
          actual: usage.fontSize,
          message: `Non-standard font size: ${usage.fontSize}`,
          selector: usage.selector,
        });
      }
    });
  }

  /**
   * Validate spacing against brand guidelines
   */
  private async validateSpacing(page: Page): Promise<void> {
    const spacingUsage = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      
      return elements.map((element, index) => {
        const styles = window.getComputedStyle(element);
        const selector = this.generateSelector(element, index);
        
        return {
          selector,
          margin: styles.margin,
          padding: styles.padding,
          gap: styles.gap,
          element: element.tagName.toLowerCase(),
        };
      }).slice(0, 50);
    });

    const approvedSpacing = Object.values(this.guidelines.spacing);

    spacingUsage.forEach(usage => {
      // Check if spacing values follow brand system
      [usage.margin, usage.padding, usage.gap].forEach(spacingValue => {
        if (spacingValue && spacingValue !== '0px' && spacingValue !== 'normal') {
          const spacingParts = spacingValue.split(' ');
          spacingParts.forEach(part => {
            if (part !== '0px' && !approvedSpacing.includes(part)) {
              this.violations.push({
                type: 'spacing',
                severity: 'info',
                element: usage.element,
                expected: `One of: ${approvedSpacing.join(', ')}`,
                actual: part,
                message: `Non-standard spacing value: ${part}`,
                selector: usage.selector,
              });
            }
          });
        }
      });
    });
  }

  /**
   * Validate logo usage
   */
  private async validateLogos(page: Page): Promise<void> {
    const logoElements = await page.locator('img[src*="logo"], [class*="logo"], [id*="logo"]').all();

    for (const logo of logoElements) {
      const boundingBox = await logo.boundingBox();
      const src = await logo.getAttribute('src');
      
      if (boundingBox) {
        // Check minimum size
        const minSize = parseInt(this.guidelines.logoUsage.minSize);
        if (boundingBox.width < minSize || boundingBox.height < minSize) {
          this.violations.push({
            type: 'logo',
            severity: 'error',
            element: 'img',
            expected: `Minimum ${minSize}px`,
            actual: `${boundingBox.width}x${boundingBox.height}px`,
            message: `Logo too small: ${boundingBox.width}x${boundingBox.height}px`,
            selector: `img[src="${src}"]`,
          });
        }

        // Check clear space (simplified check)
        const clearSpace = parseInt(this.guidelines.logoUsage.clearSpace);
        // This would require more complex spatial analysis in a real implementation
      }
    }
  }

  /**
   * Validate animations against brand guidelines
   */
  private async validateAnimations(page: Page): Promise<void> {
    const animatedElements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      
      return elements.map((element, index) => {
        const styles = window.getComputedStyle(element);
        const selector = this.generateSelector(element, index);
        
        return {
          selector,
          animationName: styles.animationName,
          animationDuration: styles.animationDuration,
          animationTimingFunction: styles.animationTimingFunction,
          transitionProperty: styles.transitionProperty,
          transitionDuration: styles.transitionDuration,
          element: element.tagName.toLowerCase(),
        };
      }).filter(item => 
        item.animationName !== 'none' || 
        item.transitionProperty !== 'all'
      ).slice(0, 20);
    });

    const approvedAnimations = Object.keys(this.guidelines.animations);

    animatedElements.forEach(usage => {
      if (usage.animationName !== 'none' && !approvedAnimations.includes(usage.animationName)) {
        this.violations.push({
          type: 'general',
          severity: 'warning',
          element: usage.element,
          expected: `One of: ${approvedAnimations.join(', ')}`,
          actual: usage.animationName,
          message: `Unapproved animation: ${usage.animationName}`,
          selector: usage.selector,
        });
      }
    });
  }

  /**
   * Check if a color is approved
   */
  private isColorApproved(color: string, approvedColors: Record<string, string>): boolean {
    // Normalize color format
    const normalizedColor = this.normalizeColor(color);
    
    return Object.keys(approvedColors).some(approvedColor => 
      this.normalizeColor(approvedColor) === normalizedColor
    );
  }

  /**
   * Normalize color format for comparison
   */
  private normalizeColor(color: string): string {
    // This is a simplified implementation
    // In practice, you'd use a proper color library
    return color.toLowerCase().replace(/\s/g, '');
  }

  /**
   * Generate CSS selector for element
   */
  private generateSelector(element: Element, index: number): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const tagName = element.tagName.toLowerCase();
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `${tagName}.${classes[0]}`;
      }
    }
    
    return `${tagName}:nth-child(${index + 1})`;
  }

  /**
   * Generate brand compliance report
   */
  private async generateReport(pageUrl: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportPath, `brand-compliance-${timestamp}.json`);
    
    const summary = {
      total: this.violations.length,
      errors: this.violations.filter(v => v.severity === 'error').length,
      warnings: this.violations.filter(v => v.severity === 'warning').length,
      info: this.violations.filter(v => v.severity === 'info').length,
      byType: {
        color: this.violations.filter(v => v.type === 'color').length,
        typography: this.violations.filter(v => v.type === 'typography').length,
        spacing: this.violations.filter(v => v.type === 'spacing').length,
        logo: this.violations.filter(v => v.type === 'logo').length,
        general: this.violations.filter(v => v.type === 'general').length,
      },
    };

    const report = {
      url: pageUrl,
      timestamp: new Date().toISOString(),
      summary,
      violations: this.violations,
      guidelines: this.guidelines,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownPath = path.join(this.reportPath, `brand-compliance-${timestamp}.md`);
    const markdownReport = this.generateMarkdownReport(pageUrl, summary);
    fs.writeFileSync(markdownPath, markdownReport);

    console.log(`Brand compliance reports generated:`);
    console.log(`- JSON: ${reportPath}`);
    console.log(`- Markdown: ${markdownPath}`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(pageUrl: string, summary: any): string {
    return `
# Brand Compliance Report

**Page:** ${pageUrl}
**Generated:** ${new Date().toLocaleString()}

## Summary

- **Total Violations:** ${summary.total}
- **Errors:** ${summary.errors}
- **Warnings:** ${summary.warnings}
- **Info:** ${summary.info}

## Violations by Type

- **Color:** ${summary.byType.color}
- **Typography:** ${summary.byType.typography}
- **Spacing:** ${summary.byType.spacing}
- **Logo:** ${summary.byType.logo}
- **General:** ${summary.byType.general}

## Violations Details

${this.violations.map((violation, index) => `
### ${index + 1}. ${violation.type.toUpperCase()} - ${violation.severity.toUpperCase()}

**Element:** \`${violation.element}\`
**Selector:** \`${violation.selector}\`
**Message:** ${violation.message}
**Expected:** ${violation.expected}
**Actual:** ${violation.actual}
`).join('\n')}

## Recommendations

1. **Fix Errors First:** Address all error-level violations immediately
2. **Review Warnings:** Consider fixing warning-level violations for better brand consistency
3. **Update Style Guide:** Ensure development team has access to latest brand guidelines
4. **Automate Checks:** Integrate brand compliance checking into CI/CD pipeline
5. **Training:** Provide brand guidelines training to development team

---
*Generated by Brand Token Validator*
`;
  }

  /**
   * Get default PVA Bazaar brand guidelines
   */
  private getDefaultGuidelines(): BrandGuidelinesConfig {
    return {
      primaryColors: {
        'rgb(59, 130, 246)': 'primary-blue',
        'rgb(16, 185, 129)': 'primary-green',
        'rgb(239, 68, 68)': 'primary-red',
        'rgb(245, 158, 11)': 'primary-yellow',
      },
      secondaryColors: {
        'rgb(107, 114, 128)': 'secondary-gray',
        'rgb(156, 163, 175)': 'secondary-light-gray',
        'rgb(31, 41, 55)': 'secondary-dark-gray',
      },
      typography: {
        fonts: {
          'Inter': 'primary-font',
          'system-ui': 'fallback-font',
          'sans-serif': 'fallback-font',
        },
        sizes: {
          '12px': 'xs',
          '14px': 'sm',
          '16px': 'base',
          '18px': 'lg',
          '20px': 'xl',
          '24px': '2xl',
          '30px': '3xl',
          '36px': '4xl',
        },
        weights: {
          '400': 'normal',
          '500': 'medium',
          '600': 'semibold',
          '700': 'bold',
        },
      },
      spacing: {
        '4px': 'xs',
        '8px': 'sm',
        '12px': 'md',
        '16px': 'lg',
        '24px': 'xl',
        '32px': '2xl',
        '48px': '3xl',
        '64px': '4xl',
      },
      shadows: {
        'none': 'none',
        '0 1px 3px rgba(0, 0, 0, 0.1)': 'sm',
        '0 4px 6px rgba(0, 0, 0, 0.1)': 'md',
        '0 10px 15px rgba(0, 0, 0, 0.1)': 'lg',
      },
      borders: {
        '1px': 'thin',
        '2px': 'medium',
        '4px': 'thick',
      },
      animations: {
        'fadeIn': 'fade-in',
        'slideIn': 'slide-in',
        'pulse': 'pulse',
        'spin': 'spin',
      },
      logoUsage: {
        minSize: '24px',
        clearSpace: '16px',
        acceptableBackgrounds: ['white', 'light-gray', 'transparent'],
        prohibitedUsage: ['distorted', 'low-contrast', 'cluttered'],
      },
    };
  }
}

export { BrandTokenValidator, type BrandGuidelinesConfig, type BrandViolation };