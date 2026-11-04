(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  window.renderCustomScene=(index,scene)=>{
    const headline=esc(scene.headline||scene.label||'Create a concept-specific scene');
    const note=esc(scene.note||'Replace this scaffold with the designed visual');
    const status=esc(scene.status||'');
    return `<svg viewBox="0 0 720 674" role="img" aria-label="Custom explainer scene"><rect class="svg-bg" x="24" y="16" width="672" height="638" rx="28"/><path d="M48 91H672" class="line" opacity=".42"/><g class="scene-enter"><text class="micro cyan" x="54" y="58">${esc(scene.label||'SCENE')}</text><text class="micro" x="666" y="58" text-anchor="end">${note}</text><text class="title" x="360" y="248" text-anchor="middle">${headline}</text><text class="label" x="360" y="314" text-anchor="middle">CUSTOM VISUAL PLACEHOLDER</text><text class="tiny" x="360" y="374" text-anchor="middle">DRAW A TOPIC-SPECIFIC METAPHOR HERE</text><rect class="panel-c" x="108" y="436" width="504" height="88" rx="24"/><text class="micro cyan" x="360" y="488" text-anchor="middle">${status}</text></g></svg>`;
  };
})();
