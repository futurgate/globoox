async () => {
 const s=document.querySelector("#how-it-works"),l=s.firstElementChild,d=s.querySelector('[data-motion]');
 const start=scrollY+s.getBoundingClientRect().top-parseFloat(getComputedStyle(l).top),distance=s.offsetHeight-l.offsetHeight;
 const read=()=>({y:scrollY,opacity:[...d.children].map(c=>+getComputedStyle(c.firstChild).opacity),surfaces:[...d.children].map(c=>+getComputedStyle(c).opacity),transforms:[...d.children].map(c=>getComputedStyle(c).transform),active:[...s.querySelectorAll('[role=tab]')].findIndex(t=>t.getAttribute('aria-selected')==='true')});
 const settle=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const forward=[],reverse=[];
 for(let i=0;i<=120;i++){window.scrollTo({top:start+distance*i/120,behavior:'instant'});await settle();forward.push(read());}
 for(let i=120;i>=0;i--){window.scrollTo({top:start+distance*i/120,behavior:'instant'});await settle();reverse.push(read());}
 window.scrollTo({top:start+distance*.35,behavior:'instant'});await settle();const stoppedA=read();
 for(let i=0;i<40;i++)await new Promise(requestAnimationFrame);
 const stoppedB=read();let maxOverlap=0,maxReverseDelta=0;
 forward.forEach((v,i)=>{maxOverlap=Math.max(maxOverlap,v.opacity.filter(o=>o>0.001).length);v.opacity.forEach((o,j)=>{maxReverseDelta=Math.max(maxReverseDelta,Math.abs(o-reverse[120-i].opacity[j]));});});
 return {mode:d.dataset.motion,samples:forward.length+reverse.length,maxOverlap,maxReverseDelta,stopUnchanged:JSON.stringify(stoppedA)===JSON.stringify(stoppedB),stoppedA,stoppedB,forward,reverse};
}
