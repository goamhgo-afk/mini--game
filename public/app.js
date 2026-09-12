const $=x=>document.querySelector(x),money=n=>Number(n).toLocaleString("fa-IR")+" تومان";
let devices=[],bookings=[],settings={footballPrice:20000,openHoursByDay:{}};
async function api(u,o){let r=await fetch(u,o),x=await r.json();if(!r.ok)throw Error(x.error||"خطا");return x}

const pMonthNames=["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
function div(a,b){return Math.floor(a/b)}
function g2j(gy,gm,gd){
 const gdm=[31,28,31,30,31,30,31,31,30,31,30,31];
 gy-=1600; gm-=1; gd-=1;
 let day=365*gy+div(gy+3,4)-div(gy+99,100)+div(gy+399,400);
 for(let i=0;i<gm;i++)day+=gdm[i];
 if(gm>1&&((gy+1600)%4===0&&((gy+1600)%100!==0||(gy+1600)%400===0)))day++;
 day+=gd;
 let jday=day-79, jnp=div(jday,12053); jday%=12053;
 let jy=979+33*jnp+4*div(jday,1461); jday%=1461;
 if(jday>=366){jy+=div(jday-1,365);jday=(jday-1)%365}
 let jm=jday<186?1+div(jday,31):7+div(jday-186,30);
 let jd=1+(jday<186?jday%31:(jday-186)%30);
 return [jy,jm,jd]
}
function j2g(jy,jm,jd){
 jy-=979;
 let jday=365*jy+div(jy,33)*8+div((jy%33)+3,4);
 for(let i=1;i<jm;i++)jday+=i<=6?31:30;
 jday+=jd-1;
 let gday=jday+79, gy=1600+400*div(gday,146097); gday%=146097;
 let leap=false;
 if(gday>=36525){gday--;gy+=100*div(gday,36524);gday%=36524;if(gday>=365)gday++}
 gy+=4*div(gday,1461);gday%=1461;
 if(gday>=366){leap=false;gday--;gy+=div(gday,365);gday%=365}else leap=true;
 const gdm=[31,(gy%4===0&& (gy%100!==0||gy%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];
 let gm=0;while(gday>=gdm[gm])gday-=gdm[gm++];
 return [gy,gm+1,gday+1]
}
function daysInJMonth(y,m){if(m<=6)return 31;if(m<=11)return 30;return isJLeap(y)?30:29}
function isJLeap(y){return j2g(y,12,30)[1]===12}
function syncDate(){
 let [gy,gm,gd]=j2g(+$("#jy").value,+$("#jm").value,+$("#jd").value);
 $("#date").value=`${gy}-${String(gm).padStart(2,"0")}-${String(gd).padStart(2,"0")}`;
 updateDays(); render(); updateTotal();
}
function updateDays(){
 let y=+$("#jy").value,m=+$("#jm").value,max=daysInJMonth(y,m),cur=Math.min(+$("select#jd").value||1,max);
 $("#jd").innerHTML=Array.from({length:max},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join("");
 $("#jd").value=cur;
 let [gy,gm,gd]=j2g(y,m,cur);$("#date").value=`${gy}-${String(gm).padStart(2,"0")}-${String(gd).padStart(2,"0")}`;
}
function initDate(){
 let now=new Date(),[jy,jm,jd]=g2j(now.getFullYear(),now.getMonth()+1,now.getDate());
 $("#jy").innerHTML="";$("#jm").innerHTML="";$("#jd").innerHTML="";
 for(let y=1404;y<=1410;y++)$("#jy").insertAdjacentHTML("beforeend",`<option value="${y}">${y}</option>`);
 for(let m=1;m<=12;m++)$("#jm").insertAdjacentHTML("beforeend",`<option value="${m}">${m}</option>`);
 for(let d=1;d<=31;d++)$("#jd").insertAdjacentHTML("beforeend",`<option value="${d}">${d}</option>`);
 $("#jy").value=jy;$("#jm").value=jm;$("#jd").value=jd;updateDays();syncDate();
}
function toMin(t){let [h,m]=t.split(":").map(Number);return h*60+m}
function freeAt(d){
 const date=$("#date").value,start=$("#start").value,dur=+$("#duration").value;
 if(!start)return true;
 let end=toMin(start)+dur*60;
 const overlap=(b)=>b.status!=="cancelled"&&b.date===date&&toMin(start)<toMin(b.end)&&end>toMin(b.start);
 if(bookings.some(b=>b.football&&overlap(b)))return false;
 return !bookings.some(b=>b.deviceId==d.id&&overlap(b));
}
function getWeekday(){
 const d=new Date((String($("#date").value||"")+"T12:00:00"));
 return Number.isNaN(d.getTime())?null:d.getDay();
}
function getTodayHours(){
 const day=getWeekday();
 if(day===null)return [];
 return Array.isArray(settings.openHoursByDay?.[day])?settings.openHoursByDay[day]:[];
}
function isOpenForStart(start,dur){
 const mins=toMin(start),end=mins+(+dur||1)*60;
 return getTodayHours().some(w=>{const [a,z]=String(w).split("-");if(!a||!z)return false;return mins>=toMin(a)&&end<=toMin(z)});
}
function renderTimeOptions(){
 const el=$("#start");if(!el)return;const old=el.value;const dur=+$("#duration").value||1;const hours=getTodayHours();el.innerHTML="";
 for(let h=0;h<24;h++)for(let m of [0,30]){let v=`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;if(isOpenForStart(v,dur))el.insertAdjacentHTML("beforeend",`<option value="${v}">${v}</option>`)}
 if([...el.options].some(o=>o.value===old))el.value=old;
 if(!el.options.length){el.disabled=true;el.insertAdjacentHTML("beforeend",`<option value="">${hours.length?"برای این مدت، ساعت آزادی وجود ندارد":"این روز تعطیل است و رزروی باز نیست"}</option>`)}else el.disabled=false;
}
function render(){
 $("#grid").innerHTML=devices.map(d=>{let free=freeAt(d);return `<div class="card"><div class="icon">🎮</div><h3>${d.name}</h3><p class="${free?"green":"red"}">● ${free?"آزاد":"این ساعت رزرو شده"}</p><strong>${money(d.price)} / ساعت</strong></div>`}).join("");
 const old=$("#device").value;
 $("#device").innerHTML=devices.map(d=>`<option value="${d.id}" ${freeAt(d)?"":"disabled"}>${d.name} — ${freeAt(d)?"آزاد":"رزرو شده"} — ${money(d.price)}</option>`).join("");
 if([...$("#device").options].some(o=>o.value===old&&!o.disabled))$("#device").value=old;
 else {let f=[...$("#device").options].find(o=>!o.disabled);if(f)$("#device").value=f.value}
}
function updateTotal(){let d=devices.find(x=>x.id==$("#device").value);let base=(d?.price||50000)*+$("#duration").value;let extra=$("#football")?.checked?(+settings.footballPrice||20000):0;$("#total").textContent=money(base+extra)}
async function load(){[devices,bookings,settings]=await Promise.all([api("/api/devices"),api("/api/bookings"),api("/api/settings")]);renderTimeOptions();render();updateTotal();updateFootballText()}
["jy","jm","jd","start","duration"].forEach(x=>$("#"+x).onchange=()=>{if(x==="jy"||x==="jm"||x==="jd")syncDate();else{if(x==="duration")renderTimeOptions();render();updateTotal();updateFootballText()}});
$("#device").onchange=updateTotal;
function initTime24(){renderTimeOptions()}
function footballBlockedForTime(){let start=$("#start")?.value||"";let dur=+$("#duration").value||1;if(!start)return false;let [hh,mm]=start.split(":").map(Number);let mins=hh*60+mm;let end=mins+dur*60;return bookings.some(b=>b.status!=="cancelled"&&b.football&&b.date===$("#date").value&&Math.max(mins,hm(b.start))<Math.min(end,hm(b.end)))}
function hm(t){let p=String(t).split(":").map(Number);return (p[0]||0)*60+(p[1]||0)}
function updateFootballText(){let blocked=footballBlockedForTime();if($("#football")){if(blocked){$("#football").checked=false;$("#football").disabled=true}else $("#football").disabled=false}if($("#footballPriceText"))$("#footballPriceText").textContent=blocked?" (این ساعت رزرو شده است)":` (+${money(settings.footballPrice||20000)})`;updateTotal()} $("#football").onchange=updateFootballText;
function normalizeDigits(v){return String(v).replace(/[۰-۹]/g,d=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));}
$("#phone").addEventListener("input",()=>{$("#phone").value=normalizeDigits($("#phone").value).replace(/\D/g,"").slice(0,11)});
$("#cancelPhone").addEventListener("input",()=>{$("#cancelPhone").value=normalizeDigits($("#cancelPhone").value).replace(/\D/g,"").slice(0,11)});
$("#form").onsubmit=async e=>{e.preventDefault();
 if(!$("#customer").value.trim())return $("#result").innerHTML='<div class="error">لطفاً نام را وارد کنید.</div>';
 if(!/^09\d{9}$/.test($("#phone").value.trim()))return $("#result").innerHTML='<div class="error">شماره تماس باید ۱۱ رقمی و با 09 شروع شود.</div>';
 if(!$("#start").value || !isOpenForStart($("#start").value,+$("#duration").value))return $("#result").innerHTML='<div class="error">این ساعت خارج از زمان کاری گیم‌نت است.</div>';
 let d=devices.find(x=>x.id==$("#device").value);if(!d||!freeAt(d))return $("#result").innerHTML='<div class="error">این دستگاه در این ساعت آزاد نیست؛ یک دستگاه یا ساعت دیگر انتخاب کنید.</div>';
 try{let b=await api("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({deviceId:+$("#device").value,date:$("#date").value,start:$("#start").value,duration:+$("#duration").value,customer:$("#customer").value.trim(),phone:normalizeDigits($("#phone").value.trim()),football:!!$("#football").checked})});
 $("#result").innerHTML=`<div class="success">رزرو با موفقیت ثبت شد 🎉<br>کد رزرو: <b>${b.code}</b><br>${b.deviceName} · ${$("#jy").value}/${$("#jm").value}/${$("#jd").value} · ${b.start} تا ${b.end}<br>${money(b.total)}</div>`;await load()
 }catch(e){$("#result").innerHTML=`<div class="error">${e.message}</div>`}};
$("#theme").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("mini-theme",document.body.classList.contains("light")?"light":"dark")};
if(localStorage.getItem("mini-theme")==="light")document.body.classList.add("light");
initTime24();initDate();load();
$("#cancelForm")?.addEventListener("submit",async e=>{e.preventDefault();let code=$("#cancelCode").value.trim(),phone=normalizeDigits($("#cancelPhone").value.trim());if(!code)return $("#cancelResult").innerHTML='<div class="error">لطفاً کد رزرو را وارد کنید.</div>';if(!/^09\d{9}$/.test(phone))return $("#cancelResult").innerHTML='<div class="error">شماره تماس باید ۱۱ رقمی و با 09 شروع شود.</div>';try{await api("/api/bookings/cancel",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,phone})});$("#cancelResult").innerHTML='<div class="success">رزرو با موفقیت لغو شد.</div>';await load()}catch(err){$("#cancelResult").innerHTML=`<div class="error">${err.message}</div>`}});
