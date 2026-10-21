async page => {
 const b=name=>page.getByRole('button',{name,exact:true});await page.setViewportSize({width:1793,height:1100});
 await b('Run API Testing (모의)').click();await b('Logs').click();await page.getByRole('heading',{name:'API evaluation logs / API Testing'}).scrollIntoViewIfNeeded();await page.screenshot({path:'docs/screenshots/api-testing-logs.png'});
 await b('Manage Configuration').click();await page.locator('.xc-edit-configuration').click();await page.getByRole('navigation',{name:'Configuration sections'}).getByRole('button',{name:'API Protection',exact:true}).click();
 await page.getByRole('combobox',{name:'API Definition',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'docs/screenshots/api-protection-validation.png'});
 await b('Cancel and Exit').click();
 await b('API Endpoints').click();await page.getByLabel('⚙ Last Tested',{exact:true}).check();await page.getByRole('button',{name:'/api/admin',exact:true}).click();await page.screenshot({path:'docs/screenshots/api-testing-posture.png'});await b('Close Endpoint Details').click();await page.evaluate(()=>window.scrollTo(0,0));
 return {currentRun:true,settingsSaved:true,displayed:'API Endpoints / Last Tested'};
}
