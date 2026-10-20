async (page) => {
  const b = (name) => page.getByRole('button', { name, exact: true });
  await page.keyboard.press('Escape');
  if (!(await b('HTTP Load Balancers').isVisible())) {
    await b('Select Workspace').click();
    await page
      .getByRole('complementary')
      .getByRole('button', { name: 'Web App & API Protection', exact: true })
      .click();
  }
  await page
    .getByRole('combobox', { name: 'Namespace', exact: true })
    .selectOption('training-c2-lab2');
  await b('HTTP Load Balancers').click();
  await b('Edit c2-lab2-lb').click();
  await page
    .getByRole('dialog')
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Disable' }) })
    .selectOption('Enable');
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('f5-xc-simulator-v1')).state,
  );
  const waf = state.wafs.find((w) => w.namespace === 'training-c2-lab2');
  await page
    .getByRole('dialog')
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'training-c2-lab2/' + waf.name }) })
    .selectOption(waf.id);
  await b('Save HTTP Load Balancer').click();
  await b('Security Catalog').click();
  await page.getByRole('button', { name: /^Bots/ }).click();
  await page.getByPlaceholder('Search ID, name or category…').fill('DatasurgeOnTop');
  await b('DatasurgeOnTop').click();
  const result = {};
  for (const mode of ['Monitoring', 'Blocking']) {
    await b('Edit App Firewall').click();
    await page
      .getByRole('dialog')
      .locator('label.field')
      .filter({ has: page.locator('span').filter({ hasText: /^Enforcement Mode$/ }) })
      .locator('select')
      .selectOption(mode);
    await b('Save App Firewall').click();
    await b('Run Catalog Sample · 모의 실행').click();
    result[mode] = await page.locator('.catalog-run-result').first().innerText();
  }
  await page.screenshot({ path: 'output/verification/c2-signature-bot.png' });
  return {
    result,
    pass:
      result.Monitoring.includes('HTTP 200 / Detected') &&
      result.Blocking.includes('HTTP 403 / Blocked'),
  };
}
