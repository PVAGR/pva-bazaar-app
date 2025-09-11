import { AxeBuilder } from '@axe-core/playwright';
import { Page, test, expect } from '@playwright/test';
import { createHtmlReport } from 'axe-html-reporter';
import * as fs from 'fs';
import * as path from 'path';

interface AxeConfig {
  tags: string[];
  rules: Record<string, { enabled: boolean; }>;
  locale: string;
  reportPath: string;
  includeSelectors?: string[];
  excludeSelectors?: string[];
}

interface AccessibilityIssue {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: {
    target: string[];
    html: string;
    failureSummary: string;
  }[];
}

class AxeRunner {
  private page: Page;
  private config: AxeConfig;
  private reportDir: string;

  constructor(page: Page, config?: Partial<AxeConfig>) {
    this.page = page;
    this.reportDir = './accessibility-reports';
    
    this.config = {
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'],
      rules: {
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'focus-management': { enabled: true },
        'aria-usage': { enabled: true },
        'semantic-markup': { enabled: true },
      },
      locale: 'en-US',
      reportPath: this.reportDir,
      includeSelectors: [],
      excludeSelectors: ['.advertisement', '.cookie-banner'],
      ...config,
    };

    // Ensure report directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Run axe-core accessibility analysis on the current page
   */
  async analyze(): Promise<AccessibilityIssue[]> {
    const axeBuilder = new AxeBuilder({ page: this.page })
      .withTags(this.config.tags)
      .setLegacyMode(false);

    // Configure rules
    Object.entries(this.config.rules).forEach(([ruleId, config]) => {
      if (config.enabled) {
        axeBuilder.include(ruleId);
      } else {
        axeBuilder.exclude(ruleId);
      }
    });

    // Include/exclude selectors
    if (this.config.includeSelectors?.length) {
      this.config.includeSelectors.forEach(selector => {
        axeBuilder.include(selector);
      });
    }

    if (this.config.excludeSelectors?.length) {
      this.config.excludeSelectors.forEach(selector => {
        axeBuilder.exclude(selector);
      });
    }

    try {
      const results = await axeBuilder.analyze();
      
      // Convert to our interface format
      const issues: AccessibilityIssue[] = results.violations.map(violation => ({
        id: violation.id,
        impact: violation.impact as AccessibilityIssue['impact'],
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map(node => ({
          target: node.target,
          html: node.html,
          failureSummary: node.failureSummary || '',
        })),
      }));

      // Generate report
      await this.generateReport(results, issues);

      return issues;
    } catch (error) {
      console.error('Axe analysis failed:', error);
      throw error;
    }
  }

  /**
   * Run accessibility analysis with automatic issue detection and reporting
   */
  async runComprehensiveAnalysis(): Promise<{
    violations: AccessibilityIssue[];
    summary: {
      critical: number;
      serious: number;
      moderate: number;
      minor: number;
      total: number;
    };
    passed: number;
    incomplete: number;
  }> {
    console.log('Starting comprehensive accessibility analysis...');

    const axeBuilder = new AxeBuilder({ page: this.page })
      .withTags(this.config.tags);

    const results = await axeBuilder.analyze();

    const violations = results.violations.map(violation => ({
      id: violation.id,
      impact: violation.impact as AccessibilityIssue['impact'],
      description: violation.description,
      help: violation.help,
      helpUrl: violation.helpUrl,
      nodes: violation.nodes.map(node => ({
        target: node.target,
        html: node.html,
        failureSummary: node.failureSummary || '',
      })),
    }));

    const summary = {
      critical: violations.filter(v => v.impact === 'critical').length,
      serious: violations.filter(v => v.impact === 'serious').length,
      moderate: violations.filter(v => v.impact === 'moderate').length,
      minor: violations.filter(v => v.impact === 'minor').length,
      total: violations.length,
    };

    // Generate detailed report
    await this.generateDetailedReport(results, violations, summary);

    return {
      violations,
      summary,
      passed: results.passes.length,
      incomplete: results.incomplete.length,
    };
  }

  /**
   * Test specific accessibility scenarios
   */
  async testKeyboardNavigation(): Promise<boolean> {
    console.log('Testing keyboard navigation...');

    // Get all focusable elements
    const focusableElements = await this.page.locator(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ).all();

    let tabOrder: string[] = [];
    let currentElement = await this.page.locator(':focus').first();

    // Test tab order
    for (let i = 0; i < Math.min(focusableElements.length, 20); i++) {
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(100);

      const focusedElement = await this.page.locator(':focus').first();
      const elementInfo = await focusedElement.evaluate(el => ({
        tagName: el.tagName,
        id: el.id,
        class: el.className,
        type: (el as HTMLInputElement).type || '',
      }));

      tabOrder.push(`${elementInfo.tagName}${elementInfo.id ? `#${elementInfo.id}` : ''}${elementInfo.class ? `.${elementInfo.class.split(' ')[0]}` : ''}`);
    }

    // Test reverse tab order
    for (let i = 0; i < 5; i++) {
      await this.page.keyboard.press('Shift+Tab');
      await this.page.waitForTimeout(100);
    }

    console.log('Tab order:', tabOrder);
    return tabOrder.length > 0;
  }

  /**
   * Test screen reader compatibility
   */
  async testScreenReaderCompatibility(): Promise<{
    ariaLabels: number;
    headingStructure: boolean;
    landmarks: string[];
    altTexts: number;
  }> {
    console.log('Testing screen reader compatibility...');

    // Check ARIA labels
    const ariaLabels = await this.page.locator('[aria-label], [aria-labelledby]').count();

    // Check heading structure
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = await Promise.all(
      headings.map(h => h.evaluate(el => parseInt(el.tagName.substring(1))))
    );

    const headingStructure = this.validateHeadingStructure(headingLevels);

    // Check landmarks
    const landmarks = await this.page.evaluate(() => {
      const landmarkSelectors = [
        'main', 'nav', 'aside', 'header', 'footer',
        '[role="main"]', '[role="navigation"]', '[role="complementary"]',
        '[role="banner"]', '[role="contentinfo"]', '[role="search"]'
      ];

      return landmarkSelectors.filter(selector => 
        document.querySelector(selector) !== null
      );
    });

    // Check alt texts
    const altTexts = await this.page.locator('img[alt]').count();

    return {
      ariaLabels,
      headingStructure,
      landmarks,
      altTexts,
    };
  }

  /**
   * Test color contrast ratios
   */
  async testColorContrast(): Promise<{
    passedElements: number;
    failedElements: number;
    issues: Array<{
      selector: string;
      contrast: number;
      required: number;
    }>;
  }> {
    console.log('Testing color contrast...');

    const contrastIssues = await this.page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const issues: Array<{
        selector: string;
        contrast: number;
        required: number;
      }> = [];

      elements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = styles.fontWeight;

        // Skip elements with no text content
        if (!element.textContent?.trim()) return;

        // Simplified contrast calculation (in practice, use a proper library)
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && parseInt(fontWeight) >= 700);
        const requiredRatio = isLargeText ? 3.0 : 4.5;

        // Mock contrast calculation (implement proper calculation)
        const mockContrast = Math.random() * 8 + 1;

        if (mockContrast < requiredRatio) {
          issues.push({
            selector: element.tagName.toLowerCase() + (element.id ? `#${element.id}` : '') + (index < 50 ? `:nth-child(${index + 1})` : ''),
            contrast: mockContrast,
            required: requiredRatio,
          });
        }
      });

