import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { PLOTS, COMMON_AREAS, ROADS, SITE_BOUNDARY } from '../../data/masterPlan.js'

class SceneErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false } }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error('Master plan scene failed', error) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

const C = { base:'#26382d', plot:'#e9e3d5', road:'#4d514d', edge:'#c1b69b', gold:'#c7a66c', green:'#31583e' }

function Road({ road, index }) {
  const slab = useRef()
  const horizontal = road.width > road.depth
  useEffect(() => {
    if (!slab.current) return
    gsap.set(slab.current.scale, horizontal ? {x:.001,y:1,z:1} : {x:1,y:.001,z:1})
    const tween = gsap.to(slab.current.scale, { [horizontal?'x':'y']:1, duration:1.35, delay:.45+index*.22, ease:'power3.inOut' })
    return () => tween.kill()
  }, [horizontal,index])
  return <group>
    <mesh ref={slab} position={[road.x,.045,road.z]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[road.width,road.depth]} /><meshStandardMaterial color={C.road} roughness={.92} />
    </mesh>
    {horizontal ? [-1,1].map(s=><mesh key={s} position={[road.x,.09,road.z+s*(road.depth/2+.055)]}><boxGeometry args={[road.width,.11,.11]}/><meshStandardMaterial color={C.edge}/></mesh>) : [-1,1].map(s=><mesh key={s} position={[road.x+s*(road.width/2+.055),.09,road.z]}><boxGeometry args={[.11,.11,road.depth]}/><meshStandardMaterial color={C.edge}/></mesh>)}
    <Html position={[road.x,.14,road.z]} center distanceFactor={26} occlude><div className="road-label-3d">{road.label}</div></Html>
  </group>
}

function Plot({ plot, index, selected, hovered, setHovered, onSelect }) {
  const root = useRef()
  const face = useRef()
  const active = selected === index
  const over = hovered === index
  useEffect(() => {
    if (!root.current) return
    const t = gsap.to(root.current.position, { y: active ? .72 : over ? .34 : 0, duration: active ? .55 : .28, ease:'power3.out', overwrite:'auto' })
    if (face.current) gsap.to(face.current.material.color, { r:active ? .78 : over ? .82 : .91, g:active ? .65 : over ? .76 : .89, b:active ? .42 : over ? .57 : .80, duration:.22, overwrite:'auto' })
    return () => t.kill()
  }, [active,over])
  useEffect(() => {
    if (!root.current) return
    const t = gsap.fromTo(root.current.position,{y:-.55},{y:0,duration:.65,delay:.7+(index%24)*.025,ease:'power3.out'})
    return () => t.kill()
  }, [index])
  return <group ref={root} position={[plot.x,0,plot.z]} onClick={e=>{e.stopPropagation();onSelect(index)}} onPointerOver={e=>{e.stopPropagation();setHovered(index);document.body.style.cursor='pointer'}} onPointerOut={()=>{setHovered(null);document.body.style.cursor=''}}>
    <mesh position={[0,.055,0]} castShadow receiveShadow><boxGeometry args={[plot.width+.12,.15,plot.depth+.12]}/><meshStandardMaterial color="#777365" roughness={.9}/></mesh>
    <mesh ref={face} position={[0,.145,0]} castShadow receiveShadow><boxGeometry args={[plot.width,.09,plot.depth]}/><meshStandardMaterial color={C.plot} roughness={.72} metalness={.025}/></mesh>
    <lineSegments position={[0,.195,0]}><edgesGeometry args={[new THREE.BoxGeometry(plot.width,.012,plot.depth)]}/><lineBasicMaterial color={active?'#fff0c8':over?C.gold:'#77776d'} linewidth={active?2:1}/></lineSegments>
    <Text position={[0,.205,0]} rotation={[-Math.PI/2,0,0]} fontSize={Math.min(.24,plot.width*.19)} color="#292c27" anchorX="center" anchorY="middle" outlineWidth={.006} outlineColor="#f5f0e5">{`PLOT ${String(plot.number).padStart(2,'0')}\n${plot.areaSqft} SQ.FT`}</Text>
    {(active||over) && <mesh position={[0,.22,0]}><boxGeometry args={[plot.width*.94,.012,plot.depth*.94]}/><meshBasicMaterial color={active?'#d4b779':'#bba06e'} wireframe transparent opacity={.85}/></mesh>}
  </group>
}

