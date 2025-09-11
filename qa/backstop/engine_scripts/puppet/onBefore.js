module.exports = async (page, scenario, viewport) => {
  console.log('SCENARIO > ' + scenario.label);
  
  // Wait for fonts to load
  await page.waitForLoadState('networkidle');
  
  // Ensure PVA brand fonts are loaded
  await page.waitForFunction(() => {
    return document.fonts.ready;
  });
  
  // Hide dynamic elements that change between runs
  await page.addStyleTag({
    content: `
      .timestamp,
      .live-counter,
      .animation,
      .skeleton-loader {
        visibility: hidden !important;
      }
      
      /* Ensure consistent scrollbar visibility */
      ::-webkit-scrollbar {
        display: none;
      }
      
      /* Disable smooth scrolling for consistent captures */
      * {
        scroll-behavior: auto !important;
      }
    `
  });
  
  // Wait for any lazy-loaded images
  await page.waitForTimeout(1000);
};
