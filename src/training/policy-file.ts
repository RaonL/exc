export function parsePolicyFile(source: string) {
  const sections = ['waf', 'api_discovery', 'bot_advanced', 'rate_limiting'] as const;
  const result = {} as Record<(typeof sections)[number], boolean>;
  for (const key of sections) {
    const value = source.match(
      new RegExp(`^  ${key}:\\s*\\r?\\n    enabled: (true|false)\\s*$`, 'm'),
    );
    if (!value)
      throw new Error(
        `${key}: enabled는 true 또는 false여야 합니다. 공식 예제의 들여쓰기를 유지하세요.`,
      );
    result[key] = value[1] === 'true';
  }
  if (!/^controls:\s*$/m.test(source)) throw new Error('controls:가 필요합니다.');
  return result;
}
