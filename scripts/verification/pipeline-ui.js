async (page) => {
  const b = (name) => page.getByRole('button', { name, exact: true });
  if (!(await page.locator('.training-center').isVisible())) await b('Training Center 1–8').click();
  await page.locator('.training-class').filter({ hasText: 'CLASS 7' }).click();
  await page
    .locator('.training-lab-nav > button')
    .filter({ has: page.locator('small') })
    .nth(1)
    .click();
  await page.getByRole('tab', { name: '환경 / 설정', exact: true }).click();
  const file = page.getByRole('textbox', { name: 'security-controls.yaml', exact: true });
  const disabled =
    'controls:\n  waf:\n    enabled: false\n  api_discovery:\n    enabled: false\n  bot_advanced:\n    enabled: false\n  rate_limiting:\n    enabled: false';
  await file.fill(disabled);
  await b('Apply local controls').click();
  await b('Build').click();
  await b('Test').click();
  await b('Deploy').click();
  const failedGate = await page.getByRole('main').innerText();
  if (!failedGate.includes('Security gate: WAF Blocking'))
    throw Error('Disabled WAF did not fail the deployment gate');
  await file.fill(disabled.replace('waf:\n    enabled: false', 'waf:\n    enabled: true'));
  await b('Apply local controls').click();
  await b('Build').click();
  await b('Test').click();
  await b('Deploy').click();
  await page.getByRole('tab', { name: '요청 / 검증', exact: true }).click();
  await b('현재 설정 검증').click();
  const session = await page.evaluate(
    () => JSON.parse(localStorage.getItem('f5-xc-training-v1')).state.sessions['c7-module2'],
  );
  await page.screenshot({ path: 'output/verification/c7-policy-gate.png' });
  return {
    failedGate: failedGate.includes('Security gate: WAF Blocking'),
    pipeline: session.environment.controls.pipeline,
    checks: session.verification.checks,
    pass: session.verification.checks.every((c) => c.pass),
  };
}
