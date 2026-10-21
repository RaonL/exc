async page => {
 const errors=[];const onError=e=>errors.push(String(e));page.on('pageerror',onError);
 const matrix=await page.evaluate(async()=>{const {selfTestAll}=await import('/src/training/store.ts');const {trainingLabs}=await import('/src/training/catalog.ts');const before=localStorage.getItem('f5-xc-training-v1');const rows=selfTestAll();return {rows,counts:Array.from({length:9},(_,i)=>({class:i+1,total:trainingLabs.filter(l=>l.classId===i+1).length,passed:rows.filter(r=>r.pass&&trainingLabs.find(l=>l.id===r.id)?.classId===i+1).length})),unchanged:before===localStorage.getItem('f5-xc-training-v1')};});
 if(!matrix.unchanged||matrix.rows.some(r=>!r.pass))throw Error(JSON.stringify(matrix));
 await page.getByRole('button',{name:/^Training Center/}).first().click();await page.locator('.training-center').waitFor();
 const opened=[];
 for(let c=1;c<=9;c++){
  await page.locator('.training-class').nth(c-1).click();
  const items=page.locator('.training-lab-nav > button').filter({has:page.locator('small')});const count=await items.count();
  for(let i=0;i<count;i++){await items.nth(i).click();const heading=await page.locator('.training-lab-header h2').innerText();if(!heading)throw Error('Missing lab heading');opened.push({class:c,index:i+1,heading});}
 }
 await page.screenshot({path:'docs/screenshots/api-regression-class9.png'});
 page.off('pageerror',onError);
 if(errors.length)throw Error(JSON.stringify(errors));return {pass:true,...matrix,opened,errors};
}

