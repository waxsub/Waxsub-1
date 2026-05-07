import { useState, useRef } from "react";

const C = {
  bg:"#080808",surface:"#111",border:"#1e1e1e",
  accent:"#FF5C00",gold:"#FFB800",text:"#F0EBE1",
  muted:"#555",success:"#00C851",error:"#FF3B3B",
};

function audioBufferToWav(buffer) {
  const numCh=buffer.numberOfChannels,sr=buffer.sampleRate;
  const ns=buffer.length*numCh,bps=16;
  const br=(sr*numCh*bps)/8,ba=(numCh*bps)/8,ds=ns*(bps/8);
  const ab=new ArrayBuffer(44+ds);const v=new DataView(ab);
  const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  w(0,"RIFF");v.setUint32(4,36+ds,true);w(8,"WAVE");
  w(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);
  v.setUint16(22,numCh,true);v.setUint32(24,sr,true);
  v.setUint32(28,br,true);v.setUint16(32,ba,true);
  v.setUint16(34,bps,true);w(36,"data");v.setUint32(40,ds,true);
  let off=44;
  for(let i=0;i<buffer.length;i++){
    for(let ch=0;ch<numCh;ch++){
      const s=Math.max(-1,Math.min(1,buffer.getChannelData(ch)[i]));
      v.setInt16(off,s<0?s*0x8000:s*0x7fff,true);off+=2;
    }
  }
  return new Blob([ab],{type:"audio/wav"});
}

