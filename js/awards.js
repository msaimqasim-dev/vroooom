/** Hover, keyboard focus and touch share one flip state. Mouse clicks never flip. */
export function initFlipCards(root=document){
  const hover=matchMedia('(hover: hover) and (pointer: fine)');
  root.querySelectorAll('[data-flip]').forEach(card=>{
    const front=card.querySelector('.flip-front'),back=card.querySelector('.flip-back');
    const scroll=back.querySelector('.flip-back-scroll');
    let open=false,touchStart=null,touchHandled=-1000;
    const set=value=>{
      if(open===value)return;
      open=value;card.classList.toggle('is-flipped',open);card.dataset.face=open?'back':'front';
      front.inert=open;front.setAttribute('aria-hidden',String(open));
      back.inert=!open;back.setAttribute('aria-hidden',String(!open));
      back.querySelector('.back-hint').textContent=hover.matches?'Move away or press Escape to return':'Tap again or press Escape to return';
      if(!open)scroll.scrollTop=0;
    };
    card.dataset.face='front';back.inert=true;back.setAttribute('aria-hidden','true');
    card.addEventListener('pointerenter',event=>{if(hover.matches&&event.pointerType==='mouse')set(true);});
    card.addEventListener('pointerleave',event=>{if(hover.matches&&event.pointerType==='mouse'&&!card.contains(document.activeElement))set(false);});
    card.addEventListener('focusin',event=>{if(event.target===card&&performance.now()-touchHandled>700)set(true);});
    card.addEventListener('focusout',event=>{if(!card.contains(event.relatedTarget)&&(!hover.matches||!card.matches(':hover')))set(false);});
    card.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'){touchHandled=performance.now();touchStart={x:event.clientX,y:event.clientY};}});
    card.addEventListener('pointerup',event=>{
      if(!touchStart)return;
      const tap=Math.hypot(event.clientX-touchStart.x,event.clientY-touchStart.y)<10;
      touchStart=null;if(!tap)return;
      touchHandled=performance.now();set(!open);
    });
    card.addEventListener('pointercancel',()=>{touchStart=null;});
    card.addEventListener('click',event=>{
      if(event.detail===0){set(!open);return;}
      if(!hover.matches&&performance.now()-touchHandled>700)set(!open);
    });
    card.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();card.focus({preventScroll:true});set(false);}
      else if(event.target===card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();set(!open);}
      else if(event.target===card&&open&&['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(event.key)){
        event.preventDefault();const amount=event.key.includes('Page')?scroll.clientHeight*.8:64;
        if(event.key==='Home')scroll.scrollTop=0;else if(event.key==='End')scroll.scrollTop=scroll.scrollHeight;else scroll.scrollTop+=['ArrowUp','PageUp'].includes(event.key)?-amount:amount;
      }
    });
  });
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  if(!motion.matches&&'IntersectionObserver'in window){
    const animations=new Set();
    motion.addEventListener('change',()=>{if(motion.matches){animations.forEach(animation=>animation.finish());animations.clear();}});
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){
      if(!motion.matches){const animation=entry.target.animate([{opacity:.25,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});animations.add(animation);animation.finished.then(()=>animations.delete(animation));}
      observer.unobserve(entry.target);
    }}),{threshold:.06});
    root.querySelectorAll('.heritage-item').forEach(card=>observer.observe(card));
  }
}
if(document.querySelector('.awards-page'))initFlipCards();
