const puppeteer = require('puppeteer');
const dotenv=require('dotenv');
const db=require('./models');
dotenv.config();

const crawler = async () => {
await db.sequelize.sync();

  try {
    const browser = await puppeteer.launch({ headless: false,args:['--window-size=1920,1080'] });
    const page = await browser.newPage();
    await page.setViewport({
      width:1080,
      height:1080,
    });
 await page.goto('http://spys.one/free-proxy-list/KR/');

const proxies=await page.evaluate(()=>{
    const ips=Array.from(document.querySelectorAll('tr > td:first-of-type > .spy14')).slice(5).map((v)=>v.textContent.replace(/document\.write\(.+\)/,''));
    const latencies=Array.from(document.querySelectorAll('tr > td:nth-of-type(6) .spy1')).slice(5).map((v)=>v.textContent);
    const types=Array.from(document.querySelectorAll('tr > td:nth-of-type(2)')).slice(5).map((v)=>v.textContent);
    return ips.map((v,i)=>{
        return {
            ip:v,
            type:types[i],
            latency:latencies[i],
        }
    });
});
const filtered=proxies.filter((v)=>v.type.startsWith('HTTP')).sort((p,c)=> p.latency-c.latency);
await Promise.all(filtered.map(async (v)=>{
    return db.Proxy.create({
        ip: v.ip,
        type: v.type,
        latency:v.latency,
    });
}));
await page.close();
await browser.close();
const fastestProxy= await db.Proxy.findOne({
    order:[['latency','ASC']],
})
browser = await puppeteer.launch({
     headless: false,
     args:[`--window-size=1920,1080`,`--disable-notifications`,`--proxy-server=${fastestProxy.ip}`],
 });
 page=await browser.newPage();
 await page.goto('https://search.naver.com/search.naver?sm=top_sug.pre&fbm=1&acr=1&acq=%EB%82%B4+&qdt=0&ie=utf8&query=%EB%82%B4+%EC%95%84%EC%9D%B4%ED%94%BC+%EC%A3%BC%EC%86%8C+%ED%99%95%EC%9D%B8');
 await page.waitFor(10000);
 await page.close();
 await browser.close();
 await db.sequelize.close();
}catch(e){
      console.error(e);
  }
}
crawler();