function Tree({position,scale=1}) { return <group position={position} scale={scale}><mesh position={[0,.36,0]} castShadow><cylinderGeometry args={[.045,.065,.72,7]}/><meshStandardMaterial color="#796448"/></mesh><mesh position={[0,.91,0]} castShadow><sphereGeometry args={[.39,9,7]}/><meshStandardMaterial color="#54704d" roughness={.95}/></mesh><mesh position={[.12,1.12,-.04]} castShadow><sphereGeometry args={[.25,8,6]}/><meshStandardMaterial color="#71825a" roughness={.95}/></mesh></group> }
function Garden({area}) { const trees=useMemo(()=>Array.from({length:8},(_,i)=>[-area.width*.34+(i%4)*area.width*.22,-area.depth*.28+Math.floor(i/4)*area.depth*.55]),[area]); return <group position={[area.x,0,area.z]}><RoundedBox args={[area.width,.2,area.depth]} radius={.12} position={[0,.12,0]} castShadow receiveShadow><meshStandardMaterial color={C.green}/></RoundedBox>{trees.map(([x,z],i)=><Tree key={i} position={[x,.25,z]} scale={.55}/>) }<Html position={[0,.55,0]} center distanceFactor={24}><div className="garden-label">{area.name}<small>{area.areaSqft.toLocaleString('en-IN')} SQ.FT</small></div></Html></group> }

function Scene({selected,hovered,setHovered,onSelect,resetSignal}) {
 const controls=useRef(); const {camera}=useThree()
 useEffect(()=>{
   if(!controls.current)return
   const p=selected===null?null:PLOTS[selected]
   const target=p?{x:p.x,y:.2,z:p.z}:{x:0,y:0,z:0}
   const pos=p?{x:p.x+2.5,y:Math.max(3.3,p.depth*1.65),z:p.z+3.8}:{x:0,y:25.5,z:28}
   const tl=gsap.timeline()
   tl.to(controls.current.target,{...target,duration:.95,ease:'power3.inOut',onUpdate:()=>controls.current?.update()},0)
     .to(camera.position,{...pos,duration:.95,ease:'power3.inOut',onUpdate:()=>controls.current?.update()},0)
   return()=>tl.kill()
 },[selected,resetSignal,camera])
 return <>
  <color attach="background" args={['#18251e']}/><fog attach="fog" args={['#18251e',42,85]}/>
  <hemisphereLight args={['#f5eddd','#344638',1.35]}/><ambientLight intensity={.5}/>
  <directionalLight position={[15,30,18]} intensity={2.25} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-32} shadow-camera-right={32} shadow-camera-top={28} shadow-camera-bottom={-28}/>
  <directionalLight position={[-18,12,-12]} intensity={.5} color="#d2bd91"/>
  <mesh position={[0,-.72,0]} castShadow receiveShadow><boxGeometry args={[SITE_BOUNDARY.width+5.5,.72,SITE_BOUNDARY.depth+5]}/><meshStandardMaterial color="#202c24" roughness={.68} metalness={.12}/></mesh>
  <mesh position={[0,-.25,0]} receiveShadow><boxGeometry args={[SITE_BOUNDARY.width,.26,SITE_BOUNDARY.depth]}/><meshStandardMaterial color="#78816e" roughness={.94}/></mesh>
  {ROADS.map((r,i)=><Road key={i} road={r} index={i}/>)}
  {PLOTS.map((p,i)=><Plot key={`${p.id}-${i}`} plot={p} index={i} selected={selected} hovered={hovered} setHovered={setHovered} onSelect={onSelect}/>)}
  {COMMON_AREAS.map(a=><Garden key={a.id} area={a}/>)}
  <ContactShadows position={[0,-.08,0]} opacity={.38} scale={68} blur={2.8} far={22}/>
  <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping dampingFactor={.075} minDistance={5} maxDistance={55} minPolarAngle={.3} maxPolarAngle={1.42}/>
 </>
}

