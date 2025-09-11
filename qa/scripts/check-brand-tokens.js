#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// PVA Brand Colors (official palette)
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

// Convert hex to rgb for comparison
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Check if CSS files contain PVA brand colors
async function checkBrandCompliance(cssFiles) {
  const issues = [];
  const foundColors = new Set();
  
  for (const cssFile of cssFiles) {
    if (!fs.existsSync(cssFile)) {
      issues.push(`CSS file not found: ${cssFile}`);
      continue;
    }
    
    const content = fs.readFileSync(cssFile, 'utf8');
    
    // Check for PVA brand colors
    Object.entries(PVA_COLORS).forEach(([name, hex]) => {
      if (content.includes(hex.toLowerCase()) || content.includes(hex.toUpperCase())) {
        foundColors.add(name);
      }
    });
    
    // Check for forbidden colors (basic check)
    const forbiddenColors = [
      '#ff0000', '#FF0000', // Red
      '#0000ff', '#0000FF', // Blue  
      '#ffff00', '#FFFF00', // Yellow
      '#ff00ff', '#FF00FF', // Magenta
      '#00ffff', '#00FFFF'  // Cyan
    ];
    
    forbiddenColors.forEach(color => {
      if (content.includes(color)) {
        issues.push(`Forbidden color ${color} found in ${cssFile}`);
      }
    });
    
    // Check for hardcoded colors that might not be brand compliant
    const colorRegex = /#[0-9a-fA-F]{6}/g;
    const matches = content.match(colorRegex) || [];
    
    matches.forEach(match => {
      const lowerMatch = match.toLowerCase();
      const isPvaColor = Object.values(PVA_COLORS).some(color => 
        color.toLowerCase() === lowerMatch
      );
      
      if (!isPvaColor && !forbiddenColors.includes(lowerMatch)) {
        // Check if it's a neutral color (grays, whites, blacks)
        const rgb = hexToRgb(match);
        if (rgb) {
          const isGray = Math.abs(rgb.r - rgb.g) < 10 && Math.abs(rgb.g - rgb.b) < 10;
          const isWhiteish = rgb.r > 240 && rgb.g > 240 && rgb.b > 240;
          const isBlackish = rgb.r < 20 && rgb.g < 20 && rgb.b < 20;
          
          if (!isGray && !isWhiteish && !isBlackish) {
            issues.push(`Non-PVA color ${match} found in ${cssFile} - consider using PVA palette`);
          }
        }
      }
    });
  }
  
  return {
    issues,
    foundColors: Array.from(foundColors),
    requiredColors: Object.keys(PVA_COLORS)
  };
}

