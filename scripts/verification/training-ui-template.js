async (page) => {
  const labs=LABS;
  const results=[];
  const b=name=>page.getByRole('button',{name,exact:true});
  const tab=name=>page.getByRole('tab',{name,exact:true}).click();
  const select=(name,value)=>page.getByRole('combobox',{name,exact:true}).selectOption(value);
  const toggle=(name,value=true)=>page.getByRole('switch',{name,exact:true}).setChecked(value);
  const fill=(name,value)=>page.getByRole('textbox',{name,exact:true}).fill(value);
  const state=id=>page.evaluate(id=>JSON.parse(localStorage.getItem('f5-xc-training-v1')).state.sessions[id],id);
  const execute=async(q={})=>{
    await tab('요청 / 검증');
    await select('HTTP Method',q.method??'GET');await fill('Request Path',q.path??'/');
    await select('Scenario Input',q.attack??'None');await select('Transport',q.transport??'HTTP');
    await fill('Client Fingerprint (JA4 demo)',q.identity??'audit-human');
    await select('Client Country',q.country??'South Korea');await select('IP Reputation',q.reputation??'Clean');
    await fill('Headers (JSON)',JSON.stringify(q.headers??{}));
    await page.getByRole('spinbutton',{name:'Repeat Count',exact:true}).fill(String(q.repeat??1));
    await b('로컬 요청 실행').click();
  };
  for(const lab of labs){
    const record={id:lab.id,source:lab.source,actions:[],probes:[],startedAt:new Date().toISOString()};
    try{
      if(!await page.locator('.training-center').isVisible())await b('Training Center 1–8').click();
      await page.locator('.training-class').filter({hasText:`CLASS ${lab.classId}`}).click();
      const siblings=ALL_LABS.filter(x=>x.classId===lab.classId);
      await page.locator('.training-lab-nav > button').filter({has:page.locator('small')}).nth(siblings.findIndex(x=>x.id===lab.id)).click();
      const start=b('실습 환경 시작');if(await start.isVisible())await start.click();else await b('환경 계속하기').click();
      await b('이 실습 초기화').click();await page.getByRole('dialog').getByRole('button',{name:'실습 초기화',exact:true}).click();
      await tab('요청 / 검증');await b('기준 요청 실행').click();record.before=(await state(lab.id)).baseline.codes;
      await tab('환경 / 설정');const x=lab.exercise;
      if(['scan','scan-compare'].includes(x)){await toggle('Scan Profile Configured');await b('Run Scan').click();record.preScan=(await state(lab.id)).environment.runtime.scan.findings;}
      if(['private','edge','analytics','waf','assistant','pipeline','scan','scan-compare','bot-baseline','advanced'].includes(x)){
        await toggle('Attach Application Firewall');await select('WAF Enforcement Mode','Blocking');record.actions.push('Attach WAF / Blocking');
      }
      if(x==='edge')await select('VIP Advertisement','Custom');
      if(x==='header')await select('Policy Mode','Header allowlist');
      if(x==='negative'){await select('Policy Mode','Negative enforcement');await toggle('Block TOR / Spam reputation');}
      if(x==='positive')await select('Policy Mode','Positive enforcement');
      if(x==='zero-day')await select('Policy Mode','Exploit deny');
      if(x==='route'){await toggle('Enable Canary Route');await toggle('Rewrite /login to /');await toggle('Add XC-Namespace Response Header');await toggle('Attach WAF to /login Route');await select('WAF Enforcement Mode','Blocking');}
      if(x==='inventory')await toggle('Inventory Fall-through Deny');
      if(x==='endpoint'){await toggle('Enable API Protection on LB');await toggle('Endpoint Deny Rule');}
      if(x==='discovery'){await toggle('API Discovery / LB');await toggle('BIG-IP Connector (synthetic telemetry)');}
      if(x==='advanced')await toggle('API Discovery / LB');
      if(['rate','zero-day'].includes(x)){await toggle('Enable Rate Limiting');await page.getByRole('spinbutton',{name:'Number of Requests',exact:true}).fill('3');await page.getByRole('spinbutton',{name:'Period (seconds)',exact:true}).fill('60');}
      if(['bot','bot-flag','human-bot','bot-block','scan','scan-compare','advanced'].includes(x)){
        await toggle('Enable Bot Defense on LB');await select('Bot Mitigation Mode',['bot-flag','human-bot'].includes(x)?'Flag':'Blocking');
        if(x==='human-bot')await toggle('Client Telemetry (synthetic)');
        if(x==='bot-block'){await fill('Protected Endpoint','/flight');await select('Protected Method','GET');}
        if(['advanced','scan-compare'].includes(x))await fill('Protected Endpoint','/login');
        if(x==='advanced')await fill('Contact Protected Endpoint','/contact');
      }
      if(x==='malicious'){await toggle('Malicious User Detection');await toggle('Temporary Block Mitigation');}
      if(x==='segments'){await toggle('Attach DC Segment');await toggle('Attach AWS Segment');await toggle('HTTP Allow / SSH Deny Firewall');}
      if(x==='overlap'){await toggle('Azure CE VIP for Overlapping IPs');await toggle('HTTP Allow / SSH Deny Firewall');await select('Policy Mode','GET only');}
      if(x==='failover')await toggle('AWS Priority / Azure Fallback');
      if(lab.classId===7){await b('Build').click();await b('Test').click();if(x!=='code')await b('Deploy').click();}
      if(['scan','scan-compare'].includes(x)){await b('Run Scan').click();record.postScan=(await state(lab.id)).environment.runtime.scan.findings;}
      const probe=async(q,expected)=>{await execute(q);const run=(await state(lab.id)).environment.runtime.logs[0];record.probes.push(run);if(run.code!==expected)throw Error(`Expected ${expected}, got ${run.code}: ${run.reason}`);return run;};
      if(['private','edge','analytics','waf','assistant','pipeline'].includes(x)){await probe({},200);await probe({attack:'SQL Injection'},403);await probe({attack:'XSS'},403);}
      else if(x==='header'){await probe({},403);await probe({headers:{'x-f5-appworld':'RjUtQXBwd29ybGQ='}},200);await probe({headers:{'x-f5-appworld':'wrong'}},403);}
      else if(x==='route'){await probe({},200);const green=await probe({headers:{'X-App-Version':'green'}},200);if(green.origin!=='azure-canary')throw Error('Canary origin mismatch');await probe({path:'/login',attack:'SQL Injection'},403);}
      else if(x==='inventory'){await probe({path:'/api/customerlookup/getbyheroname'},403);await probe({path:'/api/customerlookup/getbyname'},200);}
      else if(x==='endpoint'){await probe({path:'/api/customerlookup/getbydob'},403);await probe({path:'/api/customerlookup/getbyname'},200);}
      else if(['rate','zero-day'].includes(x)){await tab('요청 / 검증');await b('요청 카운터 초기화').click();await probe({path:x==='rate'?'/api/customerlookup/getbyname':'/ratelimit.php',repeat:4},429);await probe({path:'/health'},200);}
      else if(['bot','bot-flag','human-bot','bot-block','bot-baseline','advanced'].includes(x)){
        await tab('요청 / 검증');await b('요청 카운터 초기화').click();
        const path=x==='bot-block'?'/flight':x==='advanced'?'/login':'/user/vipsignin',method=x==='bot-block'?'GET':'POST';
        await probe({path,method,attack:x==='human-bot'?'Human-like bot':'Bot',repeat:x==='human-bot'?12:1},['human-bot','bot-flag','bot-baseline'].includes(x)?200:403);
        await probe({path,method,identity:'audit-normal'},200);
      }
      else if(x==='malicious'){await tab('요청 / 검증');await b('요청 카운터 초기화').click();await probe({attack:'Malicious user',identity:'audit-bad',repeat:3},403);await probe({identity:'audit-good'},200);}
      else if(x==='segments'||x==='overlap'){await probe({},200);await probe({transport:'SSH'},403);if(x==='overlap'){await probe({method:'HEAD'},403);await probe({headers:{host:'10.1.1.5'}},404);await probe({headers:{host:lab.id+'.example.com'}},200);}}
      else if(x==='failover'){
        await probe({},200);await tab('환경 / 설정');await toggle('AWS Origin Healthy',false);const fallback=await probe({},200);if(fallback.origin!=='azure-canary')throw Error('Failover mismatch');await tab('환경 / 설정');await toggle('Azure Origin Healthy',false);await probe({},503);await tab('환경 / 설정');await toggle('AWS Origin Healthy');await toggle('Azure Origin Healthy');await probe({},200);
      }else await probe({},200);
      if(['assistant','analytics'].includes(x)){await tab('로그 / 보고서');await b('Explain (local)').click();}
      if(x==='discovery'||x==='advanced')await probe({path:x==='discovery'?'/qrcode/form':'/api/shadow/contact'},200);
      await tab('요청 / 검증');await b('현재 설정 검증').click();
      let session=await state(lab.id);record.checks=session.verification.checks;record.pass=record.checks.every(c=>c.pass);
      await tab('로그 / 보고서');await page.locator('.training-log-table tbody tr').first().getByRole('button',{name:'JSON',exact:true}).click();
      record.logVisible=(await page.locator('.training-log-table tbody tr').first().innerText()).includes('external_requests=0');
      const dl=page.waitForEvent('download');await b('증거 JSON').click();await(await dl).saveAs(`output/verification/${lab.id}-evidence.json`);
      await page.screenshot({path:`output/verification/${lab.id}.png`});
      record.saved=JSON.stringify({baseline:session.baseline,checks:session.verification.checks,controls:session.environment.controls,logs:session.environment.runtime.logs});
      // Reload is a separate CLI command after downloads; compare all sessions in a fresh RPC.
      record.pass=record.pass&&record.logVisible;
    }catch(error){record.error=String(error);record.pass=false;await page.screenshot({path:`output/verification/${lab.id}-failure.png`});}
    results.push(record);
  }
  return results;
}
