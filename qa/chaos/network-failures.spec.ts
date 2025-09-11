import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface ChaosTestConfig {
  networkFailures: {
    enabled: boolean;
    failureRate: number; // 0-1
    scenarios: string[];
  };
  memoryStress: {
    enabled: boolean;
    allocations: number;
    size: number; // MB
  };
  cpuStress: {
    enabled: boolean;
    duration: number; // seconds
    intensity: number; // 0-1
  };
  browserCrash: {
    enabled: boolean;
    scenarios: string[];
  };
  randomInputs: {
    enabled: boolean;
    iterations: number;
  };
  deviceLimitations: {
    enabled: boolean;
    scenarios: string[];
  };
}

interface ChaosTestResult {
  testName: string;
  success: boolean;
  error?: string;
  metrics: {
    responseTime: number;
    errorCount: number;
    recoveryTime?: number;
  };
  resilience: 'high' | 'medium' | 'low';
}

class ChaosEngineering {
  private page: Page;
  private config: ChaosTestConfig;
  private results: ChaosTestResult[] = [];
  private reportDir: string;

  constructor(page: Page, config?: Partial<ChaosTestConfig>) {
    this.page = page;
    this.reportDir = './chaos-test-reports';
    
    this.config = {
      networkFailures: {
        enabled: true,
        failureRate: 0.3,
        scenarios: ['timeout', 'slow-connection', 'intermittent', 'complete-failure'],
      },
      memoryStress: {
        enabled: true,
        allocations: 100,
        size: 10, // 10MB chunks
      },
      cpuStress: {
        enabled: true,
        duration: 5,
        intensity: 0.8,
      },
      browserCrash: {
        enabled: false, // Disabled by default for safety
        scenarios: ['memory-exhaustion', 'infinite-loop'],
      },
      randomInputs: {
        enabled: true,
        iterations: 50,
      },
      deviceLimitations: {
        enabled: true,
        scenarios: ['slow-cpu', 'limited-memory', 'poor-network'],
      },
      ...config,
    };

    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Run all chaos engineering tests
   */
  async runChaosTests(): Promise<ChaosTestResult[]> {
    console.log('Starting chaos engineering tests...');
    this.results = [];

    if (this.config.networkFailures.enabled) {
      await this.testNetworkFailures();
    }

    if (this.config.memoryStress.enabled) {
      await this.testMemoryStress();
    }

    if (this.config.cpuStress.enabled) {
      await this.testCPUStress();
    }

    if (this.config.randomInputs.enabled) {
      await this.testRandomInputs();
    }

    if (this.config.deviceLimitations.enabled) {
      await this.testDeviceLimitations();
    }

    await this.generateChaosReport();
    return this.results;
  }

  /**
   * Test application resilience to network failures
   */
  async testNetworkFailures(): Promise<void> {
    console.log('Testing network failure scenarios...');

    for (const scenario of this.config.networkFailures.scenarios) {
      const startTime = Date.now();
      let testResult: ChaosTestResult;

      try {
        switch (scenario) {
          case 'timeout':
            await this.simulateNetworkTimeout();
            break;
          case 'slow-connection':
            await this.simulateSlowConnection();
            break;
          case 'intermittent':
            await this.simulateIntermittentConnection();
            break;
          case 'complete-failure':
            await this.simulateCompleteNetworkFailure();
            break;
        }

        const responseTime = Date.now() - startTime;
        
        // Test if application handles the failure gracefully
        const errorElements = await this.page.locator('[data-testid="error"], .error, .error-message').count();
        const loadingElements = await this.page.locator('[data-testid="loading"], .loading, .spinner').count();
        
        testResult = {
          testName: `Network Failure: ${scenario}`,
          success: true,
          metrics: {
            responseTime,
            errorCount: errorElements,
          },
          resilience: this.calculateResilienceScore(responseTime, errorElements),
        };

      } catch (error) {
        testResult = {
          testName: `Network Failure: ${scenario}`,
          success: false,
          error: error.message,
          metrics: {
            responseTime: Date.now() - startTime,
            errorCount: 0,
          },
          resilience: 'low',
        };
      }

      this.results.push(testResult);
    }
  }

  /**
   * Test application under memory stress
   */
  async testMemoryStress(): Promise<void> {
    console.log('Testing memory stress scenarios...');
    const startTime = Date.now();

    try {
      // Allocate large amounts of memory to stress test
      await this.page.evaluate((config) => {
        const allocations = [];
        for (let i = 0; i < config.allocations; i++) {
          // Allocate memory chunks
          const chunk = new Array(config.size * 1024 * 1024).fill(0);
          allocations.push(chunk);
        }
        
        // Store reference to prevent garbage collection
        (window as any).__chaosMemoryTest = allocations;
        
        return allocations.length;
      }, this.config.memoryStress);

      // Wait and observe application behavior
      await this.page.waitForTimeout(3000);

      // Check if application is still responsive
      const isResponsive = await this.checkApplicationResponsiveness();
      
      // Cleanup
      await this.page.evaluate(() => {
        delete (window as any).__chaosMemoryTest;
      });

      const responseTime = Date.now() - startTime;

      this.results.push({
        testName: 'Memory Stress Test',
        success: isResponsive,
        metrics: {
          responseTime,
          errorCount: isResponsive ? 0 : 1,
        },
        resilience: isResponsive ? 'high' : 'low',
      });

    } catch (error) {
      this.results.push({
        testName: 'Memory Stress Test',
        success: false,
        error: error.message,
        metrics: {
          responseTime: Date.now() - startTime,
          errorCount: 1,
        },
        resilience: 'low',
      });
    }
  }

  /**
   * Test application under CPU stress
   */
  async testCPUStress(): Promise<void> {
    console.log('Testing CPU stress scenarios...');
    const startTime = Date.now();

    try {
      // Create CPU-intensive task
      await this.page.evaluate((config) => {
        const startTime = Date.now();
        const duration = config.duration * 1000;
        const intensity = config.intensity;

        function cpuIntensiveTask() {
          const endTime = Date.now() + duration;
          while (Date.now() < endTime) {
            // CPU-intensive calculation
            Math.random() * Math.random();
            
            // Allow some breathing room based on intensity
            if (Math.random() > intensity) {
              setTimeout(() => {}, 1);
            }
          }
        }

        cpuIntensiveTask();
      }, this.config.cpuStress);

      // Check application responsiveness during stress
      const isResponsive = await this.checkApplicationResponsiveness();
      const responseTime = Date.now() - startTime;

      this.results.push({
        testName: 'CPU Stress Test',
        success: isResponsive,
        metrics: {
          responseTime,
          errorCount: isResponsive ? 0 : 1,
        },
        resilience: isResponsive ? 'high' : 'medium',
      });

    } catch (error) {
      this.results.push({
        testName: 'CPU Stress Test',
        success: false,
        error: error.message,
        metrics: {
          responseTime: Date.now() - startTime,
          errorCount: 1,
        },
        resilience: 'low',
      });
    }
  }

  /**
   * Test application with random inputs
   */
  async testRandomInputs(): Promise<void> {
    console.log('Testing random input scenarios...');
    
    const inputElements = await this.page.locator('input, textarea, select').all();
    let successfulInputs = 0;
    let failedInputs = 0;

    for (let i = 0; i < this.config.randomInputs.iterations; i++) {
      try {
        const randomElement = inputElements[Math.floor(Math.random() * inputElements.length)];
        const randomInput = this.generateRandomInput();

        await randomElement.fill(randomInput);
        await this.page.waitForTimeout(100);

        // Check if application crashed or showed unexpected errors
        const hasErrors = await this.page.locator('.error, [data-testid="error"]').count() > 0;
        
        if (hasErrors) {
          failedInputs++;
        } else {
          successfulInputs++;
        }

      } catch (error) {
        failedInputs++;
      }
    }

    const successRate = successfulInputs / (successfulInputs + failedInputs);

    this.results.push({
      testName: 'Random Input Stress Test',
      success: successRate > 0.8,
      metrics: {
        responseTime: 0,
        errorCount: failedInputs,
      },
      resilience: successRate > 0.9 ? 'high' : successRate > 0.7 ? 'medium' : 'low',
    });
  }

  /**
   * Test application under device limitations
   */
  async testDeviceLimitations(): Promise<void> {
    console.log('Testing device limitation scenarios...');

    for (const scenario of this.config.deviceLimitations.scenarios) {
      const startTime = Date.now();

      try {
        switch (scenario) {
          case 'slow-cpu':
            await this.simulateSlowCPU();
            break;
          case 'limited-memory':
            await this.simulateLimitedMemory();
            break;
          case 'poor-network':
            await this.simulatePoorNetwork();
            break;
        }

        const isResponsive = await this.checkApplicationResponsiveness();
        const responseTime = Date.now() - startTime;

        this.results.push({
          testName: `Device Limitation: ${scenario}`,
          success: isResponsive,
          metrics: {
            responseTime,
            errorCount: isResponsive ? 0 : 1,
          },
          resilience: isResponsive ? 'high' : 'medium',
        });

      } catch (error) {
        this.results.push({
          testName: `Device Limitation: ${scenario}`,
          success: false,
          error: error.message,
          metrics: {
            responseTime: Date.now() - startTime,
            errorCount: 1,
          },
          resilience: 'low',
        });
      }
    }
  }

  /**
   * Simulate network timeout
   */
  private async simulateNetworkTimeout(): Promise<void> {
    await this.page.route('**/*', route => {
      setTimeout(() => route.continue(), 10000); // 10 second delay
    });

    await this.page.reload();
    await this.page.waitForTimeout(15000);
    await this.page.unroute('**/*');
  }

  /**
   * Simulate slow connection
   */
  private async simulateSlowConnection(): Promise<void> {
    await this.page.route('**/*', route => {
      setTimeout(() => route.continue(), Math.random() * 5000 + 1000); // 1-6 second delay
    });

    await this.page.reload();
    await this.page.waitForTimeout(10000);
    await this.page.unroute('**/*');
  }

  /**
   * Simulate intermittent connection
   */
  private async simulateIntermittentConnection(): Promise<void> {
    await this.page.route('**/*', route => {
      if (Math.random() < this.config.networkFailures.failureRate) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await this.page.reload();
    await this.page.waitForTimeout(5000);
    await this.page.unroute('**/*');
  }

  /**
   * Simulate complete network failure
   */
  private async simulateCompleteNetworkFailure(): Promise<void> {
    await this.page.route('**/*', route => route.abort());
    
    await this.page.reload();
    await this.page.waitForTimeout(5000);
    await this.page.unroute('**/*');
  }

  /**
   * Check if application is still responsive
   */
  private async checkApplicationResponsiveness(): Promise<boolean> {
    try {
      // Try to interact with the page
      const clickableElements = await this.page.locator('button, a, [data-testid="clickable"]').all();
      
      if (clickableElements.length > 0) {
        const randomElement = clickableElements[0];
        await randomElement.click({ timeout: 3000 });
      }

      // Check if page responds to keyboard input
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(1000);

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate random input for testing
   */
  private generateRandomInput(): string {
    const patterns = [
      // Normal inputs
      'test input',
      '12345',
      'user@example.com',
      
      // Edge cases
      '',
      ' ',
      'a'.repeat(1000),
      
      // Special characters
      '!@#$%^&*()',
      '<script>alert("test")</script>',
      'SELECT * FROM users',
      '\n\r\t',
      
      // Unicode
      '🎨🖼️🎭',
      'мой текст',
      '我的文字',
      
      // Numbers
      '999999999999999999999999',
      '-1',
      '0',
      'NaN',
      'Infinity',
    ];

    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  /**
   * Simulate slow CPU
   */
  private async simulateSlowCPU(): Promise<void> {
    await this.page.addInitScript(() => {
      // Override setTimeout to simulate slower execution
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = (fn, delay) => {
        return originalSetTimeout(fn, delay * 2); // Make everything 2x slower
      };
    });

    await this.page.reload();
    await this.page.waitForTimeout(5000);
  }

  /**
   * Simulate limited memory
   */
  private async simulateLimitedMemory(): Promise<void> {
    await this.page.evaluate(() => {
      // Simulate memory pressure
      const memoryPressure = new Array(50 * 1024 * 1024).fill(0); // 50MB
      (window as any).__memoryPressure = memoryPressure;
    });

    await this.page.reload();
    await this.page.waitForTimeout(3000);
  }

  /**
   * Simulate poor network conditions
   */
  private async simulatePoorNetwork(): Promise<void> {
    await this.page.route('**/*', route => {
      setTimeout(() => {
        if (Math.random() < 0.1) {
          route.abort(); // 10% packet loss
        } else {
          route.continue();
        }
      }, Math.random() * 2000 + 500); // 500-2500ms delay
    });

    await this.page.reload();
    await this.page.waitForTimeout(8000);
    await this.page.unroute('**/*');
  }

  /**
   * Calculate resilience score based on metrics
   */
  private calculateResilienceScore(responseTime: number, errorCount: number): 'high' | 'medium' | 'low' {
    if (errorCount === 0 && responseTime < 5000) {
      return 'high';
    } else if (errorCount <= 1 && responseTime < 10000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate chaos testing report
   */
  private async generateChaosReport(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportDir, `chaos-report-${timestamp}.json`);

    const summary = {
      totalTests: this.results.length,
      successfulTests: this.results.filter(r => r.success).length,
      failedTests: this.results.filter(r => !r.success).length,
      resilienceScores: {
        high: this.results.filter(r => r.resilience === 'high').length,
        medium: this.results.filter(r => r.resilience === 'medium').length,
        low: this.results.filter(r => r.resilience === 'low').length,
      },
      averageResponseTime: this.results.reduce((sum, r) => sum + r.metrics.responseTime, 0) / this.results.length,
      totalErrors: this.results.reduce((sum, r) => sum + r.metrics.errorCount, 0),
    };

    const report = {
      timestamp: new Date().toISOString(),
      pageUrl: this.page.url(),
      config: this.config,
      summary,
      results: this.results,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownPath = path.join(this.reportDir, `chaos-report-${timestamp}.md`);
    const markdownReport = this.generateMarkdownReport(summary);
    fs.writeFileSync(markdownPath, markdownReport);

    console.log(`Chaos testing reports generated:`);
    console.log(`- JSON: ${reportPath}`);
    console.log(`- Markdown: ${markdownPath}`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(summary: any): string {
    return `
# Chaos Engineering Test Report

**Generated:** ${new Date().toLocaleString()}
**Page:** ${this.page.url()}

## Summary

- **Total Tests:** ${summary.totalTests}
- **Successful:** ${summary.successfulTests}
- **Failed:** ${summary.failedTests}
- **Success Rate:** ${Math.round((summary.successfulTests / summary.totalTests) * 100)}%

## Resilience Analysis

- **High Resilience:** ${summary.resilienceScores.high} tests
- **Medium Resilience:** ${summary.resilienceScores.medium} tests
- **Low Resilience:** ${summary.resilienceScores.low} tests

## Performance Metrics

- **Average Response Time:** ${Math.round(summary.averageResponseTime)}ms
- **Total Errors:** ${summary.totalErrors}

## Test Results

${this.results.map((result, index) => `
### ${index + 1}. ${result.testName}

- **Status:** ${result.success ? '✅ PASSED' : '❌ FAILED'}
- **Resilience:** ${result.resilience.toUpperCase()}
- **Response Time:** ${result.metrics.responseTime}ms
- **Error Count:** ${result.metrics.errorCount}
${result.error ? `- **Error:** ${result.error}` : ''}
`).join('\n')}

## Recommendations

${this.generateRecommendations(summary)}

---
*Generated by Chaos Engineering Test Suite*
`;
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(summary: any): string {
    const recommendations = [];

    if (summary.failedTests > 0) {
      recommendations.push('- **Critical**: Fix failed tests to improve application stability');
    }

    if (summary.resilienceScores.low > 0) {
      recommendations.push('- **High Priority**: Improve error handling for low resilience scenarios');
    }

    if (summary.averageResponseTime > 5000) {
      recommendations.push('- **Performance**: Optimize application performance under stress conditions');
    }

    if (summary.totalErrors > 5) {
      recommendations.push('- **Error Handling**: Implement better error boundaries and graceful degradation');
    }

    recommendations.push('- **Monitoring**: Set up real-time monitoring for early failure detection');
    recommendations.push('- **Automated Recovery**: Implement automatic recovery mechanisms');
    recommendations.push('- **Regular Testing**: Schedule regular chaos engineering tests');

    return recommendations.join('\n');
  }
}

export { ChaosEngineering, type ChaosTestConfig, type ChaosTestResult };