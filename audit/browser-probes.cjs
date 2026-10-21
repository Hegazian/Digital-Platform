// Production frontend behavior probes with intercepted, deterministic API
// fixtures. These do not establish real API/database end-to-end correctness.
const fs = require('node:fs');
const { chromium } = require('../client/node_modules/playwright');
const baseURL = 'http://127.0.0.1:3107';
const results = [];
const config = {siteNameEn:'Audit Platform',siteNameAr:'منصة الاختبار',allowTeacherRegistration:true,enableCodePlaygrounds:true,enableCollaborativeBoards:true,primaryColor:'#4f46e5'};
const course = {id:'audit-course',titleEn:'Audit Course',titleAr:'دورة الاختبار',teacherId:'teacher-owner',subjectId:'subject',isFree:false,priceEgp:150,
  modules:[{id:'module',titleEn:'Module tree',lessons:[{id:'module-lesson',titleEn:'Module lesson',content:'AUDIT_TEXT_BODY_MARKER',materials:[],blocks:[{id:'real-board-block',blockType:'BOARD',configurationJson:'{}'},{id:'text-block',blockType:'TEXT',configurationJson:'{"html":"AUDIT_TEXT_BLOCK_MARKER"}'}]}]}],
  sections:[{id:'section',titleEn:'Section tree',isFreePreview:true,lessons:[{id:'section-lesson',titleEn:'Section-only lesson',materials:[],blocks:[]}]}]};
async function setup(browser,{ar=false,role='ADMIN',track=null}={}) {
  const context = await browser.newContext();
  const calls=[];
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==baseURL) return route.abort();
    if(!url.pathname.startsWith('/api/v1/')) return route.continue();
    const endpoint=url.pathname.replace('/api/v1','');calls.push(endpoint);
    let data={},status=200;
    if(endpoint==='/config') data=config;
    else if(endpoint==='/courses/audit-course') data=course;
    else if(endpoint==='/courses') data={courses:[],pagination:{total:0}};
    else if(endpoint==='/subjects') data=[];
    else if(endpoint.startsWith('/progress/course')) data={completedLessonIds:[],totalLessons:2};
    else if(endpoint.startsWith('/commerce/entitlements')) data={hasAccess:false};
    else if(endpoint==='/careers') data=[];
    else if(endpoint==='/career-tracks'||endpoint.startsWith('/boards/')) status=404;
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status===200,data,message:status===404?'Fixture: endpoint unavailable':undefined})});
  });
  await context.addInitScript(({ar,role,track})=>{
    const user=role?{id:'audit-browser-user',name:'Audit User',email:'audit@example.invalid',role}:null;
    localStorage.setItem('eduplatform-storage',JSON.stringify({version:0,state:{lang:ar?'ar':'en',dir:ar?'rtl':'ltr',user,token:role?'audit-token':null,careerTrackSlug:track,selectedCourseId:null,activeTab:'home'}}));
    if(role)localStorage.setItem('accessToken','audit-token');
  },{ar,role,track});
  return {context,page:await context.newPage(),calls};
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    {
      const {context,page,calls}=await setup(browser,{ar:true,track:'engineering'});
      await page.goto(`${baseURL}/courses`);
      await page.waitForFunction(()=>document.querySelector('div[dir="rtl"]'));
      await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>e.name.includes('/career-tracks')));
      results.push({id:'B01',description:'Persisted Arabic language does not restore root HTML lang/dir',observed:await page.evaluate(()=>({htmlLang:document.documentElement.lang,htmlDir:document.documentElement.getAttribute('dir'),appRtl:!!document.querySelector('div[dir="rtl"]')}))});
      results.push({id:'B02',description:'Career catalog calls an unsupported API path',observed:{careerRequests:calls.filter(p=>p.includes('career'))}});
      await context.close();
    }
    {
      const {context,page,calls}=await setup(browser);
      await page.goto(`${baseURL}/courses/audit-course`);
      await page.getByText('Module lesson',{exact:true}).first().waitFor();
      const text=await page.locator('body').innerText();
      results.push({id:'B03',description:'A mixed curriculum hides all section lessons',observed:{moduleLessonVisible:text.includes('Module lesson'),sectionLessonVisible:text.includes('Section-only lesson')}});
      results.push({id:'B04',description:'Lesson body and typed text block are not rendered',observed:{bodyTextVisible:text.includes('AUDIT_TEXT_BODY_MARKER'),blockTextVisible:text.includes('AUDIT_TEXT_BLOCK_MARKER')}});
      await page.getByRole('button',{name:'Whiteboard',exact:true}).click();
      await page.getByRole('button',{name:'Save Board'}).waitFor();
      await page.waitForFunction(()=>document.querySelector('canvas'));
      await page.waitForFunction(()=>performance.getEntriesByType('resource').some(e=>e.name.includes('/boards/')));
      results.push({id:'B05',description:'Player whiteboard uses demo ID instead of real lesson block ID',observed:{boardRequests:calls.filter(p=>p.includes('/boards/'))}});
      await context.close();
    }
    {
      const {context,page}=await setup(browser,{role:null});
      await page.goto(`${baseURL}/courses/audit-course`);
      await page.getByText('Log in to Enroll',{exact:true}).waitFor();
      results.push({id:'B06',description:'Course paywall hides a free-preview section from a guest',observed:{paywallVisible:true,previewLessonVisible:await page.getByText('Section-only lesson',{exact:true}).count()>0}});
      await context.close();
    }
    fs.writeFileSync('audit/browser-probe-results.json',JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);fs.writeFileSync('audit/browser-probe-results.json',JSON.stringify({completed:results,error:error.message},null,2));process.exitCode=1;});
