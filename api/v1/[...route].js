import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

const json = (res, status, body) => { res.statusCode = status; res.setHeader("content-type", "application/json; charset=utf-8"); res.setHeader("cache-control", "no-store"); res.end(JSON.stringify(body)); };
const readBody = async (req) => { const chunks=[]; for await (const chunk of req) chunks.push(Buffer.from(chunk)); const raw=Buffer.concat(chunks).toString("utf8"); if(raw.length>128_000) throw new Error("Request too large"); return raw ? JSON.parse(raw) : {}; };
const env = (name) => { const value=process.env[name]; if(!value) throw new Error("Server is missing required configuration: "+name); return value; };
const hmac = (value) => createHmac("sha256", env("UCHAT_AUTH_SECRET")).update(value).digest("hex");
const keyFor = (value) => createHmac("sha256", env("UCHAT_AUTH_SECRET")).update(value.trim().toLowerCase()).digest("hex");
async function redis(...args) {
  const response=await fetch(env("UPSTASH_REDIS_REST_URL")+"/pipeline",{method:"POST",headers:{"authorization":"Bearer "+env("UPSTASH_REDIS_REST_TOKEN"),"content-type":"application/json"},body:JSON.stringify([args])});
  if(!response.ok) throw new Error("Redis request failed ("+response.status+")");
  const result=await response.json(); if(result[0]?.error) throw new Error("Redis operation failed"); return result[0]?.result;
}
async function sendEmail(to, code) {
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"authorization":"Bearer "+env("RESEND_API_KEY"),"content-type":"application/json"},body:JSON.stringify({from:env("UCHAT_EMAIL_FROM"),to:[to],subject:"Your UChat verification code",text:"Your UChat verification code is "+code+". It expires in 10 minutes. If you did not request this, ignore this email."})});
  if(!response.ok) throw new Error("Email delivery failed");
}
async function sendSms(to, code) {
  const sid=env("TWILIO_ACCOUNT_SID"), token=env("TWILIO_AUTH_TOKEN"), from=env("TWILIO_FROM_NUMBER");
  const body=new URLSearchParams({To:to,From:from,Body:"Your UChat verification code is "+code+". It expires in 10 minutes."});
  const response=await fetch("https://api.twilio.com/2010-04-01/Accounts/"+sid+"/Messages.json",{method:"POST",headers:{"authorization":"Basic "+Buffer.from(sid+":"+token).toString("base64"),"content-type":"application/x-www-form-urlencoded"},body});
  if(!response.ok) throw new Error("SMS delivery failed");
}
function signToken(user) {
  const head=Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})).toString("base64url");
  const payload=Buffer.from(JSON.stringify({sub:user.id,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60*60*24*30})).toString("base64url");
  const unsigned=head+"."+payload; return unsigned+"."+createHmac("sha256",env("UCHAT_AUTH_SECRET")).update(unsigned).digest("base64url");
}
async function authenticate(req) {
  const token=(req.headers.authorization||"").replace(/^Bearer\s+/i,""); const parts=token.split(".");
  if(parts.length!==3) throw new Error("Authentication required");
  const expected=createHmac("sha256",env("UCHAT_AUTH_SECRET")).update(parts[0]+"."+parts[1]).digest("base64url");
  const a=Buffer.from(parts[2]), b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b)) throw new Error("Invalid session");
  const claims=JSON.parse(Buffer.from(parts[1],"base64url").toString("utf8"));
  if(!claims.sub||claims.exp<Date.now()/1000) throw new Error("Session expired");
  const user=await redis("GET","user:"+claims.sub); if(!user) throw new Error("Account not found");
  return JSON.parse(user);
}
const validIdentity = (channel, value) => channel==="email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) : channel==="phone" ? /^\+[1-9]\d{7,14}$/.test(value) : false;
async function route(req,res) {
  const url=new URL(req.url,"https://uchat.invalid"); const path=url.pathname.replace(/^\/api\/v1\/?/,"").replace(/\/$/,"");
  if(req.method==="GET"&&path==="health") return json(res,200,{ok:true,service:"uchat-api",version:1});
  if(req.method==="POST"&&path==="auth/request-code") {
    const body=await readBody(req); const channel=String(body.channel||""); const identity=String(body.identity||"").trim();
    if(!validIdentity(channel,identity)) return json(res,400,{error:channel==="phone"?"Use international phone format, e.g. +256...":"Enter a valid email address"});
    const digest=keyFor(channel+":"+identity); const attempts=Number(await redis("INCR","otp-send:"+digest)); if(attempts===1) await redis("EXPIRE","otp-send:"+digest,3600); if(attempts>5) return json(res,429,{error:"Too many verification requests. Try again later."}); const code=String(randomInt(100000,1000000));
    await redis("SET","otp:"+digest,JSON.stringify({hash:hmac(code),channel,identity,displayName:String(body.displayName||"").slice(0,80)}),"EX",600);
    if(channel==="email") await sendEmail(identity,code); else await sendSms(identity,code);
    return json(res,200,{ok:true,expiresIn:600});
  }
  if(req.method==="POST"&&path==="auth/verify-code") {
    const body=await readBody(req); const channel=String(body.channel||""); const identity=String(body.identity||"").trim(); const code=String(body.code||"");
    if(!validIdentity(channel,identity)||!/^\d{6}$/.test(code)) return json(res,400,{error:"Invalid verification request"});
    const digest=keyFor(channel+":"+identity); const attempts=Number(await redis("INCR","otp-verify:"+digest)); if(attempts===1) await redis("EXPIRE","otp-verify:"+digest,600); if(attempts>8) return json(res,429,{error:"Too many attempts. Request a new code later."}); const stored=await redis("GET","otp:"+digest);
    if(!stored) return json(res,401,{error:"Code expired or not requested"});
    const record=JSON.parse(stored), a=Buffer.from(record.hash), b=Buffer.from(hmac(code));
    if(a.length!==b.length||!timingSafeEqual(a,b)) return json(res,401,{error:"Incorrect verification code"});
    await redis("DEL","otp:"+digest); await redis("DEL","otp-verify:"+digest);
    let userId=await redis("GET","identity:"+digest);
    if(!userId) { userId=randomUUID(); await redis("SET","identity:"+digest,userId); }
    let user=await redis("GET","user:"+userId);
    const profile=user?JSON.parse(user):{id:userId,displayName:record.displayName||identity.split("@")[0],email:channel==="email"?identity:null,phone:channel==="phone"?identity:null,createdAt:new Date().toISOString()};
    if(record.displayName) profile.displayName=record.displayName;
    if(channel==="email") profile.email=identity; else profile.phone=identity;
    await redis("SET","user:"+userId,JSON.stringify(profile));
    return json(res,200,{token:signToken(profile),user:profile});
  }
  const user=await authenticate(req);
  if(req.method==="GET"&&path==="me") return json(res,200,{user});
  if(req.method==="POST"&&path==="conversations") {
    const body=await readBody(req); const memberIds=[...new Set([user.id,...(Array.isArray(body.memberIds)?body.memberIds.map(String):[])])];
    if(memberIds.length>100) return json(res,400,{error:"Too many members"});
    for(const id of memberIds) if(!await redis("GET","user:"+id)) return json(res,404,{error:"A participant does not exist"});
    const id=randomUUID(), conversation={id,memberIds,title:String(body.title||"").slice(0,100),createdAt:new Date().toISOString()};
    await redis("SET","conversation:"+id,JSON.stringify(conversation));
    for(const member of memberIds) await redis("SADD","user-conversations:"+member,id);
    return json(res,201,{conversation});
  }
  if(req.method==="GET"&&path==="conversations") {
    const ids=await redis("SMEMBERS","user-conversations:"+user.id)||[];
    const conversations=[];
    for(const id of ids.slice(0,200)){const value=await redis("GET","conversation:"+id);if(value)conversations.push(JSON.parse(value));}
    return json(res,200,{conversations});
  }
  if(path==="messages"&&req.method==="POST") {
    const body=await readBody(req); const conversationId=String(body.conversationId||""); const messageId=String(body.messageId||randomUUID()); const ciphertext=String(body.ciphertext||"");
    const conversationRaw=await redis("GET","conversation:"+conversationId); if(!conversationRaw) return json(res,404,{error:"Conversation not found"});
    const conversation=JSON.parse(conversationRaw); if(!conversation.memberIds.includes(user.id)) return json(res,403,{error:"Not a conversation member"});
    if(!ciphertext||ciphertext.length>100000) return json(res,400,{error:"Invalid encrypted message"});
    const dedupe="message:"+conversationId+":"+messageId; const inserted=await redis("SET",dedupe,"1","NX","EX",604800);
    if(!inserted) return json(res,200,{id:messageId,duplicate:true});
    const sentAt=new Date().toISOString();
    await redis("XADD","messages:"+conversationId,"*","id",messageId,"senderId",user.id,"ciphertext",ciphertext,"sentAt",sentAt);
    return json(res,201,{id:messageId,sentAt});
  }
  if(path==="messages"&&req.method==="GET") {
    const id=url.searchParams.get("conversationId")||""; const after=url.searchParams.get("after")||"-"; const raw=await redis("GET","conversation:"+id);
    if(!raw) return json(res,404,{error:"Conversation not found"}); const conversation=JSON.parse(raw);
    if(!conversation.memberIds.includes(user.id)) return json(res,403,{error:"Not a conversation member"});
    const entries=await redis("XRANGE","messages:"+id,(after === "-" ? "-" : "("+after),"+","COUNT",200)||[];
    const messages=entries.map(([streamId,fields])=>{const f={};for(let i=0;i<fields.length;i+=2)f[fields[i]]=fields[i+1];return {...f,streamId};});
    return json(res,200,{messages,nextCursor:messages.at(-1)?.streamId||after});
  }
  if(path==="calls"&&req.method==="POST") {
    const body=await readBody(req); const to=String(body.to||""); const type=String(body.type||""); const callId=String(body.callId||randomUUID());
    if(!to||!["offer","answer","ice","end","reject"].includes(type)||!await redis("GET","user:"+to)) return json(res,400,{error:"Invalid call signal"});
    const conversationRaw=body.conversationId?await redis("GET","conversation:"+String(body.conversationId)):null;
    if(conversationRaw&&!JSON.parse(conversationRaw).memberIds.includes(user.id)) return json(res,403,{error:"Not a conversation member"});
    const payload=JSON.stringify({callId,from:user.id,type,payload:body.payload??null,sentAt:new Date().toISOString()});
    await redis("XADD","calls:"+to,"*","event",payload);
    return json(res,202,{ok:true,callId});
  }
  if(path==="calls"&&req.method==="GET") {
    const after=url.searchParams.get("after")||"-"; const entries=await redis("XRANGE","calls:"+user.id,"("+after,"+","COUNT",100)||[];
    const events=entries.map(([streamId,fields])=>({streamId,event:JSON.parse(fields[1])}));
    return json(res,200,{events,nextCursor:events.at(-1)?.streamId||after});
  }
  return json(res,404,{error:"Route not found"});
}
export default async function handler(req,res) {
  try { await route(req,res); }
  catch(error) { const message=error instanceof Error?error.message:"Unexpected server error"; const status=/Authentication|required|expired|Invalid session/.test(message)?401:/configuration|Redis request failed|Redis operation failed|delivery failed/.test(message)?503:400; json(res,status,{error:status===503?"Service temporarily unavailable":message}); }
}
