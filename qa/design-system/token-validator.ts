import * as fs from 'fs';
import * as path from 'path';

interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'spacing' | 'typography' | 'shadow' | 'border' | 'animation' | 'breakpoint';
  category: string;
  description?: string;
  deprecated?: boolean;
  aliases?: string[];
}

interface TokenValidationResult {
  token: DesignToken;
  status: 'valid' | 'invalid' | 'deprecated' | 'missing';
  issues: string[];
  usage: TokenUsage[];
}

interface TokenUsage {
  file: string;
  line: number;
  context: string;
  selector?: string;
}

interface ValidationRule {
  name: string;
  description: string;
  validate: (token: DesignToken, usage: TokenUsage[]) => string[];
}

class DesignSystemTokenValidator {
  private designTokens: DesignToken[];
  private validationRules: ValidationRule[];
  private projectFiles: string[];
  private reportDir: string;

  constructor(tokensPath?: string, projectRoot?: string) {
    this.reportDir = './design-system-reports';
    this.projectFiles = [];
    
    // Load design tokens
    if (tokensPath && fs.existsSync(tokensPath)) {
      this.designTokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));
    } else {
      this.designTokens = this.getDefaultDesignTokens();
    }

    // Scan project files
    if (projectRoot) {
      this.projectFiles = this.scanProjectFiles(projectRoot);
    }

    // Initialize validation rules
    this.validationRules = this.getValidationRules();

    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Validate all design tokens
   */
  async validateTokens(): Promise<TokenValidationResult[]> {
    console.log('Starting design token validation...');
    const results: TokenValidationResult[] = [];

    for (const token of this.designTokens) {
      const usage = await this.findTokenUsage(token);
      const issues: string[] = [];

      // Run validation rules
      for (const rule of this.validationRules) {
        const ruleIssues = rule.validate(token, usage);
        issues.push(...ruleIssues);
      }

      const status = this.determineTokenStatus(token, usage, issues);

      results.push({
        token,
        status,
        issues,
        usage,
      });
    }

    await this.generateTokenReport(results);
    return results;
  }

  /**
   * Find unused tokens in the design system
   */
  async findUnusedTokens(): Promise<DesignToken[]> {
    const unusedTokens: DesignToken[] = [];

    for (const token of this.designTokens) {
      const usage = await this.findTokenUsage(token);
      if (usage.length === 0 && !token.deprecated) {
        unusedTokens.push(token);
      }
    }

    return unusedTokens;
  }

  /**
   * Find hardcoded values that should use tokens
   */
  async findHardcodedValues(): Promise<Array<{
    file: string;
    line: number;
    value: string;
    suggestedToken?: DesignToken;
    context: string;
  }>> {
    const hardcodedValues: Array<{
      file: string;
      line: number;
      value: string;
      suggestedToken?: DesignToken;
      context: string;
    }> = [];

    const colorRegex = /#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|hsl\([^)]+\)/g;
    const spacingRegex = /\b\d+px\b|\b\d+rem\b|\b\d+em\b/g;
    const fontSizeRegex = /font-size\s*:\s*\d+px/g;

    for (const file of this.projectFiles) {
      if (this.shouldSkipFile(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        // Check for hardcoded colors
        const colorMatches = line.match(colorRegex);
        if (colorMatches) {
          colorMatches.forEach(match => {
            const suggestedToken = this.findSimilarToken(match, 'color');
            hardcodedValues.push({
              file,
              line: lineIndex + 1,
              value: match,
              suggestedToken,
              context: line.trim(),
            });
          });
        }

        // Check for hardcoded spacing
        const spacingMatches = line.match(spacingRegex);
        if (spacingMatches) {
          spacingMatches.forEach(match => {
            const suggestedToken = this.findSimilarToken(match, 'spacing');
            if (suggestedToken) {
              hardcodedValues.push({
                file,
                line: lineIndex + 1,
                value: match,
                suggestedToken,
                context: line.trim(),
              });
            }
          });
        }

        // Check for hardcoded font sizes
        const fontMatches = line.match(fontSizeRegex);
        if (fontMatches) {
          fontMatches.forEach(match => {
            const value = match.split(':')[1].trim();
            const suggestedToken = this.findSimilarToken(value, 'typography');
            hardcodedValues.push({
              file,
              line: lineIndex + 1,
              value,
              suggestedToken,
              context: line.trim(),
            });
          });
        }
      });
    }

    return hardcodedValues;
  }

  /**
   * Validate token naming conventions
   */
  validateNamingConventions(): Array<{
    token: DesignToken;
    issues: string[];
  }> {
    const namingIssues: Array<{
      token: DesignToken;
      issues: string[];
    }> = [];

    for (const token of this.designTokens) {
      const issues: string[] = [];

      // Check naming convention
      if (!this.followsNamingConvention(token.name, token.type)) {
        issues.push(`Token name doesn't follow naming convention for ${token.type}`);
      }

      // Check for reserved words
      if (this.isReservedWord(token.name)) {
        issues.push('Token name uses reserved word');
      }

      // Check for consistency with similar tokens
      const similarTokens = this.designTokens.filter(t => 
        t.type === token.type && t.category === token.category && t.name !== token.name
      );

      if (similarTokens.length > 0) {
        const namingPattern = this.extractNamingPattern(similarTokens.map(t => t.name));
        if (!this.matchesPattern(token.name, namingPattern)) {
          issues.push('Token name inconsistent with similar tokens');
        }
      }

      if (issues.length > 0) {
        namingIssues.push({ token, issues });
      }
    }

    return namingIssues;
  }

  /**
   * Check for token conflicts and duplicates
   */
  findTokenConflicts(): Array<{
    tokens: DesignToken[];
    conflict: 'duplicate-name' | 'duplicate-value' | 'similar-name';
  }> {
    const conflicts: Array<{
      tokens: DesignToken[];
      conflict: 'duplicate-name' | 'duplicate-value' | 'similar-name';
    }> = [];

    // Check for duplicate names
    const nameGroups = this.groupBy(this.designTokens, 'name');
    Object.entries(nameGroups).forEach(([name, tokens]) => {
      if (tokens.length > 1) {
        conflicts.push({
          tokens,
          conflict: 'duplicate-name',
        });
      }
    });

    // Check for duplicate values
    const valueGroups = this.groupBy(this.designTokens, 'value');
    Object.entries(valueGroups).forEach(([value, tokens]) => {
      if (tokens.length > 1 && tokens[0].type === 'color') {
        conflicts.push({
          tokens,
          conflict: 'duplicate-value',
        });
      }
    });

    // Check for similar names that might be confusing
    for (let i = 0; i < this.designTokens.length; i++) {
      for (let j = i + 1; j < this.designTokens.length; j++) {
        const token1 = this.designTokens[i];
        const token2 = this.designTokens[j];
        
        if (this.areNamesSimilar(token1.name, token2.name)) {
          conflicts.push({
            tokens: [token1, token2],
            conflict: 'similar-name',
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Find token usage in project files
   */
  private async findTokenUsage(token: DesignToken): Promise<TokenUsage[]> {
    const usage: TokenUsage[] = [];
    const searchPatterns = [
      token.name,
      ...(token.aliases || []),
      `var(--${token.name})`,
      `$${token.name}`,
      token.value,
    ];

    for (const file of this.projectFiles) {
      if (this.shouldSkipFile(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, lineIndex) => {
        searchPatterns.forEach(pattern => {
          if (line.includes(pattern)) {
            usage.push({
              file,
              line: lineIndex + 1,
              context: line.trim(),
              selector: this.extractSelector(content, lineIndex),
            });
          }
        });
      });
    }

    return usage;
  }

  /**
   * Determine token status based on validation
   */
  private determineTokenStatus(
    token: DesignToken,
    usage: TokenUsage[],
    issues: string[]
  ): 'valid' | 'invalid' | 'deprecated' | 'missing' {
    if (token.deprecated) {
      return 'deprecated';
    }

    if (issues.length > 0) {
      return 'invalid';
    }

    if (usage.length === 0) {
      return 'missing';
    }

    return 'valid';
  }

  /**
   * Get validation rules
   */
  private getValidationRules(): ValidationRule[] {
    return [
      {
        name: 'Color Contrast',
        description: 'Ensure color tokens meet accessibility contrast requirements',
        validate: (token, usage) => {
          if (token.type !== 'color') return [];
          // Simplified check - in practice, you'd validate actual contrast ratios
          if (token.value.includes('gray') && token.name.includes('text')) {
            return ['Color might not meet contrast requirements'];
          }
          return [];
        },
      },
      {
        name: 'Spacing Scale',
        description: 'Ensure spacing tokens follow consistent scale',
        validate: (token, usage) => {
          if (token.type !== 'spacing') return [];
          const value = parseInt(token.value);
          const validSpacingValues = [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];
          if (!validSpacingValues.includes(value)) {
            return ['Spacing value not in design scale'];
          }
          return [];
        },
      },
      {
        name: 'Typography Scale',
        description: 'Ensure typography tokens follow consistent scale',
        validate: (token, usage) => {
          if (token.type !== 'typography') return [];
          const fontSize = parseFloat(token.value);
          if (fontSize < 12 || fontSize > 72) {
            return ['Font size outside recommended range (12px - 72px)'];
          }
          return [];
        },
      },
      {
        name: 'Usage Frequency',
        description: 'Check if tokens are being used appropriately',
        validate: (token, usage) => {
          if (usage.length === 0 && !token.deprecated) {
            return ['Token is not being used anywhere'];
          }
          if (usage.length > 100) {
            return ['Token might be overused - consider splitting'];
          }
          return [];
        },
      },
      {
        name: 'Token Description',
        description: 'Ensure tokens have proper documentation',
        validate: (token, usage) => {
          if (!token.description || token.description.length < 10) {
            return ['Token needs better description'];
          }
          return [];
        },
      },
    ];
  }

  /**
   * Scan project files for token usage
   */
  private scanProjectFiles(projectRoot: string): string[] {
    const files: string[] = [];
    const allowedExtensions = ['.css', '.scss', '.less', '.js', '.jsx', '.ts', '.tsx', '.vue'];

    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory() && !this.shouldSkipDirectory(item)) {
          scanDirectory(itemPath);
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (allowedExtensions.includes(ext)) {
            files.push(itemPath);
          }
        }
      });
    };

    scanDirectory(projectRoot);
    return files;
  }

  /**
   * Check if file should be skipped
   */
  private shouldSkipFile(file: string): boolean {
    const skipPatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
      'vendor',
    ];

    return skipPatterns.some(pattern => file.includes(pattern));
  }

  /**
   * Check if directory should be skipped
   */
  private shouldSkipDirectory(dir: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.nuxt',
      'vendor',
    ];

    return skipDirs.includes(dir);
  }

  /**
   * Find similar token for hardcoded value
   */
  private findSimilarToken(value: string, type: string): DesignToken | undefined {
    return this.designTokens.find(token => 
      token.type === type && 
      (token.value === value || this.valuesAreSimilar(token.value, value))
    );
  }

  /**
   * Check if values are similar
   */
  private valuesAreSimilar(value1: string, value2: string): boolean {
    // Simplified similarity check
    if (value1 === value2) return true;
    
    // For colors, check if they're the same when normalized
    if (value1.startsWith('#') && value2.startsWith('#')) {
      return value1.toLowerCase() === value2.toLowerCase();
    }

    // For spacing, check if they're close (within 2px)
    const num1 = parseFloat(value1);
    const num2 = parseFloat(value2);
    if (!isNaN(num1) && !isNaN(num2)) {
      return Math.abs(num1 - num2) <= 2;
    }

    return false;
  }

  /**
   * Check naming convention
   */
  private followsNamingConvention(name: string, type: string): boolean {
    const conventions = {
      color: /^(primary|secondary|neutral|success|warning|error|info)-\w+(-\d+)?$/,
      spacing: /^(xs|sm|md|lg|xl|\d+x?)$/,
      typography: /^(heading|body|caption)-\w+$/,
      shadow: /^(sm|md|lg|xl|\d+x?)$/,
      border: /^(thin|medium|thick|\d+px)$/,
      animation: /^[a-z]+(-[a-z]+)*$/,
    };

    return conventions[type]?.test(name) ?? true;
  }

  /**
   * Check if name is reserved word
   */
  private isReservedWord(name: string): boolean {
    const reservedWords = [
      'default', 'initial', 'inherit', 'unset', 'auto', 'none',
      'transparent', 'currentColor', 'normal', 'bold', 'italic',
    ];

    return reservedWords.includes(name.toLowerCase());
  }

  /**
   * Extract naming pattern from token names
   */
  private extractNamingPattern(names: string[]): RegExp {
    // Simplified pattern extraction
    if (names.length === 0) return /^.*$/;
    
    const commonPrefix = this.findCommonPrefix(names);
    const commonSuffix = this.findCommonSuffix(names);
    
    return new RegExp(`^${this.escapeRegex(commonPrefix)}.*${this.escapeRegex(commonSuffix)}$`);
  }

  /**
   * Check if name matches pattern
   */
  private matchesPattern(name: string, pattern: RegExp): boolean {
    return pattern.test(name);
  }

  /**
   * Group tokens by property
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      groups[value] = groups[value] || [];
      groups[value].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Check if names are similar
   */
  private areNamesSimilar(name1: string, name2: string): boolean {
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    return distance / maxLength < 0.3; // 30% similarity threshold
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Find common prefix
   */
  private findCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return '';
    
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
      while (strings[i].indexOf(prefix) !== 0) {
        prefix = prefix.substring(0, prefix.length - 1);
        if (prefix === '') return '';
      }
    }
    return prefix;
  }

  /**
   * Find common suffix
   */
  private findCommonSuffix(strings: string[]): string {
    if (strings.length === 0) return '';
    
    const reversed = strings.map(s => s.split('').reverse().join(''));
    const commonPrefix = this.findCommonPrefix(reversed);
    return commonPrefix.split('').reverse().join('');
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Extract CSS selector from context
   */
  private extractSelector(content: string, lineIndex: number): string | undefined {
    const lines = content.split('\n');
    
    // Look backwards for selector
    for (let i = lineIndex; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.includes('{')) {
        return line.split('{')[0].trim();
      }
    }
    
    return undefined;
  }

  /**
   * Generate comprehensive token report
   */
  private async generateTokenReport(results: TokenValidationResult[]): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.reportDir, `token-validation-${timestamp}.json`);

    const summary = {
      totalTokens: results.length,
      validTokens: results.filter(r => r.status === 'valid').length,
      invalidTokens: results.filter(r => r.status === 'invalid').length,
      deprecatedTokens: results.filter(r => r.status === 'deprecated').length,
      unusedTokens: results.filter(r => r.status === 'missing').length,
      totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
    };

    const report = {
      timestamp: new Date().toISOString(),
      summary,
      results,
      unusedTokens: await this.findUnusedTokens(),
      hardcodedValues: await this.findHardcodedValues(),
      namingIssues: this.validateNamingConventions(),
      conflicts: this.findTokenConflicts(),
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate markdown report
    const markdownPath = path.join(this.reportDir, `token-validation-${timestamp}.md`);
    const markdownReport = this.generateMarkdownReport(summary, report);
    fs.writeFileSync(markdownPath, markdownReport);

    console.log(`Design token reports generated:`);
    console.log(`- JSON: ${reportPath}`);
    console.log(`- Markdown: ${markdownPath}`);
  }

  /**
   * Generate markdown report
   */
  private generateMarkdownReport(summary: any, report: any): string {
    return `
# Design System Token Validation Report

**Generated:** ${new Date().toLocaleString()}

## Summary

- **Total Tokens:** ${summary.totalTokens}
- **Valid:** ${summary.validTokens}
- **Invalid:** ${summary.invalidTokens}
- **Deprecated:** ${summary.deprecatedTokens}
- **Unused:** ${summary.unusedTokens}
- **Total Issues:** ${summary.totalIssues}

## Token Health Score

**Score:** ${Math.round((summary.validTokens / summary.totalTokens) * 100)}%

## Issues by Category

### Unused Tokens (${report.unusedTokens.length})

${report.unusedTokens.map(token => `- ${token.name} (${token.type})`).join('\n')}

### Hardcoded Values (${report.hardcodedValues.length})

${report.hardcodedValues.slice(0, 10).map(hv => `- ${hv.file}:${hv.line} - ${hv.value}${hv.suggestedToken ? ` → Use ${hv.suggestedToken.name}` : ''}`).join('\n')}

### Naming Issues (${report.namingIssues.length})

${report.namingIssues.map(ni => `- ${ni.token.name}: ${ni.issues.join(', ')}`).join('\n')}

### Conflicts (${report.conflicts.length})

${report.conflicts.map(c => `- ${c.conflict}: ${c.tokens.map(t => t.name).join(', ')}`).join('\n')}

## Recommendations

1. **Remove Unused Tokens:** Clean up ${report.unusedTokens.length} unused tokens
2. **Replace Hardcoded Values:** Replace ${report.hardcodedValues.length} hardcoded values with tokens
3. **Fix Naming Issues:** Address ${report.namingIssues.length} naming convention violations
4. **Resolve Conflicts:** Fix ${report.conflicts.length} token conflicts
5. **Documentation:** Improve token descriptions and usage guidelines
6. **Automation:** Set up automated token validation in CI/CD

---
*Generated by Design System Token Validator*
`;
  }

  /**
   * Get default design tokens for PVA Bazaar
   */
  private getDefaultDesignTokens(): DesignToken[] {
    return [
      // Colors
      { name: 'primary-blue-500', value: '#3B82F6', type: 'color', category: 'primary', description: 'Primary brand blue color' },
      { name: 'primary-green-500', value: '#10B981', type: 'color', category: 'primary', description: 'Success/positive actions' },
      { name: 'primary-red-500', value: '#EF4444', type: 'color', category: 'primary', description: 'Error/danger states' },
      { name: 'neutral-gray-100', value: '#F3F4F6', type: 'color', category: 'neutral', description: 'Light background' },
      { name: 'neutral-gray-900', value: '#1F2937', type: 'color', category: 'neutral', description: 'Dark text' },

      // Spacing
      { name: 'xs', value: '4px', type: 'spacing', category: 'scale', description: 'Extra small spacing' },
      { name: 'sm', value: '8px', type: 'spacing', category: 'scale', description: 'Small spacing' },
      { name: 'md', value: '16px', type: 'spacing', category: 'scale', description: 'Medium spacing' },
      { name: 'lg', value: '24px', type: 'spacing', category: 'scale', description: 'Large spacing' },
      { name: 'xl', value: '32px', type: 'spacing', category: 'scale', description: 'Extra large spacing' },

      // Typography
      { name: 'heading-xl', value: '36px', type: 'typography', category: 'heading', description: 'Extra large heading' },
      { name: 'heading-lg', value: '24px', type: 'typography', category: 'heading', description: 'Large heading' },
      { name: 'heading-md', value: '20px', type: 'typography', category: 'heading', description: 'Medium heading' },
      { name: 'body-lg', value: '18px', type: 'typography', category: 'body', description: 'Large body text' },
      { name: 'body-md', value: '16px', type: 'typography', category: 'body', description: 'Medium body text' },
      { name: 'body-sm', value: '14px', type: 'typography', category: 'body', description: 'Small body text' },

      // Shadows
      { name: 'sm', value: '0 1px 3px rgba(0, 0, 0, 0.1)', type: 'shadow', category: 'elevation', description: 'Small shadow' },
      { name: 'md', value: '0 4px 6px rgba(0, 0, 0, 0.1)', type: 'shadow', category: 'elevation', description: 'Medium shadow' },
      { name: 'lg', value: '0 10px 15px rgba(0, 0, 0, 0.1)', type: 'shadow', category: 'elevation', description: 'Large shadow' },

      // Borders
      { name: 'thin', value: '1px', type: 'border', category: 'width', description: 'Thin border' },
      { name: 'medium', value: '2px', type: 'border', category: 'width', description: 'Medium border' },
      { name: 'thick', value: '4px', type: 'border', category: 'width', description: 'Thick border' },
    ];
  }
}

export { DesignSystemTokenValidator, type DesignToken, type TokenValidationResult };