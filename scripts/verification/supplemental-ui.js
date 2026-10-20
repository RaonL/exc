async (page) => {
  const b = (name) => page.getByRole('button', { name, exact: true });
  const selectField = (name, value) =>
    page
      .getByRole('dialog')
      .last()
      .locator('label.field')
      .filter({ has: page.locator('span').filter({ hasText: new RegExp('^' + name + '$') }) })
      .locator('select')
      .selectOption(value);
  const result = {};
  if (await page.locator('.training-center').isVisible()) {
    await b('Select Workspace').click();
    await b('Web App & API Protection').click();
  }
  await page
    .getByRole('combobox', { name: 'Namespace', exact: true })
    .selectOption('training-c2-lab1');
  await b('HTTP Load Balancers').click();
  await b('App Firewall').click();
  const initialState = await page.evaluate(
    () => JSON.parse(localStorage.getItem('f5-xc-simulator-v1')).state,
  );
  const policy = initialState.wafs.find((w) => w.namespace === 'training-c2-lab1');
  await b('Edit ' + policy.name).click();
  await selectField('Enforcement Mode', 'Monitoring');
  await b('Save App Firewall').click();
  await b('HTTP Load Balancers').click();
  await b('Open application c2-lab1-lb').click();
  await b('SQL Injection').click();
  result.monitoring = await page.getByRole('dialog').innerText();
  if (!result.monitoring.includes('HTTP 200') || !result.monitoring.includes('Detected'))
    throw Error('Monitoring must detect and allow');
  await b('Close dialog').click();
  await b('App Firewall').click();
  await b('Edit ' + policy.name).click();
  await selectField('Enforcement Mode', 'Blocking');
  await b('Save App Firewall').click();
  await b('HTTP Load Balancers').click();
  const sample = async (name) => {
    await b(name).click();
    return await page.getByRole('dialog').innerText();
  };
  await b('Open application c2-lab1-lb').click();
  result.before = await sample('SQL Injection');
  if (!result.before.includes('HTTP 403')) throw Error('Pre-exclusion SQLi must be blocked');
  await b('Close dialog').click();
  await b('Edit c2-lab1-lb').click();
  await b('Add Exclusion Rule').click();
  await page
    .getByRole('dialog')
    .last()
    .getByLabel('Name *', { exact: true })
    .fill('audit-product-sqli');
  await page
    .getByRole('dialog')
    .last()
    .getByLabel('Path Regex *', { exact: true })
    .fill('^/product$');
  await b('Apply').click();
  await b('Apply').click();
  await b('Save HTTP Load Balancer').click();
  await b('Open application c2-lab1-lb').click();
  result.excluded = await sample('SQL Injection');
  result.otherAttack = await sample('XSS');
  if (!result.excluded.includes('HTTP 200') || !result.otherAttack.includes('HTTP 403'))
    throw Error('Exclusion escaped its scope');
  await b('Close dialog').click();
  await b('App Firewall').click();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem('f5-xc-simulator-v1')).state,
  );
  const waf = state.wafs.find((w) => w.namespace === 'training-c2-lab1');
  await b('Edit ' + waf.name).click();
  await page.getByLabel('Show Advanced Fields', { exact: true }).check();
  await selectField('Blocking Response Page', 'Custom');
  await page
    .getByLabel('Custom Blocking Response Page Body', { exact: false })
    .fill('Training rejection. Support ID: {{request_id}}');
  await b('Save App Firewall').click();
  await b('HTTP Load Balancers').click();
  await b('Open application c2-lab1-lb').click();
  result.customResponse = await sample('XSS');
  if (
    !result.customResponse.includes('Training rejection. Support ID:') ||
    result.customResponse.includes('{{request_id}}')
  )
    throw Error('Support ID substitution failed');
  await page.screenshot({ path: 'output/verification/c2-task5.png' });
  await b('Close dialog').click();
  await page.reload({ waitUntil: 'domcontentloaded' });
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('f5-xc-simulator-v1')).state,
  );
  result.events = saved.events.filter(
    (e) => e.namespace === 'training-c2-lab1' && e.generatedBy === 'console-request',
  );
  result.persisted = saved.lbs
    .find((l) => l.namespace === 'training-c2-lab1')
    .config.exclusions.some((r) => r.name === 'audit-product-sqli');
  result.pass = result.persisted;
  return result;
}
