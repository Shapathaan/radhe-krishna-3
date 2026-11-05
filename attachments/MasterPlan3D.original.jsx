import React, { Suspense, useRef, useState, useMemo, useEffect, useCallback, Component } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, ContactShadows, Html } from '@react-three/drei'
import * as THREE from 'three'
import { gsap } from 'gsap'
import {
  PLOTS, COMMON_AREAS, ROADS, SITE_BOUNDARY, STATUS_META,
  countPlotsByStatus, SITE_TITLE, SITE_TAGLINE
} from '../data/masterPlan'

const HOME_POS = [0, 22, 20]
const HOME_TARGET = new THREE.Vector3(0, 0, 0)
const FOCUS_OFFSET = new THREE.Vector3(0, 6, 6)
const SELECTED_COLOR = '#c5a56a'
const PLOT_HEIGHT = 0.2
const HOVER_LIFT = 0.26

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(err) {
    console.warn('3D Master Plan failed:', err)
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

function Terrain({ isGu }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[SITE_BOUNDARY.width + 8, SITE_BOUNDARY.depth + 6]} />
        <meshStandardMaterial color="#1e3329" roughness={0.96} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[SITE_BOUNDARY.width, SITE_BOUNDARY.depth]} />
        <meshStandardMaterial color="#2f4a3c" roughness={0.94} />
      </mesh>

      {ROADS.map((road, i) => (
        <group key={i} position={[road.x, 0.02, road.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[road.width, road.depth]} />
            <meshStandardMaterial color="#4b4b4b" roughness={0.82} />
          </mesh>
          {road.label && (
            <Html position={[0, 0.35, 0]} center distanceFactor={24} style={{ pointerEvents: 'none' }}>
              <div className="mp3d-road-label">
                {isGu ? (road.labelGu || road.label) : road.label}
              </div>
            </Html>
          )}
        </group>
      ))}

      {COMMON_AREAS.map((area) => (
        <group key={area.id} position={[area.x, 0, area.z]}>
          <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
            <boxGeometry args={[area.width, 0.1, area.depth]} />
            <meshStandardMaterial color="#1f6b3a" roughness={0.85} />
          </mesh>
          <Html position={[0, 0.7, 0]} center distanceFactor={22} style={{ pointerEvents: 'none' }}>
            <div className="mp3d-common-tag">
              <div>{isGu ? area.nameGu : area.name}</div>
              <div className="mp3d-plot-area">{area.areaSqft.toLocaleString('en-IN')} sq.ft</div>
            </div>
          </Html>
        </group>
      ))}

      {/* North indicator */}
      <Html position={[22, 0.5, -9]} center distanceFactor={28} style={{ pointerEvents: 'none' }}>
        <div className="mp3d-north">N ↑</div>
      </Html>
    </group>
  )
}

function PlotMesh({ plot, isSelected, isDimmed, onSelect, isGu }) {
  const group = useRef()
  const [hovered, setHovered] = useState(false)
  const status = STATUS_META[plot.status]
  const color = isSelected ? SELECTED_COLOR : status.color
  const active = (hovered || isSelected) && !isDimmed

  useFrame(() => {
    if (!group.current) return
    const targetY = active ? HOVER_LIFT : 0
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY, 0.16)
  })

  return (
    <group
      ref={group}
      position={[plot.x, 0, plot.z]}
      onClick={(e) => {
        e.stopPropagation()
        if (!isDimmed) onSelect(plot.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!isDimmed) setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, PLOT_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[plot.width, PLOT_HEIGHT, plot.depth]} />
        <meshStandardMaterial
          color={color}
          roughness={0.72}
          metalness={0.04}
          transparent={isDimmed}
          opacity={isDimmed ? 0.25 : 1}
          emissive={isSelected ? SELECTED_COLOR : '#000000'}
          emissiveIntensity={isSelected ? 0.2 : 0}
        />
      </mesh>
      {(hovered || isSelected) && !isDimmed && (
        <Html position={[0, 0.95, 0]} center distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div className="mp3d-plot-tag">
            <div className="mp3d-plot-no">#{plot.id}</div>
            <div className="mp3d-plot-area">{plot.areaSqft.toLocaleString('en-IN')} sq.ft</div>
          </div>
        </Html>
      )}
    </group>
  )
}

