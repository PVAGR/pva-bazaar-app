module.exports = {
  "id": "pva-bazaar-visual-regression",
  "viewports": [
    {
      "label": "desktop",
      "width": 1920,
      "height": 1080
    },
    {
      "label": "tablet", 
      "width": 768,
      "height": 1024
    },
    {
      "label": "mobile",
      "width": 375,
      "height": 667
    }
  ],
  "onBeforeScript": "puppet/onBefore.js",
  "onReadyScript": "puppet/onReady.js",
  "scenarios": [
    {
      "label": "PVA Bazaar - Homepage (.com)",
      "cookiePath": "backstop_data/engine_scripts/cookies.json",
      "url": "http://localhost:3000",
      "referenceUrl": "",
      "readyEvent": "",
      "readySelector": "",
      "delay": 2000,
      "hideSelectors": [],
      "removeSelectors": [],
      "hoverSelector": "",
      "clickSelector": "",
      "postInteractionWait": 0,
      "selectors": [
        "document",
        ".hero-section",
        ".featured-artifacts",
        ".navigation"
      ],
      "selectorExpansion": true,
      "expect": 0,
      "misMatchThreshold": 0.1,
      "requireSameDimensions": true
    },
    {
      "label": "PVA Bazaar - About Page (.org)",
      "url": "http://localhost:3001/about",
      "delay": 2000,
      "selectors": [
        "document",
        ".hero-section",
        ".mission-statement",
        ".team-section"
      ],
      "misMatchThreshold": 0.1
    },
    {
      "label": "PVA Bazaar - Artifact Showcase",
      "url": "http://localhost:3000/artifacts",
      "delay": 3000,
      "selectors": [
        "document",
        ".artifact-grid",
        ".filter-sidebar",
        ".artifact-card"
      ],
      "misMatchThreshold": 0.1
    },
    {
      "label": "PVA Bazaar - Portfolio Page",
      "url": "http://localhost:3000/portfolio",
      "delay": 2000,
      "selectors": [
        "document",
        ".portfolio-header",
        ".owned-artifacts",
        ".fractional-shares"
      ],
      "misMatchThreshold": 0.1
    },
    {
      "label": "PVA Bazaar - Wallet Connect Modal",
      "url": "http://localhost:3000",
      "clickSelector": "[data-testid='connect-wallet-button']",
      "postInteractionWait": 1000,
      "selectors": [
        ".wallet-modal",
        ".wallet-options"
      ],
      "misMatchThreshold": 0.05
    },
    {
      "label": "PVA Bazaar - Dark Mode Toggle",
      "url": "http://localhost:3000",
      "clickSelector": "[data-testid='theme-toggle']",
      "postInteractionWait": 500,
      "selectors": [
        "document"
      ],
      "misMatchThreshold": 0.1
    }
  ],
  "paths": {
    "bitmaps_reference": "qa/backstop/bitmaps_reference",
    "bitmaps_test": "qa/backstop/bitmaps_test",
    "engine_scripts": "qa/backstop/engine_scripts",
    "html_report": "qa/backstop/html_report",
    "ci_report": "qa/backstop/ci_report"
  },
  "report": ["browser"],
  "engine": "playwright",
  "engineOptions": {
    "args": ["--no-sandbox"]
  },
  "asyncCaptureLimit": 5,
  "asyncCompareLimit": 10,
  "debug": false,
  "debugWindow": false
};
