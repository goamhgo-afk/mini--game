const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const ADMIN_USER="admin",ADMIN_PASS="MiniGame1389",SESSIONS=new Set();
const PORT=3000,ROOT=__dirname,PUBLIC=path.join(ROOT,"public"),DB=path.join(ROOT,"data/db.json");
const load=()=>JSON.parse(fs.readFileSync(DB,"utf8")),save=x=>fs.writeFileSync(DB,JSON.stringify(x,null,2),"utf8");
const send=(r,s,x,t="application/json; charset=utf-8")=>{r.writeHead(s,{"Content-Type":t});r.end(t.startsWith("application/json")?JSON.stringify(x):x)};
const body=req=>new Promise((ok,no)=>{let s="";req.on("data",x=>s+=x);req.on("end",()=>{try{ok(s?JSON.parse(s):{})}catch(e){no(e)}})});
const uid=a=>a.reduce((m,x)=>Math.max(m,x.id||0),0)+1;
function conflict(db,d,date,start,end,ignore){
 const toMin=t=>{const [h,m]=t.split(":").map(Number);return h*60+m};
 const a=toMin(start), z=toMin(end);
 return db.bookings.some(b=>b.deviceId==d&&b.date===date&&b.status!=="cancelled"&&b.id!=ignore&&a<toMin(b.end)&&z>toMin(b.start));
}
const server=http.createServer(async(req,res)=>{
try{
 const u=new URL(req.url,"http://localhost"),p=u.pathname,db=load();
 if(req.method==="POST"&&p==="/api/admin/login"){
  const x=await body(req);
  if(x.user!==ADMIN_USER||x.pass!==ADMIN_PASS)return send(res,401,{error:"نام کاربری یا رمز عبور اشتباه است"});
  const token=crypto.randomBytes(24).toString("hex");SESSIONS.add(token);return send(res,200,{token});
 }
 const adminOK=SESSIONS.has(req.headers["x-admin-token"]||"");
 if(p.startsWith("/api/admin")&&!adminOK)return send(res,401,{error:"ورود مدیر لازم است"});
 if(req.method==="GET"&&p==="/api/settings")return send(res,200,db.settings);
 if(req.method==="GET"&&p==="/api/devices")return send(res,200,db.devices);
 if(req.method==="GET"&&p==="/api/bookings")return send(res,200,db.bookings);
 if(req.method==="POST"&&p==="/api/bookings"){
  const x=await body(req),d=db.devices.find(a=>a.id==x.deviceId);if(!d)return send(res,400,{error:"دستگاه پیدا نشد"});
  let dur=+x.duration,[h,m]=x.start.split(":").map(Number),tm=h*60+m+dur*60;if(tm>1440)return send(res,400,{error:"زمان رزرو نامعتبر است"});
  let end=String(Math.floor(tm/60)).padStart(2,"0")+":"+String(tm%60).padStart(2,"0");if(conflict(db,d.id,x.date,x.start,end))return send(res,409,{error:"این دستگاه در این زمان رزرو شده است"});
// GLOBAL_FOOTBALL_CONFLICT: football is a shared resource.
// If football is booked during an overlapping time, no other PS4 can book football.
// A football reservation therefore blocks football for every console at that time.
const footballRequested=!!x.football;
const overlap=(a,b)=>a.date===b.date && Math.max(a.start,b.start)<Math.min(a.end,b.end);
const overlappingFootball=db.bookings.some(b=>b.status!=="cancelled" && b.football && overlap({date:x.date,start:x.start,end},b));
if(overlappingFootball){
  return send(res,409,{error:"این ساعت فوتبال دستی قبلاً رزرو شده است و در این زمان امکان رزرو کنسول وجود ندارد."});
}

  let b={id:uid(db.bookings),code:"MG-"+crypto.randomBytes(3).toString("hex").toUpperCase(),deviceId:d.id,deviceName:d.name,date:x.date,start:x.start,end,duration:dur,customer:String(x.customer),phone:String(x.phone||""),total:dur*d.price+(x.football?(+db.settings.footballPrice||20000):0),football:!!x.football,footballPrice:x.football?(+db.settings.footballPrice||20000):0,status:"awaiting_payment",paymentStatus:"unpaid",createdAt:new Date().toISOString()};db.bookings.push(b);save(db);return send(res,201,b)
 }
 if(req.method==="POST"&&p==="/api/admin/devices"){let x=await body(req);let d={id:uid(db.devices),name:x.name,price:+x.price||db.settings.defaultPrice,status:x.status||"available"};db.devices.push(d);save(db);return send(res,201,d)}
 let m=p.match(/^\/api\/admin\/devices\/(\d+)$/);if(m&&req.method==="PUT"){let d=db.devices.find(x=>x.id==m[1]);if(!d)return send(res,404,{error:"دستگاه پیدا نشد"});let x=await body(req);Object.assign(d,{name:x.name||d.name,price:+x.price||d.price,status:x.status||d.status});save(db);return send(res,200,d)}
 if(m&&req.method==="DELETE"){let n=+m[1];if(db.bookings.some(b=>b.deviceId===n&&b.status!=="cancelled"))return send(res,409,{error:"این دستگاه رزرو فعال دارد"});db.devices=db.devices.filter(d=>d.id!==n);save(db);return send(res,200,{ok:true})}
 if(req.method==="PUT"&&p==="/api/admin/settings"){let x=await body(req);db.settings.name=x.name||db.settings.name;db.settings.defaultPrice=+x.defaultPrice||db.settings.defaultPrice;db.settings.footballPrice=+x.footballPrice||db.settings.footballPrice||20000;save(db);return send(res,200,db.settings)}
 m=p.match(/^\/api\/admin\/bookings\/(\d+)$/);if(m&&req.method==="PUT"){let b=db.bookings.find(x=>x.id==m[1]);let x=await body(req);if(!b)return send(res,404,{error:"رزرو پیدا نشد"});b.status=x.status;save(db);return send(res,200,b)}
 let file=p==="/"?"index.html":p.slice(1),fp=path.join(PUBLIC,file);if(!fp.startsWith(PUBLIC)||!fs.existsSync(fp))return send(res,404,{error:"Not found"});let ext=path.extname(fp),type={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8"}[ext]||"application/octet-stream";send(res,200,fs.readFileSync(fp),type)
}catch(e){console.error(e);send(res,500,{error:"خطای داخلی سرور"})}});
server.listen(PORT,()=>console.log("Mini Game: http://localhost:"+PORT));