function CameraRig({ selectedId, controlsRef }) {
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    const selected = PLOTS.find((p) => p.id === selectedId)
    const target = selected
      ? new THREE.Vector3(selected.x, 0, selected.z)
      : HOME_TARGET.clone()
    const position = selected
      ? target.clone().add(FOCUS_OFFSET)
      : new THREE.Vector3(...HOME_POS)

    const tl = gsap.timeline({ onUpdate: () => controls.update() })
    tl.to(controls.target, { x: target.x, y: target.y, z: target.z, duration: 1.1, ease: 'power3.inOut' }, 0)
      .to(camera.position, { x: position.x, y: position.y, z: position.z, duration: 1.1, ease: 'power3.inOut' }, 0)
    return () => tl.kill()
  }, [selectedId, camera, controlsRef])

  return null
}

function SceneContent({ selectedId, filter, onSelect, isGu }) {
  const controlsRef = useRef()

  return (
    <>
      <color attach="background" args={['#0f1c17']} />
      <hemisphereLight args={['#e8f0e8', '#24382e', 0.55]} />
      <ambientLight intensity={0.42} />
      <directionalLight
        position={[16, 28, 12]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
      />
      <Terrain isGu={isGu} />
      {PLOTS.map((plot) => {
        const isDimmed = filter !== 'all' && plot.status !== filter
        return (
          <PlotMesh
            key={plot.id}
            plot={plot}
            isSelected={selectedId === plot.id}
            isDimmed={isDimmed}
            onSelect={onSelect}
            isGu={isGu}
          />
        )
      })}
      <ContactShadows position={[0, 0.01, 0]} opacity={0.38} scale={50} blur={2.1} far={12} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.15}
        minDistance={10}
        maxDistance={42}
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
      />
      <CameraRig selectedId={selectedId} controlsRef={controlsRef} />
    </>
  )
}

function StaticFallback({ lang }) {
  const isGu = lang === 'gu'
  return (
    <div className="mp3d-fallback">
      <img
        src={(import.meta.env.BASE_URL || '/') + 'assets/plan-2.png'}
        alt="Master plan"
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#1a2e26' }}
      />
      <div className="mp3d-fallback-label">
        {isGu ? '3D મોડેલ ઉપલબ્ધ નથી — બ્રોશર પ્લાન' : '3D unavailable — brochure plan'}
      </div>
    </div>
  )
}