// Check font usage
async function checkFontCompliance(cssFiles) {
  const issues = [];
  const allowedFonts = [
    'Inter',
    'system-ui', 
    'ui-sans-serif',
    'Arial',
    'sans-serif',
    'serif',
    'monospace'
  ];
  
  const forbiddenFonts = [
    'Comic Sans MS',
    'Papyrus',
    'Impact'
  ];
  
  for (const cssFile of cssFiles) {
    if (!fs.existsSync(cssFile)) continue;
    
    const content = fs.readFileSync(cssFile, 'utf8');
    
    // Check for forbidden fonts
    forbiddenFonts.forEach(font => {
      if (content.includes(font)) {
        issues.push(`Forbidden font "${font}" found in ${cssFile}`);
      }
    });
    
    // Extract font-family declarations
    const fontFamilyRegex = /font-family\s*:\s*([^;]+);/g;
    let match;
    
    while ((match = fontFamilyRegex.exec(content)) !== null) {
      const fontDeclaration = match[1].trim();
      
      // Simple check for non-standard fonts
      if (!allowedFonts.some(font => fontDeclaration.includes(font))) {
        const customFonts = fontDeclaration.split(',').map(f => f.trim().replace(/['"]/g, ''));
        customFonts.forEach(font => {
          if (!allowedFonts.includes(font) && !font.startsWith('var(')) {
            console.warn(`⚠️  Custom font detected: "${font}" in ${cssFile}`);
          }
        });
      }
    }
  }
  
  return { issues };
}

// Main function
async function checkBrandTokens() {
  console.log('🎨 Checking PVA brand compliance...');
  
  // Look for CSS files in common locations
  const possibleCssLocations = [
    'apps/web-com/out/_next/static/css',
    'apps/web-org/out/_next/static/css', 
    'apps/web-com/.next/static/css',
    'apps/web-org/.next/static/css',
    'dist/css',
    'build/static/css'
  ];
  
  const cssFiles = [];
  
  // Find CSS files
  possibleCssLocations.forEach(location => {
    if (fs.existsSync(location)) {
      const files = fs.readdirSync(location)
        .filter(file => file.endsWith('.css'))
        .map(file => path.join(location, file));
      cssFiles.push(...files);
    }
  });
  
  // Also check for source CSS files
  const sourceCssLocations = [
    'apps/web-com/src/styles',
    'apps/web-org/src/styles',
    'packages/ui/styles'
  ];
  
  sourceCssLocations.forEach(location => {
    if (fs.existsSync(location)) {
      const files = fs.readdirSync(location)
        .filter(file => file.endsWith('.css') || file.endsWith('.scss'))
        .map(file => path.join(location, file));
      cssFiles.push(...files);
    }
  });
  
  if (cssFiles.length === 0) {
    console.warn('⚠️  No CSS files found. Skipping brand color enforcement for this commit.');
    return; // Do not fail commit when no CSS present
  }
  
  console.log(`🔍 Checking ${cssFiles.length} CSS files...`);
  
  // Check brand compliance
  const colorResults = await checkBrandCompliance(cssFiles);
  const fontResults = await checkFontCompliance(cssFiles);
  
  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    filesChecked: cssFiles.length,
    colorCompliance: {
      foundColors: colorResults.foundColors,
      requiredColors: colorResults.requiredColors,
      issues: colorResults.issues
    },
    fontCompliance: {
      issues: fontResults.issues
    },
    summary: {
      colorIssues: colorResults.issues.length,
      fontIssues: fontResults.issues.length,
      totalIssues: colorResults.issues.length + fontResults.issues.length
    }
  };
  
  // Save report
  const reportsDir = 'qa/reports';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, `brand-compliance-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Output results
  console.log('\n📊 Brand Compliance Report');
  console.log('==========================');
  
  console.log(`\n🎨 Colors Found: ${colorResults.foundColors.length}/${colorResults.requiredColors.length}`);
  colorResults.foundColors.forEach(color => {
    console.log(`  ✅ ${color}: ${PVA_COLORS[color]}`);
  });
  
  const missingColors = colorResults.requiredColors.filter(color => 
    !colorResults.foundColors.includes(color)
  );
  
  if (missingColors.length > 0) {
    console.log('\n🚨 Missing PVA Colors:');
    missingColors.forEach(color => {
      console.log(`  ❌ ${color}: ${PVA_COLORS[color]}`);
    });
  }
  
  if (colorResults.issues.length > 0) {
    console.log('\n🚨 Color Issues:');
    colorResults.issues.forEach(issue => {
      console.log(`  ❌ ${issue}`);
    });
  }
  
  if (fontResults.issues.length > 0) {
    console.log('\n🚨 Font Issues:');
    fontResults.issues.forEach(issue => {
      console.log(`  ❌ ${issue}`);
    });
  }
  
  console.log(`\n📄 Full report saved: ${reportPath}`);
  
  // Exit with error if critical issues found
  const criticalIssues = [
    ...colorResults.issues.filter(issue => issue.includes('Forbidden')),
    ...fontResults.issues.filter(issue => issue.includes('Forbidden'))
  ];
  
  if (criticalIssues.length > 0) {
    console.log('\n❌ Critical brand compliance issues found!');
    process.exit(1);
  }
  
  console.log('\n✅ Brand compliance check completed successfully!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkBrandTokens().catch(console.error);
}

export default checkBrandTokens;
