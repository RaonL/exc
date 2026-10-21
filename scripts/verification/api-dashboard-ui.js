async page => {
 const b=n=>page.getByRole('button',{name:n,exact:true});await page.goto('http://127.0.0.1:5173/');await page.setViewportSize({width:1793,height:1100});
 if(await b('실습·모의 요청으로 이동').isVisible())await b('실습·모의 요청으로 이동').click();
 await b('Request Lab').click();await b('민감정보·인증 예제').click();await b('Run Sample API Request').click();
 await page.getByRole('status').filter({hasText:'200 / Allowed'}).waitFor();
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 await nav.getByRole('button',{name:'API Endpoints',exact:true}).click();
 const dash=page.getByRole('region',{name:'API Endpoints 대시보드'});
 const chart=page.getByRole('img',{name:/Total API Calls/});await chart.waitFor();
 const before=await chart.getAttribute('aria-label');
 await page.getByRole('checkbox',{name:'⚙ Last Tested',exact:true}).check();
 await page.getByRole('row').filter({hasText:'/api/profile'}).filter({hasText:'Authenticated'}).filter({hasText:'Email'}).waitFor();
 await page.screenshot({path:'docs/screenshots/api-dashboard-table.png'});
 await b('Graph').click();await page.getByLabel('API endpoint relationship graph').waitFor();await page.screenshot({path:'docs/screenshots/api-dashboard-graph.png'});await b('Table').click();
 await page.getByLabel('Search API endpoints',{exact:true}).fill('/api/profile');
 const row=page.getByRole('row').filter({hasText:'/api/profile'});await row.locator('summary').click();await row.getByRole('button',{name:'Archive',exact:true}).click();
 await b('Archived').click();await page.getByRole('row').filter({hasText:'/api/profile'}).waitFor();
 await page.reload();await b('Archived').click();await page.getByLabel('Search API endpoints',{exact:true}).fill('/api/profile');
 const archived=page.getByRole('row').filter({hasText:'/api/profile'});await archived.locator('summary').click();await archived.getByRole('button',{name:'Restore',exact:true}).click();
 await b('Current').click();await b('Clear Filters').click();
 const download=page.waitForEvent('download');await b('Download API Spec').click();const specName=(await download).suggestedFilename();
 const csv=page.waitForEvent('download');await b('Download CSV').click();const csvName=(await csv).suggestedFilename();
 await b('Update Schema').click();await page.getByRole('navigation',{name:'Configuration sections'}).getByRole('button',{name:'OpenAPI Upload',exact:true}).click();await page.getByRole('textbox',{name:'OpenAPI JSON',exact:true}).waitFor();await b('Cancel and Exit').click();
 await page.getByRole('button',{name:'/api/admin',exact:true}).click();await page.getByRole('heading',{name:'Security Posture',exact:true}).waitFor();await b('Close Endpoint Details').click();
 await page.getByLabel('Dashboard time range',{exact:true}).selectOption('1');
 const rangeLabel=await chart.getAttribute('aria-label');await page.getByLabel('Dashboard time range',{exact:true}).selectOption('All time');
 await page.setViewportSize({width:390,height:844});const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);await page.screenshot({path:'docs/screenshots/api-dashboard-mobile.png'});
 await page.setViewportSize({width:1793,height:1100});
 if(overflow)throw Error('Mobile overflow');
 return {calls:before,filteredCalls:rangeLabel,sensitiveAuthLinked:true,archiveReloadRestore:true,downloads:[specName,csvName],schemaEditor:true,posture:true,mobileOverflow:overflow};
}


