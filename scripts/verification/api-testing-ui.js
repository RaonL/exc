async page => {
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const b=name=>page.getByRole('button',{name,exact:true});
 const choose=async(label,value)=>{await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click();};
 const open=async()=>{await b('Manage Configuration').click();await page.locator('.xc-edit-configuration').click();await page.getByRole('navigation',{name:'Configuration sections'}).getByRole('button',{name:'API Protection',exact:true}).click();};
 const save=async()=>{await b('Save HTTP Load Balancer').click();await page.locator('.config-editor').waitFor({state:'detached'});};
 await open();await choose('API Testing','Enable');await b('Add Testing Environment').click();await choose('Domain','shop.example.test');
 for(const [name,type,role] of [['user-one','API Key','Standard'],['user-two','Basic Authentication','Standard'],['administrator','Bearer Token','Admin'],['login-user','Login Endpoint','Standard']]){
  await b('Add Credential').click();await page.getByLabel('Credential Name').fill(name);await choose('Credential Type',type);
  if(type==='Basic Authentication')await page.getByLabel('User',{exact:true}).fill('demo-user');
  if(type==='Login Endpoint'){await page.getByLabel('Login Path').fill('/api/login');await page.getByLabel('JSON Request Payload').fill('{"user":"demo"}');await page.getByLabel('Token Response Key').fill('token');}
  await b(type==='Basic Authentication'?'Configure Password':'Configure Token / Value').click();await page.getByLabel('Secret (dummy only)').fill('demo-only');await b('Apply').last().click();await choose('Role',role);await b('Apply').last().click();
 }
 await page.screenshot({path:'docs/screenshots/api-testing-credentials.png'});
 await b('Apply').last().click();await choose('Frequency of Test','Every Day');await page.getByLabel('Custom Header',{exact:true}).fill('api-lab');await save();
 await b('Run API Testing (모의)').click();await page.getByRole('status').filter({hasText:'API Testing 모의 실행 완료'}).waitFor();
 await page.getByLabel('⚙ Last Tested',{exact:true}).check();await page.getByRole('button',{name:'/api/admin',exact:true}).click();await page.getByRole('heading',{name:'Security Posture',exact:true}).waitFor();await page.screenshot({path:'docs/screenshots/api-testing-posture.png'});await b('Close Endpoint Details').click();
 await b('모의 시계 +7일').click();await b('Logs').click();await page.screenshot({path:'docs/screenshots/api-testing-logs.png'});
 await open();await choose('Validation','Custom List');await b('Custom List · Configure').click();await b('Add Validation Rule').click();await page.getByLabel('Rule Name').fill('orders-only');await page.getByLabel('Path',{exact:true}).fill('/api/orders');await choose('Methods','POST');await choose('Action','Block');await b('Apply').last().click();
 await choose('Fall Through Mode','Custom');await b('Add Fall Through Rule').click();await page.getByLabel('Rule Name').fill('unknown-block');await page.getByLabel('Path',{exact:true}).fill('/api/unknown');await choose('Action','Block');await b('Apply').last().click();await b('Apply').last().click();await save();
 await b('Request Lab').click();await page.getByRole('combobox',{name:'Method',exact:true}).selectOption('GET');await page.getByLabel('Request Path',{exact:true}).fill('/api/unknown');await b('Run Sample API Request').click();await page.getByRole('status').filter({hasText:'403 / Blocked'}).waitFor();
 await page.getByLabel('Request Path',{exact:true}).fill('/api/else');await b('Run Sample API Request').click();await page.getByRole('status').filter({hasText:'200 / Allowed'}).waitFor();
 await page.reload();await page.getByRole('heading',{name:'API Security Quickstarts',exact:true}).waitFor();
 const data=await page.evaluate(()=>({api:JSON.parse(localStorage.getItem('f5-xc-api-security-v1')).state,core:JSON.parse(localStorage.getItem('f5-xc-simulator-v1')).state}));
 const c=data.core.lbs.find(l=>l.id==='api-quickstart-lb').config.apiSecurity;
 if(c.environments[0].credentials.length!==4||data.api.runs.length<2||c.validation!=='Custom List'||errors.length)throw Error(JSON.stringify({c,runs:data.api.runs.length,errors}));
 return {pass:true,credentials:c.environments[0].credentials.map(c=>({type:c.type,role:c.role})),runs:data.api.runs.length,schedule:c.frequency,customList:true,fallThrough:['403 Blocked','200 Allowed'],errors};
}
