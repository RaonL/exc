import type { CatalogMatch, LB, Origin, SecurityEvent, SimulatedRequest, Waf } from '../types';
import { evaluateRequest, resolveRequestContext, wafConfig } from './config';
import { matchesExclusion } from './waf-exclusions';

export function signatureAttackType(name: string) {
  if (name === 'SQL-Injection') return 'SQL Injection';
  if (name === 'Cross Site Scripting (XSS)') return 'Cross-site Scripting';
  if (name === 'Command Execution') return 'Command Injection';
  return name;
}
export function evaluateCatalogRequest(
  lb: LB,
  wafs: Waf[],
  origins: Origin[],
  match: CatalogMatch,
  request: SimulatedRequest,
) {
  if (!['signatures', 'bots'].includes(match.kind) || !match.id || !match.name)
    throw new Error('시그니처 또는 봇 항목을 선택하세요.');
  if (!/^\/(?!\/)/.test(request.path) || request.path.length > 2048 || /[\r\n]/.test(request.path))
    throw new Error('로컬 경로를 /로 시작해 2,048자 이내로 입력하세요.');
  if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(request.method))
    throw new Error('지원하지 않는 HTTP method입니다.');
  if (!['Existing', 'New', 'Updated'].includes(request.signatureState))
    throw new Error('서명 상태를 선택하세요.');
  if (match.kind === 'signatures' && !['High', 'Medium', 'Low'].includes(match.accuracy))
    throw new Error('정확도 정보가 없는 서명은 평가할 수 없습니다.');
  const botCategory =
    match.botClass === 'Malicious Bot'
      ? 'Malicious Bot'
      : match.botClass === 'Trusted Bot'
        ? 'Good Bot'
        : match.botClass === 'Untrusted Bot'
          ? 'Suspicious Bot'
          : undefined;
  if (match.kind === 'bots' && !botCategory)
    throw new Error('지원하지 않는 봇 분류입니다. 임의로 분류하지 않습니다.');
  const { config, route, wafId, waf } = resolveRequestContext(lb, wafs, request);
  if (wafId && !waf)
    throw new Error(
      '연결된 App Firewall이 현재 Namespace 또는 shared에 없습니다. LB 참조를 수정하세요.',
    );
  const trace = [
    'START 선택 항목이 매치되었다고 가정하는 로컬 테스트 · 실제 F5 탐지 아님',
    `CONTEXT namespace=${lb.namespace} lb=${lb.name} (${lb.id})`,
    `CATALOG kind=${match.kind} id=${match.id} name=${match.name} risk=${match.risk} accuracy=${match.accuracy || 'N/A'}`,
    `MATCH_ASSUMPTION phase=${match.kind === 'signatures' ? (match.appliesTo ?? 'Request') : 'Request'} · 선택한 항목의 메타데이터로 매치를 가정하며 요청/응답 본문을 탐지하지 않음`,
    `REQUEST ${request.method} ${request.path} authority=${request.authority ?? lb.domains[0]} signature_state=${request.signatureState}`,
    `ROUTE ${route ? `${route.name} (${route.id})` : '기본 경로'} · 위에서부터 첫 활성 method/path 일치 사용`,
    `ORIGIN pool_id=${route?.originId || lb.originId} · 실제 서버 연결 없음`,
  ];
  let action: SecurityEvent['action'] = 'Allowed',
    reason = '연결된 WAF가 없어 WAF 검사를 수행하지 않음';
  const policy = waf ? wafConfig(waf) : undefined;
  if (waf && policy) {
    trace.push(
      `POLICY ${waf.namespace}/${waf.name} (${waf.id}) mode=${waf.mode} security_policy=${policy.policy}`,
    );
    const attack = signatureAttackType(match.attackType);
    const scenario = match.kind === 'bots' ? 'Bot Detection' : attack;
    const exclusion = config.exclusions.find((rule) =>
      matchesExclusion(rule, lb, scenario, request),
    );
    trace.push(
      `EXCLUSION ${exclusion ? `일치: ${exclusion.name} (${exclusion.id})` : '일치 없음 (도메인·경로·method·공격 유형·만료 확인)'}`,
    );
    for (const rule of config.exclusions.slice(0, 20))
      trace.push(
        `EXCLUSION_RULE ${rule.name} matched=${matchesExclusion(rule, lb, scenario, request)} domain=${rule.domain || 'ANY'} method=${rule.method} path=${rule.pathMatch ?? 'Prefix'}:${rule.path} attack=${rule.attack} expires=${rule.expiresAt ?? '없음'}`,
      );
    if (config.exclusions.length > 20)
      trace.push(
        `EXCLUSION_RULE 상세 표시는 처음 20개; 총 ${config.exclusions.length}개 전체를 평가함`,
      );
    if (exclusion) reason = `WAF 예외 ${exclusion.name}에 일치하여 통과`;
    else if (match.kind === 'signatures') {
      const custom = policy.policy === 'Custom';
      const accuracy = custom ? policy.accuracy : 'High and Medium';
      const included =
        accuracy === 'High, Medium and Low' ||
        match.accuracy === 'High' ||
        (accuracy === 'High and Medium' && match.accuracy === 'Medium');
      const disabled = custom && policy.disabledAttacks.map(signatureAttackType).includes(attack);
      const signatureAction = custom
        ? match.accuracy === 'High'
          ? policy.highAction
          : match.accuracy === 'Medium'
            ? (policy.mediumAction ?? 'Block')
            : (policy.lowAction ?? 'Block')
        : 'Block';
      const expires = policy.stagingStartedAt
        ? Date.parse(policy.stagingStartedAt) + policy.stagingDays * 86400000
        : undefined;
      const staged =
        custom &&
        policy.staging !== 'Disabled' &&
        (request.signatureState === 'New' ||
          (request.signatureState === 'Updated' &&
            policy.staging === 'New and updated signatures')) &&
        (expires === undefined || Date.now() < expires);
      trace.push(
        `ATTACK_TYPE original=${match.attackType} normalized=${attack} disabled=${disabled}`,
        `ACCURACY selected=${accuracy} item=${match.accuracy} included=${included} action=${signatureAction}`,
        `STAGING setting=${custom ? policy.staging : 'Default 정책: 미적용'} state=${request.signatureState} active=${staged} expires=${expires === undefined ? '시작 시각 미지정' : new Date(expires).toISOString()}`,
        `TUNING enabled=${policy.tuning} · 자동 학습/튜닝 엔진은 재현하지 않음; 결과에 적용하지 않음`,
      );
      if (disabled) reason = `${attack} 유형이 Custom 정책에서 비활성화되어 통과`;
      else if (!included)
        reason = `${match.accuracy} 정확도 서명이 ${accuracy} 선택에 포함되지 않아 통과`;
      else if (signatureAction === 'Ignore')
        reason = `${match.accuracy} Accuracy Action=Ignore이므로 통과`;
      else if (waf.mode === 'Monitoring' || staged || signatureAction === 'Report') {
        action = 'Detected';
        reason =
          waf.mode === 'Monitoring'
            ? 'WAF Monitoring: 매치를 기록하고 통과'
            : staged
              ? `${request.signatureState} 서명이 스테이징 기간 안에 있어 기록 후 통과`
              : `${match.accuracy} Accuracy Action=Report이므로 기록 후 통과`;
      } else {
        action = 'Blocked';
        reason = 'WAF Blocking + 포함된 서명 + Action=Block: 모의 차단';
      }
    } else {
      const botAction =
        policy.botProtection === 'Custom'
          ? botCategory === 'Malicious Bot'
            ? (policy.maliciousBotAction ?? 'Block')
            : botCategory === 'Good Bot'
              ? (policy.goodBotAction ?? 'Report')
              : (policy.suspiciousBotAction ?? 'Report')
          : botCategory === 'Malicious Bot'
            ? 'Block'
            : 'Report';
      trace.push(
        `BOT_CLASS original=${match.botClass} mapped=${botCategory} · Trusted→Good / Untrusted→Suspicious는 학습용 매핑`,
        `BOT_POLICY Signature-Based Bot Protection=${policy.botProtection ?? 'Default'} action=${botAction}`,
        `BOT_DEFENSE lb.botDefense=${lb.botDefense} · 별도 제품 설정이며 이 WAF 서명 기반 테스트에는 적용하지 않음`,
        'SIGNATURE_ACCURACY/STAGING 봇 항목에는 적용하지 않음',
      );
      if (botAction === 'Ignore') reason = `${botCategory} Action=Ignore이므로 통과`;
      else if (waf.mode === 'Monitoring' || botAction === 'Report') {
        action = 'Detected';
        reason =
          waf.mode === 'Monitoring'
            ? 'WAF Monitoring: 봇 매치를 기록하고 통과'
            : `${botCategory} Action=Report이므로 기록 후 통과`;
      } else {
        action = 'Blocked';
        reason = `WAF Blocking + ${botCategory} Action=Block: 모의 차단`;
      }
    }
  } else trace.push('POLICY 없음 · 서명/봇 검사를 건너뜀');
  const forward = evaluateRequest(lb, wafs, origins, 'Normal HTTP traffic', request);
  const responseCode = action === 'Blocked' ? policy!.responseCode : forward.responseCode;
  const responseBody = action === 'Blocked' ? policy!.responseBody : forward.responseBody;
  trace.push(
    `DECISION action=${action} reason=${reason}`,
    action === 'Blocked'
      ? match.appliesTo === 'Response'
        ? 'FORWARD 응답 서명 매치를 가정하여 응답을 모의 차단; 실제 Origin 응답 없음'
        : 'FORWARD 차단되어 Origin/Route 응답 처리 생략'
      : `FORWARD ${route?.type ?? 'Simple'} · HTTP ${forward.responseCode}; ${forward.reason}`,
    `RESPONSE status=${responseCode} action=${action}`,
    'END simulation=true external_requests=0',
  );
  return {
    action,
    responseCode,
    responseBody,
    reason,
    evaluatedWafId: waf?.id,
    evaluationTrace: trace,
    policySnapshot:
      waf && policy
        ? {
            id: waf.id,
            name: waf.name,
            namespace: waf.namespace,
            mode: waf.mode,
            config: structuredClone(policy),
          }
        : undefined,
  };
}
