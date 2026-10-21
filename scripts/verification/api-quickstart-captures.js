async page => {
 const b=name=>page.getByRole('button',{name,exact:true});
 await page.setViewportSize({width:1793,height:1100});
 await b('공식 API Quickstarts · Discovery → Protection → Testing').click();
 await page.evaluate(()=>window.scrollTo(0,0));
 await b('③ Automate API Security Testing').click();
 await page.getByRole('navigation',{name:'Quickstart steps'}).getByRole('button').last().click();
 await page.screenshot({path:'docs/screenshots/api-quickstart-overview.png'});
 await page.getByLabel('⚙ Last Tested',{exact:true}).check();
 await page.getByRole('button',{name:'/api/admin',exact:true}).click();
 await page.screenshot({path:'docs/screenshots/api-testing-posture.png'});
 await b('Close Endpoint Details').click();
 await b('Logs').click();await page.getByRole('heading',{name:'API evaluation logs / API Testing'}).scrollIntoViewIfNeeded();
 await page.screenshot({path:'docs/screenshots/api-testing-logs.png'});
 await b('Manage Configuration').click();await page.locator('.xc-edit-configuration').click();
 await page.getByRole('navigation',{name:'Configuration sections'}).getByRole('button',{name:'API Protection',exact:true}).click();
 await page.screenshot({path:'docs/screenshots/api-protection-settings.png'});
 await b('Cancel and Exit').click();
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.screenshot({path:'docs/screenshots/api-quickstart-mobile.png'});
 await page.setViewportSize({width:1793,height:1100});
 return {mobileOverflow:overflow,desktop:[1793,1100],savedSettingsUnchanged:true};
}
