import { Component, useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { ContactShadows, OrbitControls, Text } from "@react-three/drei"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import * as THREE from "three"
import gsap from "gsap"
import { COMMONS, PLOT_BY_ID, PLOTS, ROADS, siteHull, type Plot } from "@/data/plan"

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error("Master plan scene failed", error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function shapeFrom(points: [number, number][]) {
  const shape = new THREE.Shape()
  points.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z)
    else shape.lineTo(x, -z)
  })
  return shape
}

function extrude(points: [number, number][], depth: number) {
  const geom = new THREE.ExtrudeGeometry(shapeFrom(points), { depth, bevelEnabled: false })
  geom.rotateX(-Math.PI / 2)
  geom.computeVertexNormals()
  return geom
}

function Hull() {
  const geom = useMemo(() => extrude(siteHull(), 0.55), [])
  useEffect(() => () => geom.dispose(), [geom])
  return (
    <mesh geometry={geom} position={[0, -0.55, 0]} receiveShadow>
      <meshStandardMaterial color="#1a2820" roughness={0.9} metalness={0.04} />
    </mesh>
  )
}

function RoadMeshes() {
  const geoms = useMemo(() => ROADS.map((road) => extrude(road.world, 0.045)), [])
  useEffect(() => () => geoms.forEach((g) => g.dispose()), [geoms])
  return (
    <group>
      {geoms.map((geom, i) => (
        <mesh key={ROADS[i].id} geometry={geom} position={[0, 0.02, 0]} receiveShadow>
          <meshStandardMaterial color="#3c403c" roughness={0.94} />
        </mesh>
      ))}
    </group>
  )
}

function CommonMeshes() {
  const geoms = useMemo(() => COMMONS.map((area) => extrude(area.world, 0.1)), [])
  useEffect(() => () => geoms.forEach((g) => g.dispose()), [geoms])
  return (
    <group>
      {COMMONS.map((area, i) => (
        <group key={area.id}>
          <mesh geometry={geoms[i]} position={[0, 0.05, 0]} castShadow receiveShadow>
            <meshStandardMaterial color="#1e5c3a" roughness={0.86} />
          </mesh>
          <Text
            position={[area.wx, 0.2, area.wz]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.42}
            color="#e7f2ea"
            anchorX="center"
            anchorY="middle"
            maxWidth={3.2}
          >
            {area.areaSqft.toLocaleString("en-IN")}
          </Text>
        </group>
      ))}
    </group>
  )
}

function PlotMesh({
  plot,
  active,
  hot,
  onSelect,
  onHover,
}: {
  plot: Plot
  active: boolean
  hot: boolean
  onSelect: (id: number) => void
  onHover: (id: number | null) => void
}) {
  const ref = useRef<THREE.Group>(null)
  const geom = useMemo(() => extrude(plot.world, 0.16), [plot])
  const edge = useMemo(() => {
    const pts = plot.world.map(([x, z]) => new THREE.Vector3(x, 0.225, z))
    if (pts.length) pts.push(pts[0].clone())
    const g = new THREE.BufferGeometry().setFromPoints(pts)
    return g
  }, [plot])

  useEffect(() => () => {
    geom.dispose()
    edge.dispose()
  }, [geom, edge])

  useEffect(() => {
    if (!ref.current) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const y = active ? 0.42 : hot ? 0.2 : 0
    if (reduce) {
      ref.current.position.y = y
      return
    }
    const tween = gsap.to(ref.current.position, { y, duration: active ? 0.5 : 0.28, ease: "power3.out", overwrite: "auto" })
    return () => {
      tween.kill()
    }
  }, [active, hot])

  const xs = plot.world.map((p) => p[0])
  const span = Math.max(...xs) - Math.min(...xs)
  const font = Math.min(0.34, Math.max(0.16, span * 0.34))

  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation()
        onSelect(plot.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        onHover(plot.id)
      }}
      onPointerOut={() => onHover(null)}
    >
      <mesh geometry={geom} position={[0, 0.07, 0]} castShadow receiveShadow>
        <meshStandardMaterial
          color={active ? "#e4c98a" : hot ? "#f4ecdc" : "#efe6d6"}
          roughness={0.74}
          metalness={0.03}
          emissive={active ? "#8a6a32" : "#000000"}
          emissiveIntensity={active ? 0.18 : 0}
        />
      </mesh>
      <line geometry={edge}>
        <lineBasicMaterial color={active ? "#fff6df" : "#8d7d64"} />
      </line>
      <Text
        position={[plot.wx, active ? 0.7 : hot ? 0.48 : 0.28, plot.wz]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={font}
        color="#241f18"
        anchorX="center"
        anchorY="middle"
      >
        {String(plot.id).padStart(3, "0")}
      </Text>
    </group>
  )
}

