import { expect, it } from 'vitest';
import { parsePolicyFile } from './policy-file';
it('reads four explicit boolean controls and rejects incomplete policy instead of enabling defaults', () => {
  const file =
    'controls:\n  waf:\n    enabled: true\n  api_discovery:\n    enabled: false\n  bot_advanced:\n    enabled: false\n  rate_limiting:\n    enabled: false';
  expect(parsePolicyFile(file)).toEqual({
    waf: true,
    api_discovery: false,
    bot_advanced: false,
    rate_limiting: false,
  });
  expect(() => parsePolicyFile(file.replace('enabled: true', 'enabled: yes'))).toThrow();
});
