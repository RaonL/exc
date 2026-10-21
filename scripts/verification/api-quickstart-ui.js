async page => {
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const b=name=>page.getByRole('button',{name,exact:true});
 const choose=async(label,value)=>{await page.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click();};
 const save=async()=>{await b('Save HTTP Load Balancer').click();await page.locator('.config-editor').waitFor({state:'detached'});};
 const open=async()=>{await b('Manage Configuration').click();await page.locator('.xc-edit-configuration').click();await page.getByRole('navigation',{name:'Configuration sections'}).getByRole('button',{name:'API Protection',exact:true}).click();};
 await b('API Quickstarts').click();await b('실습 더미 환경 준비').click();
 await b('Add Code Base Integration').click();await page.getByLabel('Name',{exact:true}).fill('shop-code');await page.getByLabel('Username (dummy)').fill('demo-user');
 await b('Configure API Key').click();await page.getByLabel('Secret (dummy only)').fill('demo-only');await b('Apply').last().click();await b('Save and Exit').click();
 await b('Add OpenAPI File').click();await page.getByLabel('Name',{exact:true}).fill('shop-openapi');await page.getByLabel('Upload File',{exact:true}).setInputFiles('public/fixtures/shop-openapi.json');await b('Save and Exit').click();
 await b('Add API Definition').click();await page.getByLabel('Name',{exact:true}).fill('shop-definition');await page.getByLabel('shop-openapi',{exact:true}).check();await b('Save and Exit').click();
 await open();await choose('API Discovery','Enable');await choose('API Definition','Enable');await choose('Select API Definition','api-quickstart/shop-definition');
 await choose('Code Base Integration','api-quickstart/shop-code');
 await page.getByLabel('API Repositories (dummy organization/repository)').fill('demo-org/shop');
 await choose('API Crawling','Enable');await b('Add Crawl Domain').click();await page.getByLabel('Crawl User').fill('demo-user');await b('Configure Crawl Password').click();await page.getByLabel('Secret (dummy only)').fill('demo-only');await b('Apply').last().click();await b('Apply').last().click();await save();
 await b('Run Code Discovery (모의)').click();await b('Run API Crawling (모의)').click();
 await open();await choose('Validation','API Inventory');await b('API Inventory · Configure').click();await b('Apply').last().click();await save();
 await b('Request Lab').click();await b('Run Sample API Request').click();await page.getByRole('status').filter({hasText:'200 / Detected'}).waitFor();
 await open();await b('API Inventory · Configure').click();await choose('Request Validation Enforcement Type','Block');await b('Apply').last().click();await save();
 await b('Run Sample API Request').click();await page.getByRole('status').filter({hasText:'403 / Blocked'}).waitFor();await page.screenshot({path:'docs/screenshots/api-quickstart-block.png'});
 await page.reload();await page.getByRole('heading',{name:'API Security Quickstarts',exact:true}).waitFor();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('f5-xc-simulator-v1')).state.lbs.find(l=>l.id==='api-quickstart-lb').config.apiSecurity);
 if(saved.requestAction!=='Block'||!saved.crawling||!saved.definitionId||errors.length)throw Error(JSON.stringify({saved,errors}));
 return {pass:true,discovery:['Code','API Crawling'],requestModes:['Report 200 Detected','Block 403 Blocked'],reload:saved.requestAction,errors};
}