const S={
  app:{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Syne',sans-serif",paddingBottom:"60px"},
  nav:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 28px",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,background:"rgba(8,8,8,0.96)",backdropFilter:"blur(12px)",zIndex:100},
  logo:{fontSize:"20px",fontWeight:"900",letterSpacing:"-0.5px"},
  badge:{background:C.accent,color:"#fff",fontSize:"10px",fontWeight:"700",padding:"3px 10px",borderRadius:"20px",letterSpacing:"1px"},
  main:{maxWidth:"720px",margin:"0 auto",padding:"40px 20px 0"},
  h1:{fontSize:"clamp(32px,5vw,58px)",fontWeight:"900",lineHeight:"1.05",letterSpacing:"-2px",marginBottom:"12px"},
  sub:{color:C.muted,fontSize:"15px",lineHeight:"1.6",marginBottom:"36px"},
  card:{background:C.surface,border:`1px solid ${C.border}`,borderRadius:"14px",padding:"24px",marginBottom:"16px"},
  cardHL:{background:C.surface,border:`1px solid rgba(255,92,0,0.4)`,borderRadius:"14px",padding:"24px",marginBottom:"16px"},
  lbl:{fontSize:"11px",fontWeight:"700",letterSpacing:"2px",textTransform:"uppercase",color:C.muted,display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"},
  dot:{width:"6px",height:"6px",borderRadius:"50%",background:C.accent,display:"inline-block"},
  inp:{width:"100%",background:"#0d0d0d",border:`1px solid ${C.border}`,borderRadius:"8px",color:C.text,fontSize:"13px",padding:"11px 13px",fontFamily:"monospace",outline:"none",boxSizing:"border-box"},
  dz:{border:`2px dashed ${C.border}`,borderRadius:"12px",padding:"48px 20px",textAlign:"center",cursor:"pointer",background:"#0d0d0d",transition:"all 0.2s",WebkitTapHighlightColor:"rgba(255,92,0,0.2)"},
  dzA:{borderColor:C.accent,background:"rgba(255,92,0,0.05)"},
  btn:{background:C.accent,color:"#fff",border:"none",borderRadius:"10px",padding:"14px 28px",fontSize:"14px",fontWeight:"800",cursor:"pointer",width:"100%",letterSpacing:"0.5px",marginTop:"14px",transition:"all 0.15s"},
  btnDis:{opacity:0.35,cursor:"not-allowed"},
  btnSm:{background:"#1a1a1a",color:C.text,border:`1px solid ${C.border}`,borderRadius:"8px",padding:"10px 16px",fontSize:"12px",fontWeight:"700",cursor:"pointer",flex:1,minWidth:"130px"},
  btnGold:{background:C.gold,color:"#000",border:"none"},
  row:{display:"flex",gap:"10px",flexWrap:"wrap",marginTop:"14px"},
  prog:{height:"3px",background:C.border,borderRadius:"2px",overflow:"hidden",margin:"12px 0"},
  fill:{height:"100%",background:`linear-gradient(90deg,${C.accent},${C.gold})`,transition:"width 0.4s ease"},
  res:{background:"#0d0d0d",border:`1px solid ${C.border}`,borderRadius:"10px",padding:"16px",fontSize:"15px",lineHeight:"1.8"},
  info:{background:"rgba(255,92,0,0.07)",border:`1px solid rgba(255,92,0,0.25)`,borderRadius:"8px",padding:"10px 14px",fontSize:"12px",color:C.accent,marginTop:"12px"},
  err:{background:"rgba(255,59,59,0.08)",border:`1px solid rgba(255,59,59,0.3)`,borderRadius:"8px",padding:"10px 14px",fontSize:"12px",color:C.error,marginTop:"10px"},
  tag:{display:"inline-block",border:`1px solid ${C.accent}`,color:C.accent,fontSize:"10px",fontWeight:"700",letterSpacing:"2px",padding:"4px 12px",borderRadius:"4px",marginBottom:"20px",textTransform:"uppercase"},
  stepRow:{display:"flex",alignItems:"center",gap:"10px",padding:"9px 0",fontSize:"13px",borderBottom:`1px solid ${C.border}`},
};

const STEPS=[
  {label:"Extraction audio de la vidéo",icon:"🎬"},
  {label:"Transcription française — Groq Whisper",icon:"📝"},
  {label:"Traduction en Wolof — Claude AI",icon:"🔄"},
  {label:"Synthèse vocale Wolof — HuggingFace MMS",icon:"🔊"},
];

export default function WaxSub(){
  const [groqKey,setGroqKey]=useState("");
  const [hfKey,setHfKey]=useState("");
  const [file,setFile]=useState(null);
  const [loading,setLoading]=useState(false);
  const [curStep,setCurStep]=useState(0);
  const [progress,setProgress]=useState(0);
  const [transcript,setTranscript]=useState("");
  const [wolof,setWolof]=useState("");
  const [audioUrl,setAudioUrl]=useState("");
  const [error,setError]=useState("");
  const [drag,setDrag]=useState(false);
  const fileRef=useRef();

  const reset=()=>{setCurStep(0);setProgress(0);setTranscript("");setWolof("");setAudioUrl("");setError("");};

  const pickFile=(f)=>{
    if(!f)return;
    if(!f.type.startsWith("video/")&&!f.type.startsWith("audio/")){setError("Format non supporté. Utilise MP4, MOV, AVI, MP3, WAV.");return;}
    if(f.size>50*1024*1024){setError("Fichier trop lourd. Max 50MB.");return;}
    setFile(f);reset();
  };

  const run=async()=>{
    if(!file||!groqKey.trim()||!hfKey.trim())return;
    setLoading(true);setError("");reset();

    try{
      /* STEP 1 — Extraction audio */
      setCurStep(1);setProgress(10);
      let wavBlob;
      try{
        const ab=await file.arrayBuffer();
        const ctx=new(window.AudioContext||window.webkitAudioContext)();
        const buf=await ctx.decodeAudioData(ab);
        wavBlob=audioBufferToWav(buf);
        await ctx.close();
      }catch{
        wavBlob=file;
      }
      setProgress(25);

      /* STEP 2 — Groq Whisper */
      setCurStep(2);setProgress(32);
      const fd=new FormData();
      fd.append("file",wavBlob,"audio.wav");
      fd.append("model","whisper-large-v3");
      fd.append("language","fr");

      const gRes=await fetch("https://api.groq.com/openai/v1/audio/transcriptions",{
        method:"POST",
        headers:{Authorization:`Bearer ${groqKey.trim()}`},
        body:fd,
      });
      if(!gRes.ok){const e=await gRes.json();throw new Error(`Groq: ${e.error?.message||gRes.status}`);}
      const gData=await gRes.json();
      const frText=gData.text;
      if(!frText)throw new Error("Transcription vide — la vidéo a-t-elle de l'audio ?");
      setTranscript(frText);
      setProgress(55);

      /* STEP 3 — Claude translation */
      setCurStep(3);setProgress(60);
      const cRes=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"claude-sonnet-4-20250514",
          max_tokens:1000,
          system:"Tu es un expert en Wolof sénégalais. Traduis le texte français en Wolof naturel et courant. Réponds UNIQUEMENT avec la traduction Wolof, sans aucune explication ni commentaire.",
          messages:[{role:"user",content:frText}],
        }),
      });
      const cData=await cRes.json();
      const wolofText=cData.content?.[0]?.text||"";
      if(!wolofText)throw new Error("Traduction Wolof vide");
      setWolof(wolofText);
      setProgress(78);

      /* STEP 4 — HuggingFace MMS-TTS Wolof */
      setCurStep(4);setProgress(83);
      const hfRes=await fetch("https://api-inference.huggingface.co/models/facebook/mms-tts-wol",{
        method:"POST",
        headers:{Authorization:`Bearer ${hfKey.trim()}`,"Content-Type":"application/json"},
        body:JSON.stringify({inputs:wolofText}),
      });
      if(!hfRes.ok){const e=await hfRes.text();throw new Error(`HuggingFace MMS: ${e.slice(0,100)}`);}
      const audioBlob=await hfRes.blob();
      setAudioUrl(URL.createObjectURL(audioBlob));
      setProgress(100);
      setCurStep(5);

    }catch(e){
      setError(e.message||"Erreur inconnue");
      setCurStep(0);setProgress(0);
    }finally{
      setLoading(false);
    }
  };

  const keysOk=groqKey.length>10&&hfKey.startsWith("hf_");
  const canRun=keysOk&&file&&!loading;

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fadeUp 0.4s ease;}
        input:focus{border-color:#FF5C00!important;}
        .dz:hover{border-color:#FF5C00!important;}
        .btn-main:hover:not(:disabled){background:#FF7A00!important;transform:translateY(-1px);}
        .btn-sm:hover{background:#222!important;}
      `}</style>

      <div style={S.app}>

        {/* NAV */}
        <nav style={S.nav}>
          <div style={S.logo}>Wax<span style={{color:C.accent}}>Sub</span></div>
          <span style={S.badge}>Pipeline Complet</span>
        </nav>

        <div style={S.main}>

          {/* HERO */}
          <div style={{marginBottom:"32px"}} className="fade">
            <div style={S.tag}>🇸🇳 Groq · Claude · HuggingFace</div>
            <h1 style={S.h1}>Vidéo française →<br/><span style={{color:C.accent}}>Voix Wolof</span></h1>
            <p style={S.sub}>Upload ta vidéo → Groq la transcrit → Claude traduit en Wolof → HuggingFace génère la voix. 100% automatique.</p>
          </div>

          {/* CLÉS API */}
          <div style={S.card}>
            <div style={S.lbl}><span style={S.dot}></span>Tes clés API</div>
            <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
              <div>
                <div style={{fontSize:"11px",color:C.muted,marginBottom:"6px",fontWeight:"700",letterSpacing:"1px"}}>GROQ API KEY — console.groq.com → API Keys</div>
                <input style={S.inp} type="password" placeholder="gsk_xxxxxxxxxxxxxxxxxxxx" value={groqKey} onChange={e=>setGroqKey(e.target.value)}/>
              </div>
              <div>
                <div style={{fontSize:"11px",color:C.muted,marginBottom:"6px",fontWeight:"700",letterSpacing:"1px"}}>HUGGING FACE TOKEN — huggingface.co → Settings → Access Tokens</div>
                <input style={S.inp} type="password" placeholder="hf_xxxxxxxxxxxxxxxxxxxx" value={hfKey} onChange={e=>setHfKey(e.target.value)}/>
              </div>
            </div>
            {keysOk&&<div style={S.info}>✅ Clés détectées — prêt</div>}
          </div>

          {/* UPLOAD */}
          <div style={S.card}>
            <div style={S.lbl}><span style={S.dot}></span>Ta vidéo en français</div>
            <label
              htmlFor="vid-input"
              style={{...S.dz,...(drag?S.dzA:{}),display:"block",cursor:"pointer"}}
              className="dz"
            >
              <input id="vid-input" ref={fileRef} type="file" accept="video/*,video/mp4,video/quicktime" style={{display:"none"}} onChange={e=>pickFile(e.target.files[0])}/>
              {file?(
                <div>
                  <div style={{fontSize:"28px",marginBottom:"8px"}}>🎬</div>
                  <div style={{fontWeight:"800",fontSize:"15px",color:C.text}}>{file.name}</div>
                  <div style={{color:C.muted,fontSize:"12px",marginTop:"4px"}}>{(file.size/1024/1024).toFixed(1)} MB · Clique pour changer</div>
                </div>
              ):(
                <div>
                  <div style={{fontSize:"42px",marginBottom:"12px"}}>🎬</div>
                  <div style={{fontWeight:"800",fontSize:"16px",color:C.text,marginBottom:"8px"}}>Appuie ici pour choisir ta vidéo</div>
                  <div style={{color:C.accent,fontSize:"13px",fontWeight:"700",marginBottom:"6px"}}>📂 Galerie · Fichiers · Google Drive</div>
                  <div style={{color:C.muted,fontSize:"11px"}}>MP4 · MOV · AVI — Max 50MB</div>
                </div>
              )}
            </label>
            {error&&<div style={S.err}>⚠️ {error}</div>}
          </div>

          {/* BOUTON */}
          <button style={{...S.btn,...(canRun?{}:S.btnDis)}} className="btn-main" onClick={run} disabled={!canRun}>
            {loading?"⏳ Pipeline en cours...":"🚀 Lancer — Vidéo → Voix Wolof"}
          </button>

          {/* PIPELINE PROGRESS */}
          {(loading||curStep>0)&&(
            <div style={{...S.card,marginTop:"16px"}} className="fade">
              <div style={S.lbl}><span style={S.dot}></span>Pipeline</div>
              <div style={S.prog}><div style={{...S.fill,width:`${progress}%`}}/></div>
              {STEPS.map((s,i)=>(
                <div key={i} style={{...S.stepRow,color:i+1<curStep?C.success:i+1===curStep?C.accent:C.muted}}>
                  <span style={{width:"20px",textAlign:"center"}}>{i+1<curStep?"✅":i+1===curStep?"⚡":"○"}</span>
                  {s.icon} {s.label}
                </div>
              ))}
              <div style={{fontSize:"11px",color:C.muted,marginTop:"10px",textAlign:"right"}}>{progress}%</div>
            </div>
          )}

          {/* TRANSCRIPT */}
          {transcript&&(
            <div style={S.card} className="fade">
              <div style={S.lbl}><span style={{...S.dot,background:C.success}}></span>Transcription FR — Groq Whisper ✅</div>
              <div style={S.res}>{transcript}</div>
            </div>
          )}

          {/* WOLOF TEXT */}
          {wolof&&(
            <div style={S.card} className="fade">
              <div style={S.lbl}><span style={{...S.dot,background:C.gold}}></span>Traduction Wolof — Claude AI ✅</div>
              <div style={{...S.res,fontSize:"17px",letterSpacing:"0.3px"}}>{wolof}</div>
            </div>
          )}

          {/* AUDIO RESULT */}
          {audioUrl&&(
            <div style={S.cardHL} className="fade">
              <div style={S.lbl}><span style={{...S.dot,background:C.success}}></span>🔊 Voix Wolof générée — HuggingFace MMS ✅</div>
              <audio controls src={audioUrl} style={{width:"100%",borderRadius:"8px",marginBottom:"12px"}}/>
              <div style={S.row}>
                <button style={{...S.btnSm,...S.btnGold}} className="btn-sm" onClick={()=>{const a=document.createElement("a");a.href=audioUrl;a.download="waxsub-wolof.wav";a.click();}}>
                  💾 Télécharger l'audio Wolof
                </button>
                <button style={S.btnSm} className="btn-sm" onClick={()=>{setFile(null);reset();}}>
                  🔄 Nouvelle vidéo
                </button>
              </div>
              <div style={S.info}>🎉 Pipeline complet — Groq a transcrit · Claude a traduit · HuggingFace a généré la voix Wolof.</div>
            </div>
          )}

          {/* STACK INFO */}
          <div style={{...S.card,marginTop:"20px"}}>
            <div style={S.lbl}><span style={S.dot}></span>Stack utilisée</div>
            <div style={{display:"flex",gap:"10px",flexWrap:"wrap"}}>
              {[{n:"Groq Whisper",d:"Transcription audio → texte FR",c:C.accent},{n:"Claude AI",d:"Traduction FR → Wolof naturel",c:C.gold},{n:"HF MMS-TTS Wolof",d:"facebook/mms-tts-wol",c:C.success}].map(x=>(
                <div key={x.n} style={{flex:"1",minWidth:"160px",padding:"14px",background:"#0d0d0d",borderRadius:"10px",borderLeft:`3px solid ${x.c}`}}>
                  <div style={{fontSize:"12px",fontWeight:"800",color:x.c,marginBottom:"4px"}}>{x.n}</div>
                  <div style={{fontSize:"11px",color:C.muted}}>{x.d}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
  }
       
