$(cat /dev/null)

  const saveCF=f=>{setData(p=>{const i=p.customFoods.findIndex(x=>x.id===f.id);const n=[...p.customFoods];if(i>=0)n[i]=f;else n.push(f);return{...p,customFoods:n};});setEditFood(null);setAddFood(false);};
  const delCF=id=>setData(p=>({...p,customFoods:p.customFoods.filter(f=>f.id!==id)}));
  const doExport=()=>{const b=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`macro-${today}.json`;a.click();};
  const doImport=()=>{const inp=document.createElement("input");inp.type="file";inp.accept=".json";inp.onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());if(j.days){setData(j);setStatus({t:"✓ Data imported",type:"ok"});}}catch{setStatus({t:"Invalid file",type:"err"});}};inp.click();};

  if(!data||!mounted) return <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",color:T.tx,fontFamily:"sans-serif"}}><div style={{textAlign:"center"}}><div style={{fontSize:44,marginBottom:12}}>🥩</div><div style={{fontSize:15,fontWeight:600}}>Loading...</div></div></div>;

  const stColor=status?.type==="err"?{bg:T.errBg,fg:"#fca5a5",bd:"rgba(239,68,68,0.3)"}:status?.type==="ok"?{bg:"rgba(16,185,129,0.1)",fg:T.ac,bd:"rgba(16,185,129,0.3)"}:{bg:"rgba(96,165,250,0.1)",fg:T.na,bd:"rgba(96,165,250,0.3)"};

  return (
    <>
      <Head><title>Macro Monitor</title><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"/><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/></Head>
      <style jsx global>{`*{box-sizing:border-box;margin:0;padding:0}body{background:${T.bg}}input:focus,textarea:focus{outline:none;border-color:${T.ac}!important}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${T.bg}}::-webkit-scrollbar-thumb{background:${T.bd2};border-radius:3px}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <div style={{minHeight:"100vh",background:T.bg,color:T.tx,fontFamily:"'IBM Plex Sans',-apple-system,sans-serif"}}>
        {/* Header */}
        <div style={{background:T.sf,borderBottom:`1px solid ${T.bd}`,padding:"14px 20px",position:"sticky",top:0,zIndex:100}}>
          <div style={{maxWidth:780,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:26}}>🥩</span><div style={{fontSize:17,fontWeight:700}}>Macro Monitor</div></div>
            <div style={{display:"flex",gap:3,background:T.sf2,borderRadius:12,padding:3}}>
              {[["today","📋","Log"],["week","📊","Week"],["settings","⚙️","Settings"]].map(([k,ic,lb])=>
                <button key={k} onClick={()=>setTab(k)} style={{background:tab===k?T.ac:"transparent",color:tab===k?"#fff":T.txd,border:"none",borderRadius:10,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:14}}>{ic}</span>{lb}</button>
              )}
            </div>
          </div>
        </div>

        <div style={{maxWidth:780,margin:"0 auto",padding:20,display:"flex",flexDirection:"column",gap:16}}>

          {tab==="today"&&<>
            {/* Date Selector */}
            <Card>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <button onClick={()=>shiftDate(-1)} style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:8,padding:"8px 14px",color:T.tx,cursor:"pointer",fontSize:16}}>◀</button>
                <div style={{textAlign:"center",flex:1}}>
                  <div style={{fontSize:18,fontWeight:700,color:T.tx}}>{friendlyDate(selectedDate)}</div>
                  <input type="date" value={selectedDate} max={today} onChange={e=>{if(e.target.value<=today)setSelectedDate(e.target.value);}} style={{background:"transparent",border:"none",color:T.txd,fontSize:12,fontFamily:"'JetBrains Mono',monospace",textAlign:"center",cursor:"pointer",marginTop:2}}/>
                </div>
                <button onClick={()=>shiftDate(1)} disabled={isToday} style={{background:isToday?T.bg:T.sf2,border:`1px solid ${isToday?T.bg:T.bd}`,borderRadius:8,padding:"8px 14px",color:isToday?T.txm:T.tx,cursor:isToday?"default":"pointer",fontSize:16}}>▶</button>
              </div>
              {!isToday&&<div style={{textAlign:"center",marginTop:8}}><button onClick={()=>setSelectedDate(today)} style={{background:"transparent",border:"none",color:T.ac,cursor:"pointer",fontSize:12,fontWeight:600}}>↩ Back to Today</button></div>}
            </Card>

            {/* Input */}
            <Card>
              <div style={{fontSize:13,color:T.txd,marginBottom:10,fontWeight:500}}>Describe what you ate — Claude will break it down and calculate macros</div>
              <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleParse();}}} placeholder='e.g. "3 scrambled eggs with spinach and butter, a Fairlife shake"' rows={3} style={{width:"100%",background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:10,padding:"12px 14px",color:T.tx,fontSize:14,fontFamily:"inherit",resize:"vertical",marginBottom:10}}/>
              <div style={{display:"flex",gap:8}}>
                <button onClick={toggleVoice} style={{background:listening?T.err:T.sf2,border:`1px solid ${listening?T.err:T.bd}`,borderRadius:10,padding:"11px 16px",color:listening?"#fff":T.tx,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",gap:6}}><span style={{animation:listening?"pulse 1s infinite":"none"}}>{listening?"🔴":"🎤"}</span>{listening?"Listening...":"Voice"}</button>
                <button onClick={handleParse} disabled={!input.trim()||parsing} style={{flex:1,background:(input.trim()&&!parsing)?T.ac:T.sf2,border:"none",borderRadius:10,padding:"11px 16px",color:(input.trim()&&!parsing)?"#fff":T.txm,cursor:(input.trim()&&!parsing)?"pointer":"default",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                  {parsing?<><span style={{display:"inline-block",width:16,height:16,border:"2.5px solid rgba(255,255,255,0.25)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>Analyzing...</>:"🧠 Analyze & Add"}
                </button>
              </div>
              {status&&<div style={{marginTop:10,fontSize:13,padding:"8px 12px",borderRadius:8,background:stColor.bg,color:stColor.fg,border:`1px solid ${stColor.bd}`}}>{status.t}</div>}
            </Card>

            {warns.length>0&&warns.map((w,i)=><Alert key={i} danger={w.d}>{w.m}</Alert>)}

            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              <Metric label="Calories" value={totals.calories} unit="kcal" color={T.cal}/>
              <Metric label="Protein" value={totals.protein} unit="g" color={T.prot} target={145} warn={totals.protein<145&&dayItems.length>2}/>
              <Metric label="Fat" value={totals.fat} unit="g" color={T.fat}/>
              <Metric label="Net Carbs" value={totals.netCarbs} unit="g" color={T.carb} target="30–35" warn={totals.netCarbs>40||(totals.netCarbs>0&&totals.netCarbs<30)}/>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
              <Metric label="Sodium" value={totals.sodium} unit="mg" color={T.na}/>
              <Metric label="Potassium" value={totals.potassium} unit="mg" color={T.k}/>
              <Metric label="Magnesium" value={totals.magnesium} unit="mg" color={T.mg}/>
            </div>

            {dayItems.length>0&&<Card style={{padding:0}}>
              <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.bd}`,fontSize:12.5,fontWeight:600,color:T.txd}}>{friendlyDate(selectedDate)}{selectedDate===today?"'s":""} Log · {dayItems.length} item{dayItems.length>1?"s":""}</div>
              {dayItems.map(it=>(
                <div key={it.id} style={{padding:"10px 16px",borderBottom:`1px solid ${T.bd}`,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13.5,fontWeight:500,color:T.tx,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{it.name}</div>
                    <div style={{fontSize:11,color:T.txd,marginTop:2,fontFamily:"'JetBrains Mono',monospace"}}>{ri(it.calories)}cal · {r1(it.protein)}p · {r1(it.fat)}f · {r1(Math.max(0,(it.carbs||0)-(it.fiber||0)))}nc <span style={{color:T.txm}}>· {ri(it.sodium)}Na · {ri(it.potassium)}K · {ri(it.magnesium)}Mg</span></div>
                  </div>
                  <button onClick={()=>deleteItem(it.id)} style={{background:"none",border:"none",color:T.txm,cursor:"pointer",fontSize:15}}>✕</button>
                </div>
              ))}
            </Card>}

            <button onClick={logToSheet} disabled={!dayItems.length||!data?.formUrl} style={{width:"100%",background:(dayItems.length&&data?.formUrl)?"#2563eb":T.sf2,border:"none",borderRadius:10,padding:14,fontSize:15,fontWeight:700,color:(dayItems.length&&data?.formUrl)?"#fff":T.txm,cursor:(dayItems.length&&data?.formUrl)?"pointer":"default"}}>📊 Log Day in Google Sheet</button>
            {!data?.formUrl&&dayItems.length>0&&<div style={{textAlign:"center",fontSize:12,color:T.txd}}>Set up your Google Form in <button onClick={()=>setTab("settings")} style={{background:"none",border:"none",color:T.ac,cursor:"pointer",fontSize:12,fontWeight:600}}>Settings</button> to enable</div>}
          </>}

          {tab==="week"&&<>
            <Card>
              <div style={{fontSize:13,fontWeight:600,color:T.txd,marginBottom:12}}>Weekly Averages · {wkData.filter(d=>d.has).length} days logged</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                <Metric label="Avg Cal" value={wkAvg.calories} unit="kcal" color={T.cal}/>
                <Metric label="Avg Prot" value={wkAvg.protein} unit="g" color={T.prot} target={145}/>
                <Metric label="Avg Fat" value={wkAvg.fat} unit="g" color={T.fat} warn={wkAvg.fat>80}/>
                <Metric label="Avg NC" value={wkAvg.netCarbs} unit="g" color={T.carb}/>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:10,marginTop:10}}>
                <Metric label="Avg Na" value={wkAvg.sodium} unit="mg" color={T.na}/>
                <Metric label="Avg K" value={wkAvg.potassium} unit="mg" color={T.k}/>
                <Metric label="Avg Mg" value={wkAvg.magnesium} unit="mg" color={T.mg}/>
              </div>
            </Card>
            {warns.filter(w=>w.m.toLowerCase().includes("weekly")).map((w,i)=><Alert key={i} danger={w.d}>{w.m}</Alert>)}
            {mounted&&<>
              <Card>
                <div style={{fontSize:13,fontWeight:600,color:T.txd,marginBottom:14}}>Macros · Weekly</div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={wkData} margin={{top:5,right:10,left:-15,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.bd}/><XAxis dataKey="label" stroke={T.txm} fontSize={11}/><YAxis stroke={T.txm} fontSize={10}/>
                    <Tooltip contentStyle={{background:T.sf,border:`1px solid ${T.bd}`,borderRadius:8,fontSize:11.5,color:T.tx}}/><Legend wrapperStyle={{fontSize:10.5}}/>
                    <Line type="monotone" dataKey="calories" name="Cal" stroke={T.cal} strokeWidth={2} dot={{fill:T.cal,r:3}}/>
                    <Line type="monotone" dataKey="protein" name="Prot" stroke={T.prot} strokeWidth={2} dot={{fill:T.prot,r:3}}/>
                    <Line type="monotone" dataKey="fat" name="Fat" stroke={T.fat} strokeWidth={2} dot={{fill:T.fat,r:3}}/>
                    <Line type="monotone" dataKey="netCarbs" name="NC" stroke={T.carb} strokeWidth={2} dot={{fill:T.carb,r:3}}/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <div style={{fontSize:13,fontWeight:600,color:T.txd,marginBottom:14}}>Electrolytes · Weekly (mg)</div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={wkData} margin={{top:5,right:10,left:-15,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.bd}/><XAxis dataKey="label" stroke={T.txm} fontSize={11}/><YAxis stroke={T.txm} fontSize={10}/>
                    <Tooltip contentStyle={{background:T.sf,border:`1px solid ${T.bd}`,borderRadius:8,fontSize:11.5,color:T.tx}}/><Legend wrapperStyle={{fontSize:10.5}}/>
                    <Line type="monotone" dataKey="sodium" name="Na" stroke={T.na} strokeWidth={2} dot={{fill:T.na,r:3}}/>
                    <Line type="monotone" dataKey="potassium" name="K" stroke={T.k} strokeWidth={2} dot={{fill:T.k,r:3}}/>
                    <Line type="monotone" dataKey="magnesium" name="Mg" stroke={T.mg} strokeWidth={2} dot={{fill:T.mg,r:3}}/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </>}
          </>}

          {tab==="settings"&&<>
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,color:T.tx}}>📊 Google Sheet Integration</div>
                <button onClick={()=>setShowGuide(true)} style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:8,padding:"6px 14px",color:T.ac,cursor:"pointer",fontSize:12,fontWeight:600}}>Setup Guide</button>
              </div>
              <div style={{fontSize:12,color:T.txd,marginBottom:10}}>Paste your Google Form prefilled link. The app auto-detects field IDs.</div>
              <input value={data.formUrl||""} onChange={e=>setData(p=>({...p,formUrl:e.target.value.trim()}))} placeholder="https://docs.google.com/forms/d/e/XXXX/viewform?usp=pp_url&entry.123=..." style={{width:"100%",boxSizing:"border-box",background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:8,padding:"10px 12px",color:T.tx,fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}/>
              {data.formUrl&&(()=>{
                const ids=[...(data.formUrl||"").matchAll(/entry\.(\d+)/g)].map(m=>m[1]);
                const names=["Date","Cal","Prot","Fat","NC","Na","K","Mg"];
                return <div style={{marginTop:10,fontSize:11.5,fontFamily:"'JetBrains Mono',monospace"}}>
                  {ids.length>=8?<div style={{color:T.ac}}>✓ {ids.length} fields detected: {ids.slice(0,8).map((id,i)=>`${names[i]}→${id}`).join(", ")}</div>
                  :<div style={{color:T.warn}}>⚠ Found {ids.length} fields, need 8. Check your form.</div>}
                </div>;
              })()}
            </Card>

            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:600,color:T.txd}}>Custom Foods ({(data.customFoods||[]).length})</div>
                <button onClick={()=>setAddFood(true)} style={{background:T.ac,border:"none",borderRadius:8,padding:"8px 16px",color:"#fff",cursor:"pointer",fontSize:12.5,fontWeight:600}}>+ Add</button>
              </div>
              {(data.customFoods||[]).map(f=>(
                <div key={f.id} style={{padding:"10px 0",borderBottom:`1px solid ${T.bd}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13.5,fontWeight:500,color:T.tx}}>{f.name}</div>
                    <div style={{fontSize:10.5,color:T.txd,fontFamily:"'JetBrains Mono',monospace",marginTop:2}}>{f.calories}cal·{f.protein}p·{f.fat}f·{f.carbs}c · Na:{f.sodium} K:{f.potassium} Mg:{f.magnesium}</div>
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    <button onClick={()=>setEditFood(f)} style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:6,padding:"4px 10px",color:T.txd,cursor:"pointer",fontSize:11}}>Edit</button>
                    <button onClick={()=>delCF(f.id)} style={{background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:6,padding:"4px 10px",color:T.err,cursor:"pointer",fontSize:11}}>Del</button>
                  </div>
                </div>
              ))}
            </Card>

            <Card>
              <div style={{fontSize:13,fontWeight:600,color:T.txd,marginBottom:10}}>Targets</div>
              <div style={{fontSize:12.5,color:T.txd,lineHeight:1.9}}>
                <div>🎯 Protein: <span style={{color:T.prot,fontWeight:600}}>145g/day</span></div>
                <div>🎯 Net Carbs: <span style={{color:T.carb,fontWeight:600}}>30–35g</span> · <span style={{color:T.warn}}>40g</span> upper · <span style={{color:T.err}}>45g</span> max</div>
                <div>🎯 Fat: weekly avg under <span style={{color:T.fat,fontWeight:600}}>80g/day</span></div>
              </div>
            </Card>

            <Card>
              <div style={{fontSize:13,fontWeight:600,color:T.txd,marginBottom:10}}>Data</div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={doExport} style={{flex:1,background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:8,padding:10,color:T.tx,cursor:"pointer",fontSize:13}}>📤 Export</button>
                <button onClick={doImport} style={{flex:1,background:T.sf2,border:`1px solid ${T.bd}`,borderRadius:8,padding:10,color:T.tx,cursor:"pointer",fontSize:13}}>📥 Import</button>
              </div>
            </Card>
          </>}
        </div>

        {review&&<ReviewModal items={review} onConfirm={confirmItems} onCancel={()=>{setReview(null);setStatus(null);}}/>}
        {editFood&&<FoodEditor food={editFood} onSave={saveCF} onClose={()=>setEditFood(null)}/>}
        {addFood&&<FoodEditor food={null} onSave={saveCF} onClose={()=>setAddFood(false)}/>}
        {showGuide&&<SetupGuide onClose={()=>setShowGuide(false)}/>}
      </div>
    </>
  );
}
