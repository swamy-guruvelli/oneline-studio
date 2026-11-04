(()=>{
  const cfg=window.PROJECT_CONFIG;
  if(!cfg)throw new Error('PROJECT_CONFIG is missing');
  const brand=cfg.brand||{name:'OneLine Studio',tagline:'ONE SENTENCE. ONE VIDEO.',logoFile:'assets/oneline-studio-logo.png',outro:'MADE WITH ONELINE STUDIO'};
  let timing={durationSeconds:90,sentences:[]},captionSettings={enabled:false,language:'same',style:'phrase'},startAt=null,lastScene=-1;
  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
  const smooth=value=>{const n=clamp(value);return n*n*(3-2*n)};
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const svgOpen='<svg viewBox="0 0 720 674" role="img" aria-label="Animated video explanation"><rect class="svg-bg" x="24" y="16" width="672" height="638" rx="28"/><path d="M48 91H672" class="line" opacity=".42"/><g class="scene-enter">';
  const svgClose='</g></svg>';
  const scenes=cfg.scenes||[];

  function outroSvg(){
    const name=esc(String(brand.name||'OneLine Studio').toUpperCase());
    const tagline=esc(String(brand.tagline||'ONE SENTENCE. ONE VIDEO.').toUpperCase());
    const logo=esc(brand.logoFile||'assets/oneline-studio-logo.png');
    const outro=esc(String(brand.outro||`MADE WITH ${brand.name||'OneLine Studio'}`).toUpperCase());
    return `${svgOpen}<rect x="76" y="86" width="568" height="468" rx="34" fill="#061018" stroke="#f4a900" stroke-width="2"/><circle class="pulse" cx="360" cy="176" r="60" fill="#f4a900" fill-opacity=".08" stroke="#f4a900" stroke-width="2"/><image href="${logo}" x="316" y="132" width="88" height="88" preserveAspectRatio="xMidYMid meet"/><text class="title" x="360" y="282" text-anchor="middle">${name}</text><text class="label cyan" x="360" y="326" text-anchor="middle">${tagline}</text><text class="micro" x="360" y="364" text-anchor="middle">ONE SENTENCE. ONE COMPLETE VIDEO.</text><rect x="126" y="397" width="468" height="64" rx="32" fill="#f4a900" fill-opacity=".13" stroke="#f4a900" stroke-opacity=".82" stroke-width="2"/><text class="label amber" x="360" y="436" text-anchor="middle">${outro}</text><text class="micro cyan" x="360" y="508" text-anchor="middle">SAVE THIS EXPLAINER</text>${svgClose}`;
  }

  function sceneStart(scene,duration){
    if(scene.startRatio!==undefined)return clamp(Number(scene.startRatio))*duration;
    return Number(scene.startSec??0);
  }

  function getSceneIndex(seconds,duration){
    let index=0;
    for(let i=0;i<scenes.length;i++){
      if(seconds>=sceneStart(scenes[i],duration))index=i;
      else break;
    }
    return Math.min(index,Math.max(0,scenes.length-1));
  }

  function getScene(index,scene){
    if(typeof window.renderCustomScene==='function')return window.renderCustomScene(index,scene||{});
    const label=esc(scene?.label||'SCENE'),headline=esc(scene?.headline||'ADD A TOPIC-SPECIFIC VISUAL');
    return `${svgOpen}<text class="micro cyan" x="54" y="58">${label}</text><text class="title" x="360" y="300" text-anchor="middle">${headline}</text>${svgClose}`;
  }

  function caption(seconds,targetId='caption'){
    const element=document.getElementById(targetId);
    if(!element)return;
    if(!captionSettings.enabled){element.innerHTML='';return;}
    const index=timing.sentences.findIndex(row=>seconds>=row.startSec&&seconds<=row.endSec);
    if(index<0){element.innerHTML='';return;}
    const row=timing.sentences[index],words=row.words||[];
    if(captionSettings.style==='phrase'){
      element.innerHTML=`<span class="phrase">${esc(row.text||'')}</span>`;
      return;
    }
    if(!words.length){element.innerHTML='';return;}
    let active=0;
    for(let i=0;i<words.length;i++){
      active=i;
      if(seconds<=words[i].endSec)break;
    }
    const language=String(captionSettings.spokenLanguage||'auto').split('-')[0];
    const noSpaces=['zh','ja','th','lo','km','my'].includes(language);
    element.innerHTML=words.map((word,i)=>`<span class="${i===active?'active':''}">${esc(word.text)}</span>`).join(noSpaces?'':' ');
  }

  function renderAt(time){
    const coverSeconds=Number(cfg.coverSeconds||1);
    const voiceStartsAtZero=cfg.voiceStartsAtZero!==false;
    const voiceTime=Math.max(0,time-(voiceStartsAtZero?0:coverSeconds));
    const showingCover=time<coverSeconds;
    const cover=document.getElementById('cover');
    cover.style.visibility=showingCover?'visible':'hidden';
    const coverProgress=clamp(time/coverSeconds);
    document.getElementById('cover-track').style.transform=`scaleX(${.12+.88*smooth(coverProgress)})`;
    document.getElementById('cover-packet').style.left=`${12+76*smooth(coverProgress)}%`;
    const titleMove=smooth(clamp((time-.05)/Math.max(.1,coverSeconds-.1))),move=(a,b)=>a+(b-a)*titleMove;
    const kicker=document.getElementById('cover-kicker'),level=document.getElementById('cover-level'),title=document.getElementById('cover-title');
    kicker.style.top=`${move(300,118)}px`;kicker.style.fontSize=`${move(21,11)}px`;kicker.style.letterSpacing=`${move(.2,.17)}em`;
    level.style.top=`${move(354,137)}px`;level.style.fontSize=`${move(14,10)}px`;level.style.padding=`${move(11,0)}px ${move(22,0)}px`;
    level.style.borderColor=`rgba(244,169,0,${.62*(1-titleMove)})`;level.style.backgroundColor=`rgba(244,169,0,${.08*(1-titleMove)})`;
    title.style.top=`${move(422,154)}px`;title.style.left=`${move(20,42)}px`;title.style.width=`${move(680,636)}px`;
    title.style.fontSize=`${move(cfg.coverSize||68,cfg.headerSize||30)}px`;title.style.lineHeight=String(move(1.03,cfg.headerLineHeight||1.2));
    document.getElementById('cover-bottom').style.opacity=String(1-titleMove);
    const main=document.getElementById('main-ui');
    main.style.opacity=showingCover?'0':'1';
    document.getElementById('stage').style.opacity=showingCover?'0':'1';
    const coverCaptionDelay=Number(cfg.coverSubtitleDelay??.3);
    const showCoverCaption=captionSettings.enabled&&voiceStartsAtZero&&time>=coverCaptionDelay&&showingCover;
    const coverCaption=document.getElementById('cover-caption');
    coverCaption.style.opacity=showCoverCaption?String(smooth((time-coverCaptionDelay)/.35)):'0';
    const duration=Number(timing.durationSeconds||0);
    const isOutro=voiceTime>=duration;
    const sceneIndex=getSceneIndex(voiceTime,duration);
    const scene=scenes[sceneIndex]||{};
    if(lastScene!==sceneIndex||isOutro!==window._oneLineOutro){
      document.getElementById('stage').innerHTML=isOutro?outroSvg():getScene(sceneIndex,scene);
      lastScene=sceneIndex;
      window._oneLineOutro=isOutro;
    }
    document.getElementById('status-label').textContent=isOutro?String(brand.name||'OneLine Studio').toUpperCase():scene.label||'EXPLAINER';
    document.getElementById('status-text').textContent=isOutro?String(brand.outro||`MADE WITH ${brand.name||'OneLine Studio'}`).toUpperCase():scene.status||'FOLLOW THE IDEA';
    document.getElementById('progress-fill').style.width=`${clamp(voiceTime/Math.max(.1,duration))*100}%`;
    document.querySelector('.ambient').style.opacity=String(.16+.045*(1+Math.sin(voiceTime*.58)));
    caption(voiceTime,showCoverCaption?'cover-caption':'caption');
  }

  function setNarrationTiming(data,settings={}){
    if(!data||!Array.isArray(data.sentences))throw new Error('Narration timing data is invalid.');
    captionSettings={enabled:false,language:'same',style:'phrase',...settings};
    if(captionSettings.enabled&&!['phrase','karaoke'].includes(captionSettings.style))throw new Error('Caption style must be phrase or karaoke.');
    if(captionSettings.enabled&&data.sentences.some(row=>!row||!Number.isFinite(Number(row.startSec))||!Number.isFinite(Number(row.endSec))||typeof row.text!=='string'))throw new Error('Caption phrase timing data is invalid.');
    if(captionSettings.enabled&&captionSettings.style==='karaoke'&&data.sentences.some(row=>!Array.isArray(row.words)||!row.words.length))throw new Error('Word-level timing is required for karaoke captions.');
    timing=data;lastScene=-1;window._oneLineOutro=null;renderAt(0);
  }
  function startLive(){
    if(startAt!==null)return;
    startAt=performance.now();
    const tick=now=>{const time=(now-startAt)/1000;renderAt(time);if(time<Number(timing.durationSeconds||0)+(cfg.coverSeconds||1)+3)requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
  }
  window.setNarrationTiming=setNarrationTiming;
  window.renderAt=renderAt;
  window.startLive=startLive;
  renderAt(0);
})();