function CameraRig({
  selectedId,
  resetSignal,
  controlsRef,
}: {
  selectedId: number | null
  resetSignal: number
  controlsRef: React.RefObject<OrbitControlsImpl | null>
}) {
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls?.target) return
    const plot = selectedId ? PLOT_BY_ID.get(selectedId) : undefined
    const target = plot ? { x: plot.wx, y: 0.15, z: plot.wz } : { x: 0, y: 0, z: 0 }
    const pos = plot
      ? { x: plot.wx + 0.15, y: 6.4, z: plot.wz + 4.4 }
      : { x: 0.2, y: 22, z: 13.5 }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      camera.position.set(pos.x, pos.y, pos.z)
      controls.target.set(target.x, target.y, target.z)
      controls.update()
      return
    }
    const tl = gsap.timeline()
    tl.to(
      controls.target,
      {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 1.05,
        ease: "power3.inOut",
        onUpdate: () => controls.update(),
      },
      0,
    )
    tl.to(
      camera.position,
      {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        duration: 1.05,
        ease: "power3.inOut",
        onUpdate: () => controls.update(),
      },
      0,
    )
    return () => {
      tl.kill()
    }
  }, [selectedId, resetSignal, camera, controlsRef]))

  return null
}

function Scene({
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  resetSignal,
}: {
  selectedId: number | null
  hoveredId: number | null
  onSelect: (id: number) => void
  onHover: (id: number | null) => void
  resetSignal: number
}) {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  return (
    <>
      <color attach="background" args={["#101a15"]} />
      <hemisphereLight args={["#f4ecdf", "#1d3328", 1.15]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[14, 28, 10]}
        intensity={2.15}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-10, 8, -6]} intensity={0.35} color="#e6d3ae" />
      <Hull />
      <RoadMeshes />
      <CommonMeshes />
      {PLOTS.map((plot) => (
        <PlotMesh
          key={plot.id}
          plot={plot}
          active={selectedId === plot.id}
          hot={hoveredId === plot.id}
          onSelect={onSelect}
          onHover={onHover}
        />
      ))}
      <ContactShadows position={[0, 0.015, 0]} opacity={0.35} scale={42} blur={2.4} far={16} />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={46}
        minPolarAngle={0.28}
        maxPolarAngle={1.25}
        target={[0, 0, 0]}
      />
      <CameraRig selectedId={selectedId} resetSignal={resetSignal} controlsRef={controlsRef} />
    </>
  )
}

export default function PlanScene(props: {
  selectedId: number | null
  hoveredId: number | null
  onSelect: (id: number) => void
  onHover: (id: number | null) => void
  resetSignal: number
  fallback: ReactNode
}) {
  const { fallback, ...scene } = props
  return (
    <SceneBoundary fallback={fallback}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0.2, 22, 13.5], fov: 32, near: 0.1, far: 180 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ camera }) => {
          camera.up.set(0, 0, -1)
          camera.lookAt(0, 0, 0)
        }}
        onPointerMissed={() => scene.onSelect(-1)}
      >
        <Scene {...scene} onSelect={(id) => scene.onSelect(id)} />
      </Canvas>
    </SceneBoundary>
  )
}
