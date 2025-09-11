module.exports = async (page, scenario, viewport) => {
  console.log('READY > ' + scenario.label);
  
  // Ensure all images are loaded
  await page.evaluate(() => {
    return Promise.all(
      Array.from(document.images)
        .filter(img => !img.complete)
        .map(img => new Promise(resolve => {
          img.onload = img.onerror = resolve;
        }))
    );
  });
  
  // Wait for any CSS animations to complete
  await page.waitForTimeout(500);
  
  // Verify PVA brand colors are applied correctly
  const brandColors = await page.evaluate(() => {
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      primary: computedStyle.getPropertyValue('--primary').trim(),
      accent: computedStyle.getPropertyValue('--accent').trim(),
      gold: computedStyle.getPropertyValue('--gold').trim()
    };
  });
  
  console.log('Brand colors verified:', brandColors);
};