function StaticPlan(){return <div className="scene-static"><img src={`${import.meta.env.BASE_URL}assets/images/plan-2.png`} alt="Official project master plan"/><span>3D unavailable. Official brochure plan shown.</span></div>}

export default function MasterPlan3D({lang='en',t}) {
 const [selected,setSelected]=useState(null),[hovered,setHovered]=useState(null),[resetSignal,setResetSignal]=useState(0),[webgl,setWebgl]=useState(true)
 useEffect(()=>{try{const c=document.createElement('canvas');setWebgl(!!(window.WebGLRenderingContext&&(c.getContext('webgl2')||c.getContext('webgl'))))}catch{setWebgl(false)}},[])
 const plot=selected===null?null:PLOTS[selected]
 const label=lang==='gu'
 return <div className="master-scene">
  {webgl?<SceneErrorBoundary fallback={<StaticPlan/>}><Canvas shadows dpr={[1,1.5]} camera={{position:[0,25.5,28],fov:35,near:.1,far:140}} gl={{antialias:true,powerPreference:'high-performance'}} onPointerMissed={()=>{setSelected(null);setHovered(null)}}><Suspense fallback={<Html center><div className="scene-tag">Building 3D master plan…</div></Html>}><Scene selected={selected} hovered={hovered} setHovered={setHovered} onSelect={setSelected} resetSignal={resetSignal}/></Suspense></Canvas></SceneErrorBoundary>:<StaticPlan/>}
  <div className="scene-topline"><span>{t.modelLabel}</span><span>{t.illustrative}</span></div>
  {plot&&<aside className="plot-detail-card" key={plot.id}><button className="plot-detail-close" onClick={()=>setSelected(null)} aria-label="Close plot details">×</button><span className="plot-detail-kicker">RADHE KRISHNA RESIDENCY · PHASE 02</span><h3>{label?'પ્લોટની વિગતો':'Plot details'}</h3><div className="plot-detail-number">{String(plot.number).padStart(2,'0')}</div><div className="plot-detail-row"><span>{label?'વિસ્તાર':'Area shown in supplied layout'}</span><strong>{plot.areaSqft.toLocaleString('en-IN')} sq.ft.</strong></div><p>{label?'આ 3D ગોઠવણી દૃષ્ટાંતાત્મક છે. ચોક્કસ માપ માટે મંજૂર નકશો તપાસો.':'Conceptual 3D position. Confirm area and dimensions against the approved plan before purchase.'}</p><a href={`https://wa.me/917069233183?text=${encodeURIComponent(`Hello, I would like to enquire about Plot ${plot.number} at Radhe Krishna Residency Phase 02.`)}`} target="_blank" rel="noreferrer">{label?'વોટ્સએપ પૂછપરછ':'ENQUIRE ABOUT THIS PLOT'} ↗</a></aside>}
  <div className="scene-bottomline"><div className="scene-selection">{selected===null?(hovered===null?t.modelHint:`${label?'પ્લોટ':'Plot'} ${String(PLOTS[hovered].number).padStart(2,'0')} · ${PLOTS[hovered].areaSqft.toLocaleString('en-IN')} sq.ft.`):`${label?'પ્લોટ પસંદ કર્યું':'Selected plot'} · ${String(plot.number).padStart(2,'0')}`}</div><button type="button" className="scene-reset" onClick={()=>{setSelected(null);setHovered(null);setResetSignal(v=>v+1)}}>{t.reset}</button></div>
 </div>
}