export default function MasterPlan3D({ lang = 'en' }) {
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [webglOk, setWebglOk] = useState(true)
  const isGu = lang === 'gu'
  const counts = useMemo(() => countPlotsByStatus(PLOTS), [])
  const selected = PLOTS.find((p) => p.id === selectedId) || null

  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl')
      if (!gl) setWebglOk(false)
    } catch {
      setWebglOk(false)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    const onKey = (e) => { if (e.key === 'Escape') setSelectedId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId])

  const labels = {
    title: isGu ? SITE_TITLE.gu : SITE_TITLE.en,
    tagline: isGu ? SITE_TAGLINE.gu : SITE_TAGLINE.en,
    all: isGu ? 'બધા' : 'All',
    explore: isGu ? 'પ્લોટ પસંદ કરો' : 'Select a plot',
    reset: isGu ? 'રીસેટ વ્યૂ' : 'Reset view',
    note: isGu
      ? 'બ્રોશર આધારિત દૃષ્ટાંતાત્મક 3D. પ્લોટ માપ અને ઉપલબ્ધતા પ્રોજેક્ટ ટીમ સાથે પુષ્ટિ કરો.'
      : 'Brochure-based illustrative 3D. Confirm plot sizes and availability with the project team.',
    enquire: isGu ? 'વોટ્સએપ પર પૂછો' : 'Enquire on WhatsApp',
    plot: isGu ? 'પ્લોટ' : 'Plot',
    area: isGu ? 'વિસ્તાર' : 'Area',
    section: isGu ? 'વિભાગ' : 'Section',
    road40: isGu ? '૪૦ ફૂટ ક્રોસ ઓવર રોડ' : '40 ft crossover road',
    road25: isGu ? '૨૫ ફૂટ રોડ' : '25 ft wide road',
  }

  const enquireWhatsApp = useCallback(() => {
    if (!selected) return
    const text = `નમસ્તે, હું રાધેકૃષ્ણ રેસીડેન્સી (ફેઝ-૨) ના પ્લોટ #${selected.id} (${selected.areaSqft} sq.ft) માં રસ ધરાવું છું. કૃપા કરીને ઉપલબ્ધતા અને મુલાકાતની માહિતી આપો.\n\nHello, I am interested in Plot #${selected.id} (${selected.areaSqft} sq.ft) at Radhe Krishna Residency Phase-2.`
    window.open(`https://wa.me/917069233183?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
  }, [selected])

  if (!webglOk) {
    return (
      <div className="masterplan-3d">
        <StaticFallback lang={lang} />
        <p className="mp3d-disclaimer">{labels.note}</p>
      </div>
    )
  }

  return (
    <div className="masterplan-3d">
      <div className="mp3d-canvas-wrap">
        <ErrorBoundary fallback={<StaticFallback lang={lang} />}>
          <Canvas
            shadows
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: 'default' }}
            camera={{ position: HOME_POS, fov: 40, near: 0.1, far: 200 }}
            onPointerMissed={() => setSelectedId(null)}
          >
            <Suspense fallback={null}>
              <SceneContent
                selectedId={selectedId}
                filter={filter}
                onSelect={setSelectedId}
                isGu={isGu}
              />
            </Suspense>
          </Canvas>
        </ErrorBoundary>

        <div className="mp3d-ui">
          <div className="mp3d-badge">
            <span>3D</span>
            <strong>{labels.title}</strong>
            <em className="mp3d-tagline">{labels.tagline}</em>
          </div>

          <div className="mp3d-filters">
            {['all', 'available', 'reserved', 'sold'].map((key) => (
              <button
                key={key}
                type="button"
                className={filter === key ? 'active' : ''}
                onClick={() => setFilter(key)}
              >
                {key === 'all' ? labels.all : (isGu ? STATUS_META[key].labelGu : STATUS_META[key].label)}
                {key !== 'all' && <em>{counts[key]}</em>}
              </button>
            ))}
          </div>

          <div className="mp3d-hint">
            {selected ? (
              <>
                <span className="mp3d-tag">{labels.plot} #{selected.id}</span>
                <strong>{isGu ? selected.sectionGu : selected.section}</strong>
                <span className="mp3d-area-line">{selected.areaSqft.toLocaleString('en-IN')} sq.ft</span>
                <em>
                  {isGu ? STATUS_META[selected.status].labelGu : STATUS_META[selected.status].label}
                  {' · '}
                  {isGu ? STATUS_META[selected.status].noteGu : STATUS_META[selected.status].note}
                </em>
                <button type="button" className="mp3d-enquire" onClick={enquireWhatsApp}>
                  {labels.enquire}
                </button>
              </>
            ) : (
              <span>{labels.explore}</span>
            )}
          </div>

          <button className="mp3d-reset" type="button" onClick={() => { setSelectedId(null); setFilter('all') }}>
            {labels.reset}
          </button>
        </div>
      </div>
      <p className="mp3d-disclaimer">{labels.note}</p>
    </div>
  )
}
