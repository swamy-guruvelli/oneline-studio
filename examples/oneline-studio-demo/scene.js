(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const label=(x,y,value,cls='micro',anchor='middle')=>`<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${esc(value)}</text>`;
  const card=(x,y,w,h,title,detail,cls='panel')=>`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="22"/>${label(x+w/2,y+42,title,'label')}${label(x+w/2,y+78,detail,'micro')}`;
  const frame=(scene,body)=>`<svg viewBox="0 0 720 674" role="img" aria-label="OneLine Studio turns an idea into a video"><rect class="svg-bg" x="24" y="16" width="672" height="638" rx="28"/><path d="M48 91H672" class="line" opacity=".42"/><g class="scene-enter">${label(54,58,scene.label||'ONELINE STUDIO','micro cyan','start')}${label(666,58,scene.note||'','micro','end')}${body}</g></svg>`;

  window.renderCustomScene=(index,scene)=>{
    if(index===0){
      const body=`${card(84,182,552,210,'ONE SENTENCE','A clear question starts the story.','panel-c')}<path d="M142 474H578" class="line-c route"/><circle class="data-packet" cx="142" cy="474" r="12" fill="#ffc145"/>${label(142,520,'IDEA','micro cyan')}${label(578,520,'VIDEO','micro')}${label(360,596,'THE PROMPT IS THE STARTING POINT','tiny')}`;
      return frame(scene,body);
    }
    if(index===1){
      const body=`${card(54,226,188,168,'FACTS','Check the key idea.','panel-c')}${card(266,226,188,168,'SCRIPT','Shape the explanation.','panel-a')}${card(478,226,188,168,'SCENES','Show each step.','panel-g')}<path d="M242 310H266M454 310H478" class="line route"/><path d="M246 300L258 310L246 320M458 300L470 310L458 320" class="line-a"/><path d="M100 486H620" class="line-c route"/><circle class="pulse" cx="360" cy="486" r="15" fill="#ffc145"/>${label(360,544,'ONE CLEAR PATH FROM QUESTION TO EXPLANATION','tiny')}`;
      return frame(scene,body);
    }
    const body=`<rect class="panel" x="74" y="226" width="202" height="286" rx="24"/><path d="M100 302H248M100 326H226M100 350H240M100 374H212" class="line-c"/><path d="M108 430H236" class="line-a route"/><circle class="pulse" cx="172" cy="430" r="11" fill="#ffc145"/>${label(175,478,'VOICE + WORD TIMING','micro cyan')}<path d="M276 364H374" class="line-g route"/><rect class="panel-g" x="374" y="180" width="272" height="390" rx="28"/><rect x="398" y="214" width="224" height="286" rx="18" fill="#07131b" stroke="#31545e" stroke-width="2"/><rect class="panel-c" x="420" y="248" width="180" height="88" rx="16"/>${label(510,284,'VIDEO SCENES','label cyan')}${label(510,310,'READY TO REVIEW','micro')}<rect class="panel-a" x="418" y="372" width="184" height="70" rx="18"/>${label(510,404,'WORD BY WORD','micro amber')}${label(510,428,'KARAOKE CAPTIONS','micro')}<circle cx="510" cy="532" r="22" fill="#52d9d7"/><path d="M504 520L522 532L504 544Z" fill="#07131b"/>${label(360,610,'NARRATION / SCENES / CAPTIONS / MP4','tiny')}`;
    return frame(scene,body);
  };
})();
