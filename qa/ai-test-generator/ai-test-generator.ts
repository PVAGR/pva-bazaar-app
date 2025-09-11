import { OpenAI } from 'openai';
import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  id: string;
  title: string;
  description: string;
  steps: TestStep[];
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
  category: 'unit' | 'integration' | 'e2e' | 'accessibility' | 'performance' | 'security';
  automatable: boolean;
}

interface TestStep {
  action: string;
  target: string;
  value?: string;
  assertion?: string;
}

interface ComponentAnalysis {
  name: string;
  type: 'component' | 'page' | 'api' | 'utility';
  props?: string[];
  methods?: string[];
  dependencies?: string[];
  complexity: 'low' | 'medium' | 'high';
}

class AITestGenerator {
  private openai: OpenAI;
  private outputDir: string;

  constructor(apiKey: string, outputDir: string = './generated-tests') {
    this.openai = new OpenAI({ apiKey });
    this.outputDir = outputDir;
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Analyze a component or page to understand its functionality
   */
  async analyzeComponent(filePath: string): Promise<ComponentAnalysis> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, path.extname(filePath));

    const prompt = `
Analyze this React/TypeScript component and provide a structured analysis:

${content}

Please analyze and return a JSON object with:
- name: component name
- type: "component", "page", "api", or "utility"
- props: array of prop names if it's a component
- methods: array of method names
- dependencies: array of imported dependencies
- complexity: "low", "medium", or "high" based on logic complexity

Focus on understanding the component's purpose, inputs, outputs, and behavior.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const analysisText = response.choices[0].message.content;
      if (analysisText) {
        return JSON.parse(analysisText) as ComponentAnalysis;
      }
    } catch (error) {
      console.error('Error analyzing component:', error);
    }

    // Fallback analysis
    return {
      name: fileName,
      type: 'component',
      complexity: 'medium',
    };
  }

  /**
   * Generate comprehensive test cases for a component
   */
  async generateTestCases(analysis: ComponentAnalysis, requirements?: string): Promise<TestCase[]> {
    const prompt = `
Generate comprehensive test cases for this component:

Component Analysis:
${JSON.stringify(analysis, null, 2)}

Additional Requirements:
${requirements || 'Standard testing requirements'}

Generate test cases covering:
1. Unit tests for component logic
2. Integration tests for component interactions
3. Accessibility tests
4. Edge cases and error handling
5. Performance considerations
6. Security considerations (if applicable)

Return a JSON array of test cases with this structure:
{
  "id": "unique-test-id",
  "title": "Test case title",
  "description": "Detailed description",
  "steps": [
    {
      "action": "action to perform",
      "target": "element or component to target",
      "value": "optional value",
      "assertion": "what to verify"
    }
  ],
  "expectedResult": "What should happen",
  "priority": "high|medium|low",
  "category": "unit|integration|e2e|accessibility|performance|security",
  "automatable": true|false
}

Generate 10-15 comprehensive test cases.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 3000,
      });

      const testCasesText = response.choices[0].message.content;
      if (testCasesText) {
        return JSON.parse(testCasesText) as TestCase[];
      }
    } catch (error) {
      console.error('Error generating test cases:', error);
    }

    return [];
  }

  /**
   * Convert test cases to actual test code
   */
  async generateTestCode(testCases: TestCase[], framework: 'jest' | 'playwright' | 'vitest' = 'jest'): Promise<string> {
    const filteredTestCases = testCases.filter(tc => tc.automatable);

    const prompt = `
Convert these test cases into ${framework} test code:

${JSON.stringify(filteredTestCases, null, 2)}

Generate complete, runnable test code with:
- Proper imports and setup
- Mock dependencies where needed
- Comprehensive assertions
- Error handling
- Cleanup code
- Comments explaining test logic

Use modern ${framework} syntax and best practices.
Include proper TypeScript types if applicable.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      console.error('Error generating test code:', error);
      return '';
    }
  }

  /**
   * Generate test data and fixtures
   */
  async generateTestData(component: ComponentAnalysis): Promise<any> {
    const prompt = `
Generate realistic test data for this component:

${JSON.stringify(component, null, 2)}

Create:
1. Mock props (if component)
2. Test fixtures
3. Edge case data
4. Invalid data for error testing
5. Large datasets for performance testing

Return as JSON object with appropriate structure.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      const dataText = response.choices[0].message.content;
      if (dataText) {
        return JSON.parse(dataText);
      }
    } catch (error) {
      console.error('Error generating test data:', error);
    }

    return {};
  }

  /**
   * Analyze existing tests and suggest improvements
   */
  async analyzeExistingTests(testFilePath: string): Promise<string[]> {
    const content = fs.readFileSync(testFilePath, 'utf-8');

    const prompt = `
Analyze this existing test file and suggest improvements:

${content}

Provide suggestions for:
1. Missing test cases
2. Better assertions
3. Performance optimizations
4. Code quality improvements
5. Best practice recommendations

Return as an array of actionable suggestions.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      const suggestionsText = response.choices[0].message.content;
      if (suggestionsText) {
        return JSON.parse(suggestionsText);
      }
    } catch (error) {
      console.error('Error analyzing existing tests:', error);
    }

    return [];
  }

  /**
   * Generate visual regression test scenarios
   */
  async generateVisualTests(page: Page, componentName: string): Promise<TestCase[]> {
    // Capture current state
    const screenshot = await page.screenshot({ fullPage: true });
    
    // Analyze visual elements
    const elements = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      return elements.map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        position: el.getBoundingClientRect(),
        styles: window.getComputedStyle(el),
      })).slice(0, 50); // Limit for analysis
    });

    const prompt = `
Generate visual regression test cases for component: ${componentName}

Page elements analysis:
${JSON.stringify(elements.slice(0, 10), null, 2)}

Create test cases for:
1. Responsive design breakpoints
2. Theme variations
3. State changes (hover, active, disabled)
4. Data variations (empty, loading, error states)
5. Cross-browser compatibility

Return test cases focusing on visual aspects.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      const testCasesText = response.choices[0].message.content;
      if (testCasesText) {
        return JSON.parse(testCasesText) as TestCase[];
      }
    } catch (error) {
      console.error('Error generating visual tests:', error);
    }

    return [];
  }

  /**
   * Save generated artifacts to files
   */
  async saveTestArtifacts(
    componentName: string,
    testCases: TestCase[],
    testCode: string,
    testData: any
  ): Promise<void> {
    const componentDir = path.join(this.outputDir, componentName);
    
    if (!fs.existsSync(componentDir)) {
      fs.mkdirSync(componentDir, { recursive: true });
    }

    // Save test cases
    fs.writeFileSync(
      path.join(componentDir, 'test-cases.json'),
      JSON.stringify(testCases, null, 2)
    );

    // Save test code
    fs.writeFileSync(
      path.join(componentDir, `${componentName}.test.ts`),
      testCode
    );

    // Save test data
    fs.writeFileSync(
      path.join(componentDir, 'test-data.json'),
      JSON.stringify(testData, null, 2)
    );

    // Generate test report
    const report = this.generateTestReport(componentName, testCases);
    fs.writeFileSync(
      path.join(componentDir, 'test-report.md'),
      report
    );

    console.log(`Test artifacts saved to: ${componentDir}`);
  }

  /**
   * Generate a comprehensive test report
   */
  private generateTestReport(componentName: string, testCases: TestCase[]): string {
    const totalTests = testCases.length;
    const automatable = testCases.filter(tc => tc.automatable).length;
    const byCategory = testCases.reduce((acc, tc) => {
      acc[tc.category] = (acc[tc.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const byPriority = testCases.reduce((acc, tc) => {
      acc[tc.priority] = (acc[tc.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `
# Test Report: ${componentName}

## Summary
- **Total Test Cases**: ${totalTests}
- **Automatable**: ${automatable} (${Math.round((automatable / totalTests) * 100)}%)
- **Manual**: ${totalTests - automatable}

## Test Distribution

### By Category
${Object.entries(byCategory).map(([cat, count]) => `- **${cat}**: ${count}`).join('\n')}

### By Priority
${Object.entries(byPriority).map(([pri, count]) => `- **${pri}**: ${count}`).join('\n')}

## Test Cases

${testCases.map((tc, index) => `
### ${index + 1}. ${tc.title}
- **Priority**: ${tc.priority}
- **Category**: ${tc.category}
- **Automatable**: ${tc.automatable ? 'Yes' : 'No'}
- **Description**: ${tc.description}

**Steps**:
${tc.steps.map((step, i) => `${i + 1}. ${step.action}${step.target ? ` on ${step.target}` : ''}${step.value ? ` with value "${step.value}"` : ''}`).join('\n')}

**Expected Result**: ${tc.expectedResult}
`).join('\n---\n')}

## Recommendations

1. **Prioritize High Priority Tests**: Focus on implementing high-priority test cases first
2. **Automate Where Possible**: ${automatable} tests can be automated to save time
3. **Regular Maintenance**: Review and update tests when component changes
4. **Coverage Analysis**: Ensure all critical paths are covered
5. **Performance Monitoring**: Include performance benchmarks in tests

Generated on: ${new Date().toISOString()}
`;
  }

  /**
   * Main method to process a component and generate all test artifacts
   */
  async processComponent(filePath: string, requirements?: string): Promise<void> {
    console.log(`Processing component: ${filePath}`);

    // Step 1: Analyze component
    const analysis = await this.analyzeComponent(filePath);
    console.log(`Analysis complete for: ${analysis.name}`);

    // Step 2: Generate test cases
    const testCases = await this.generateTestCases(analysis, requirements);
    console.log(`Generated ${testCases.length} test cases`);

    // Step 3: Generate test code
    const testCode = await this.generateTestCode(testCases);
    console.log(`Generated test code`);

    // Step 4: Generate test data
    const testData = await this.generateTestData(analysis);
    console.log(`Generated test data`);

    // Step 5: Save all artifacts
    await this.saveTestArtifacts(analysis.name, testCases, testCode, testData);
    console.log(`Processing complete for: ${analysis.name}`);
  }
}

export { AITestGenerator, type TestCase, type TestStep, type ComponentAnalysis };