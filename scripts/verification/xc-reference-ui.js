async (page) => {
  const errors = [],
    listener = (error) => errors.push(String(error));
  page.on('pageerror', listener);
  const button = (name) => page.getByRole('button', { name, exact: true });
  const capture = (name) => page.screenshot({ path: `docs/screenshots/xc-${name}.png` });
  await page.setViewportSize({ width: 1793, height: 1100 });
  await page.reload();
  if (!(await page.locator('.xc-home').isVisible())) await button('XC Simulator Home').click();
  await capture('home');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('home-mobile');
  const mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  await page.setViewportSize({ width: 1793, height: 1100 });
  await page.locator('.xc-workspace-card').first().click();
  await capture('security');
  await button('Load Balancers').click();
  await capture('load-balancer-menu');
  await button('Origin Pools').click();
  await page.locator('.xc-ellipsis').first().click();
  await capture('origin-pools');
  await button('Manage Configuration').click();
  await capture('origin-view');
  await button('Cancel and Exit').click();
  await button('Load Balancers').click();
  await button('HTTP Load Balancers').click();
  await capture('http-lbs');
  await page
    .getByRole('button', { name: /^Actions for / })
    .first()
    .click();
  await button('Manage Configuration').click();
  await capture('http-lb-view');
  await page.locator('.xc-edit-configuration').click();
  await page
    .getByRole('navigation', { name: 'Configuration sections' })
    .getByRole('button', { name: 'Web Application Firewall', exact: true })
    .click();
  await page.getByRole('combobox', { name: 'Web Application Firewall (WAF)', exact: true }).click();
  await capture('waf-enable');
  await page.keyboard.press('Escape');
  const escapePreserved = await page.getByRole('dialog').isVisible();
  await button('Cancel and Exit').click();
  await button('Performance').click();
  await capture('performance');
  await page.locator('.xc-performance .resource-link').first().click();
  await page.getByRole('tab', { name: 'Requests', exact: true }).click();
  await capture('requests');
  await button('Security').click();
  await page.locator('.xc-world-map path').first().waitFor({ state: 'attached' });
  await page.locator('.xc-world-map').scrollIntoViewIfNeeded();
  await capture('security-country');
  const mapPaths = await page.locator('.xc-world-map path').count();
  const saved = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('f5-xc-simulator-v1')).state.wafs.find(
        (w) => w.name === 'capture-reference-waf',
      )?.config.accuracy,
  );
  await button('XC Simulator Home').click();
  page.off('pageerror', listener);
  if (mobileOverflow || !escapePreserved || mapPaths !== 176 || errors.length)
    throw Error(JSON.stringify({ mobileOverflow, escapePreserved, mapPaths, errors }));
  return { pass: true, mobileOverflow, escapePreserved, mapPaths, errors, saved };
}