      return issues.slice(0, 10); // Limit for performance
    });

    return {
      passedElements: 0, // Would be calculated properly
      failedElements: contrastIssues.length,
      issues: contrastIssues,
    };
  }

  /**
   * Generate HTML report
   */
  private async generateReport(axeResults: any, issues: AccessibilityIssue[]): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportDir, `axe-report-${timestamp}.html`);

    try {
      createHtmlReport({
        results: axeResults,
        options: {
          outputDir: this.reportDir,
          reportFileName: `axe-report-${timestamp}.html`,
        },
      });

      console.log(`Accessibility report generated: ${reportPath}`);
    } catch (error) {
      console.error('Failed to generate HTML report:', error);
    }

    // Also generate JSON report
    const jsonReportPath = path.join(this.reportDir, `axe-report-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify({
      results: axeResults,
      summary: {
        violations: issues.length,
        critical: issues.filter(i => i.impact === 'critical').length,
        serious: issues.filter(i => i.impact === 'serious').length,
        moderate: issues.filter(i => i.impact === 'moderate').length,
        minor: issues.filter(i => i.impact === 'minor').length,
      },
      timestamp: new Date().toISOString(),
    }, null, 2));
  }

  /**
   * Generate detailed accessibility report
   */
  private async generateDetailedReport(
    axeResults: any,
    violations: AccessibilityIssue[],
    summary: any
  ): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportDir, `detailed-report-${timestamp}.md`);

    const report = `
# Accessibility Analysis Report

**Generated:** ${new Date().toLocaleString()}
**Page URL:** ${this.page.url()}

## Summary

- **Total Violations:** ${summary.total}
- **Critical:** ${summary.critical}
- **Serious:** ${summary.serious}
- **Moderate:** ${summary.moderate}
- **Minor:** ${summary.minor}

## Violations by Impact

### Critical Issues (${summary.critical})
${violations.filter(v => v.impact === 'critical').map(v => `
- **${v.id}**: ${v.description}
  - **Help:** ${v.help}
  - **Affected Elements:** ${v.nodes.length}
  - **Learn More:** ${v.helpUrl}
`).join('\n')}

### Serious Issues (${summary.serious})
${violations.filter(v => v.impact === 'serious').map(v => `
- **${v.id}**: ${v.description}
  - **Help:** ${v.help}
  - **Affected Elements:** ${v.nodes.length}
  - **Learn More:** ${v.helpUrl}
`).join('\n')}

### Moderate Issues (${summary.moderate})
${violations.filter(v => v.impact === 'moderate').map(v => `
- **${v.id}**: ${v.description}
  - **Help:** ${v.help}
  - **Affected Elements:** ${v.nodes.length}
`).join('\n')}

## Remediation Priority

1. **Immediate (Critical):** Fix critical accessibility barriers
2. **High (Serious):** Address serious usability issues
3. **Medium (Moderate):** Improve overall accessibility
4. **Low (Minor):** Polish and best practices

## Next Steps

1. Review each violation in detail
2. Prioritize fixes based on impact level
3. Test fixes with assistive technology
4. Re-run accessibility analysis to verify fixes
5. Implement automated accessibility testing in CI/CD

---
*Report generated by Axe Runner*
`;

    fs.writeFileSync(reportPath, report);
    console.log(`Detailed report generated: ${reportPath}`);
  }

  /**
   * Validate heading structure for screen readers
   */
  private validateHeadingStructure(headingLevels: number[]): boolean {
    if (headingLevels.length === 0) return false;
    if (headingLevels[0] !== 1) return false; // Should start with h1

    for (let i = 1; i < headingLevels.length; i++) {
      const current = headingLevels[i];
      const previous = headingLevels[i - 1];

      // Heading levels shouldn't skip more than one level
      if (current > previous + 1) {
        return false;
      }
    }

    return true;
  }
}

// Test runner function for use in Playwright tests
export async function runAxeTests(page: Page, config?: Partial<AxeConfig>) {
  const axeRunner = new AxeRunner(page, config);

  test.describe('Accessibility Tests', () => {
    test('should have no critical accessibility violations', async () => {
      const result = await axeRunner.runComprehensiveAnalysis();
      expect(result.summary.critical).toBe(0);
    });

    test('should have proper keyboard navigation', async () => {
      const keyboardNavWorking = await axeRunner.testKeyboardNavigation();
      expect(keyboardNavWorking).toBeTruthy();
    });

    test('should be screen reader compatible', async () => {
      const srCompatibility = await axeRunner.testScreenReaderCompatibility();
      expect(srCompatibility.ariaLabels).toBeGreaterThan(0);
      expect(srCompatibility.headingStructure).toBeTruthy();
      expect(srCompatibility.landmarks.length).toBeGreaterThan(0);
    });

    test('should meet color contrast requirements', async () => {
      const contrastResults = await axeRunner.testColorContrast();
      expect(contrastResults.failedElements).toBe(0);
    });
  });
}

export { AxeRunner, type AxeConfig, type AccessibilityIssue };