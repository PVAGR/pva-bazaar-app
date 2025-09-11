import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const urls = [
  'http://localhost:3000',
  'http://localhost:3000/artifacts',
  'http://localhost:3000/portfolio',
  'http://localhost:3000/marketplace',
  'http://localhost:3001',
  'http://localhost:3001/about',
  'http://localhost:3001/contact'
];

const PVA_COLORS = {
  primaryDark: '#0f3b2d',
  primary: '#1c5a45',
  primaryLight: '#2d7d5a',
  accent: '#4ef8a3',
  accentDark: '#2bb673',
  gold: '#d4af37',
  textLight: '#e8f4f0',
  textMuted: '#a8b0b9'
};

async function runAxeAudit() {
  const browser = await chromium.launch();
  const results = [];
  
  for (const url of urls) {
    console.log(`🔍 Testing accessibility: ${url}`);
    
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for page to be fully rendered
      await page.waitForTimeout(2000);
      
      // Check for PVA brand color compliance
      const colorCompliance = await page.evaluate((colors) => {
        const issues = [];
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(el => {
          const style = getComputedStyle(el);
          const bgColor = style.backgroundColor;
          const textColor = style.color;
          
          // Check for non-PVA colors (basic check)
          if (bgColor.includes('rgb(255, 0, 0)')) { // Red
            issues.push(`Non-PVA red color found on ${el.tagName}`);
          }
          if (bgColor.includes('rgb(0, 0, 255)')) { // Blue  
            issues.push(`Non-PVA blue color found on ${el.tagName}`);
          }
        });
        
        return issues;
      }, PVA_COLORS);
      
      // Run axe accessibility audit
      const axeResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('[data-testid="external-iframe"]') // Exclude third-party content
        .analyze();
      
      results.push({
        url,
        violations: axeResults.violations,
        passes: axeResults.passes.length,
        incomplete: axeResults.incomplete,
        colorCompliance,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ ${url}: ${axeResults.violations.length} violations, ${axeResults.passes.length} passes`);
      
      if (colorCompliance.length > 0) {
        console.warn(`⚠️  Color compliance issues: ${colorCompliance.length}`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${url}:`, error.message);
      results.push({
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await page.close();
    }
  }
  
  await browser.close();
  
  // Generate report
  const reportDir = 'qa/reports';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, `axe-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  
  // Generate HTML report
  const htmlReport = generateHtmlReport(results);
  const htmlReportPath = path.join(reportDir, `axe-report-${Date.now()}.html`);
  fs.writeFileSync(htmlReportPath, htmlReport);
  
  console.log(`📊 Accessibility report saved: ${reportPath}`);
  console.log(`🌐 HTML report saved: ${htmlReportPath}`);
  
  // Check if any critical violations exist
  const criticalViolations = results.filter(r => 
    r.violations && r.violations.some(v => v.impact === 'critical')
  );
  
  if (criticalViolations.length > 0) {
    console.error('❌ Critical accessibility violations found!');
    process.exit(1);
  }
  
  console.log('✅ Accessibility audit completed successfully');
}

function generateHtmlReport(results) {
  const violationsSummary = results.reduce((acc, result) => {
    if (result.violations) {
      acc += result.violations.length;
    }
    return acc;
  }, 0);
  
  return `
<!DOCTYPE html>
<html>
<head>
    <title>PVA Bazaar Accessibility Report</title>
    <style>
        body { font-family: Inter, system-ui, sans-serif; margin: 40px; background: #f8f9fa; }
        .header { background: #1c5a45; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .summary { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .result { background: white; margin: 15px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #4ef8a3; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .violation { background: #fff3f3; border-left-color: #f56565; margin: 10px 0; padding: 15px; border-radius: 4px; }
        .pass { color: #2bb673; }
        .fail { color: #f56565; }
        .impact-critical { background: #fed7d7; }
        .impact-serious { background: #fef5e7; }
        .impact-moderate { background: #f0fff4; }
        .impact-minor { background: #f7fafc; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🏛️ PVA Bazaar Accessibility Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Total Violations: <strong>${violationsSummary}</strong></p>
    </div>
    
    <div class="summary">
        <h2>📊 Summary</h2>
        <p>Tested ${results.length} pages against WCAG 2.1 AA standards and PVA brand compliance.</p>
    </div>
    
    ${results.map(result => `
        <div class="result">
            <h3>📄 ${result.url}</h3>
            ${result.error ? `
                <p class="fail">❌ Error: ${result.error}</p>
            ` : `
                <p class="pass">✅ Passes: ${result.passes}</p>
                <p class="${result.violations?.length > 0 ? 'fail' : 'pass'}">
                    ${result.violations?.length > 0 ? '❌' : '✅'} Violations: ${result.violations?.length || 0}
                </p>
                ${result.colorCompliance?.length > 0 ? `
                    <p class="fail">🎨 Brand compliance issues: ${result.colorCompliance.length}</p>
                ` : `
                    <p class="pass">🎨 Brand compliant</p>
                `}
                
                ${result.violations?.map(violation => `
                    <div class="violation impact-${violation.impact}">
                        <h4>${violation.id}: ${violation.description}</h4>
                        <p><strong>Impact:</strong> ${violation.impact}</p>
                        <p><strong>Help:</strong> <a href="${violation.helpUrl}" target="_blank">${violation.help}</a></p>
                        <p><strong>Affected elements:</strong> ${violation.nodes.length}</p>
                    </div>
                `).join('') || ''}
            `}
        </div>
    `).join('')}
</body>
</html>
  `;
}

// Run the audit
if (import.meta.url === `file://${process.argv[1]}`) {
  runAxeAudit().catch(console.error);
}

export default runAxeAudit;
