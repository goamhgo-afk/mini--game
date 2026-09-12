const $=x=>document.querySelector(x);
const money=n=>Number(n||0).toLocaleString("fa-IR")+" تومان";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
let token=sessionStorage.getItem("miniAdminToken")||"";

async function api(url,options={}){
  const headers=Object.assign({},options.headers||{},token?{"X-Admin-Token":token}:{});
  const r=await fetch(url,Object.assign({},options,{headers}));
  let data={}; try{data=await r.json()}catch{}
  if(!r.ok) throw Error(data.error||"خطایی رخ داد");
  return data;
}
function showApp(){ $("#login").classList.add("hidden"); $("#app").style.display="block"; }
function showLogin(msg=""){ $("#login").classList.remove("hidden"); $("#app").style.display="none"; $("#loginErr").textContent=msg; }
function authFail(){sessionStorage.removeItem("miniAdminToken");token="";showLogin("جلسه ورود منقضی شده است؛ دوباره وارد شوید.");}

async function login(){
  const user=$("#user").value.trim(), pass=$("#pass").value;
  $("#loginErr").textContent="";
  if(!user||!pass){$("#loginErr").textContent="نام کاربری و رمز عبور را وارد کنید.";return;}
  try{
    const r=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user,pass})});
    let x={};try{x=await r.json()}catch{}
    if(!r.ok)throw Error(x.error||"نام کاربری یا رمز عبور اشتباه است");
    token=x.token;sessionStorage.setItem("miniAdminToken",token);showApp();await load();
  }catch(e){$("#loginErr").textContent=e.message||"ورود ناموفق بود.";}
}

async function load(){
  try{
    const [devices,bookings,settings]=await Promise.all([api("/api/devices"),api("/api/admin/bookings"),api("/api/settings")]);
    $("#count").textContent=devices.length.toLocaleString("fa-IR");
    $("#bc").textContent=bookings.filter(b=>b.status!=="cancelled").length.toLocaleString("fa-IR");
    $("#income").textContent=money(bookings.filter(b=>b.paymentStatus==="paid").reduce((sum,b)=>sum+Number(b.total||0),0));
    $("#name").value=settings.name||"Mini Game";
    $("#price").value=settings.defaultPrice||50000;
    $("#footballPrice").value=settings.footballPrice||20000;

    $("#devices").innerHTML=devices.map(d=>`<div class="row">
      <input id="n${d.id}" value="${esc(d.name)}">
      <input id="p${d.id}" type="number" min="1" value="${Number(d.price||50000)}">
      <select id="s${d.id}">
        <option value="available" ${d.status==="available"?"selected":""}>آزاد</option>
        <option value="busy" ${d.status==="busy"?"selected":""}>مشغول</option>
        <option value="maintenance" ${d.status==="maintenance"?"selected":""}>خراب / تعمیر</option>
      </select>
      <button onclick="edit(${d.id})">ذخیره</button>
      <button class="deleteBtn" onclick="removeDevice(${d.id})">حذف</button>
    </div>`).join("")||"<p>دستگاهی ثبت نشده است.</p>";

    const sorted=[...bookings].sort((a,b)=>Number(b.id)-Number(a.id));
    $("#bookings").innerHTML=sorted.map(b=>`<tr>
      <td>${esc(b.code)}</td><td>${esc(b.deviceName||("PS4 #"+b.deviceId))}</td>
      <td>${esc(b.customer)}<br><small>${esc(b.phone)}</small></td>
      <td>${esc(b.date)}</td><td>${esc(b.start)} - ${esc(b.end)}</td>
      <td>${b.football?`⚽ فوتبال دستی (+${money(b.footballPrice)})<br>`:""}<b>${money(b.total)}</b></td>
      <td><select onchange="st(${b.id},this.value)">
        <option value="awaiting_payment" ${b.status==="awaiting_payment"?"selected":""}>در انتظار پرداخت</option>
        <option value="confirmed" ${b.status==="confirmed"?"selected":""}>تأیید شده</option>
        <option value="cancelled" ${b.status==="cancelled"?"selected":""}>لغو شده</option>
      </select></td>
    </tr>`).join("")||`<tr><td colspan="7">هنوز رزروی ثبت نشده است.</td></tr>`;
    renderPayments(sorted);
  }catch(e){
    if(/ورود مدیر|401|جلسه/i.test(e.message||"")) authFail(); else alert(e.message||"خطا در بارگذاری پنل");
  }
}

async function edit(id){
  try{await api("/api/admin/devices/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:$("#n"+id).value,price:Number($("#p"+id).value),status:$("#s"+id).value})});await load();}
  catch(e){alert(e.message)}
}
async function removeDevice(id){
  if(!confirm("این کنسول حذف شود؟"))return;
  try{await api("/api/admin/devices/"+id,{method:"DELETE"});await load();}
  catch(e){alert(e.message)}
}
async function st(id,status){
  try{await api("/api/admin/bookings/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});await load();}
  catch(e){alert(e.message);await load()}
}
async function paymentStatus(id,status){
  try{await api("/api/admin/bookings/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentStatus:status})});await load();}
  catch(e){alert(e.message)}
}
function renderPayments(bookings){
  const list=$("#paymentList");
  if(!list)return;
  list.innerHTML=bookings.map(b=>`<div class="payment-row">
    <div><b>${esc(b.code)}</b> · ${esc(b.customer)} · ${esc(b.phone)}</div>
    <div>${money(b.total)} · <b>${b.paymentStatus==="paid"?"پرداخت شده":b.paymentStatus==="cancelled"?"لغو شده":"در انتظار پرداخت"}</b></div>
    <div><select onchange="paymentStatus(${b.id},this.value)">
      <option value="unpaid" ${(!b.paymentStatus||b.paymentStatus==="unpaid")?"selected":""}>در انتظار پرداخت</option>
      <option value="paid" ${b.paymentStatus==="paid"?"selected":""}>پرداخت شده</option>
      <option value="cancelled" ${b.paymentStatus==="cancelled"?"selected":""}>لغو شده</option>
    </select></div>
  </div>`).join("")||"<p>پرداختی ثبت نشده است.</p>";
}

$("#loginBtn").onclick=login;
$("#pass").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
$("#user").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
$("#add").onclick=async()=>{
  const n=prompt("نام دستگاه","PS4 جدید");if(!n)return;
  try{await api("/api/admin/devices",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n,price:50000,status:"available"})});await load();}
  catch(e){alert(e.message)}
};
$("#save").onclick=async()=>{
  try{await api("/api/admin/settings",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:$("#name").value,defaultPrice:Number($("#price").value),footballPrice:Number($("#footballPrice").value)})});alert("تنظیمات با موفقیت ذخیره شد.");await load();}
  catch(e){alert(e.message)}
};
$("#adminTheme").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("mini-admin-theme",document.body.classList.contains("light")?"light":"dark")};
if(localStorage.getItem("mini-admin-theme")==="light")document.body.classList.add("light");

(async()=>{
  if(!token){showLogin();return;}
  try{await api("/api/admin/bookings");showApp();await load();}
  catch(e){authFail();}
})();
