"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { BufferAttribute, Group, LineSegments, MathUtils, Points } from "three";

type Pointer = { x: number; y: number };

function ParticleField({ pointer }: { pointer: Pointer }) {
  const pointsRef = useRef<Points>(null);
  const linesRef = useRef<LineSegments>(null);
  const groupRef = useRef<Group>(null);
  const count = 800;

  const { positions, pairs } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const p: number[] = [];
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 18;
      const t = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(t);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(t);
      pos[i * 3 + 2] = r * Math.cos(ph);
    }
    for (let i = 0; i < count; i++) {
      const b = i * 3;
      for (let j = 0; j < 2; j++) {
        let n = -1, nd = Infinity;
        for (let s = 0; s < 14; s++) {
          const c = Math.floor(Math.random() * count);
          if (c === i) continue;
          const ci = c * 3;
          const d = (pos[b] - pos[ci]) ** 2 + (pos[b + 1] - pos[ci + 1]) ** 2 + (pos[b + 2] - pos[ci + 2]) ** 2;
          if (d < nd) { nd = d; n = c; }
        }
        if (n >= 0) p.push(i, n);
      }
    }
    return { positions: pos, pairs: p };
  }, []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!pointsRef.current || !linesRef.current || !groupRef.current) return;
    groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, pointer.x * 0.12, 0.02);
    groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, -pointer.y * 0.08, 0.02);
    const pp = pointsRef.current.geometry.attributes.position as BufferAttribute;
    const lp = linesRef.current.geometry.attributes.position as BufferAttribute;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      pp.array[idx] = positions[idx] + Math.sin(t * 0.2 + i * 0.016) * 0.25;
      pp.array[idx + 1] = positions[idx + 1] + Math.cos(t * 0.18 + i * 0.013) * 0.2;
      pp.array[idx + 2] = positions[idx + 2] + Math.sin(t * 0.15 + i * 0.01) * 0.18;
    }
    let w = 0;
    for (let i = 0; i < pairs.length; i += 2) {
      const a = pairs[i] * 3, b = pairs[i + 1] * 3;
      lp.array[w] = pp.array[a]; lp.array[w + 1] = pp.array[a + 1]; lp.array[w + 2] = pp.array[a + 2];
      lp.array[w + 3] = pp.array[b]; lp.array[w + 4] = pp.array[b + 1]; lp.array[w + 5] = pp.array[b + 2];
      w += 6;
    }
    pp.needsUpdate = true;
    lp.needsUpdate = true;
  });

  const linePos = useMemo(() => new Float32Array(pairs.length * 3), [pairs.length]);

  return (
    <group ref={groupRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial size={0.06} sizeAttenuation transparent opacity={0.35} color="#0284C7" depthWrite={false} />
      </points>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={linePos} count={linePos.length / 3} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial transparent opacity={0.06} color="#0EA5E9" depthWrite={false} />
      </lineSegments>
    </group>
  );
}

export default function HeroParticlesScene({ pointer }: { pointer: Pointer }) {
  return (
    <Canvas dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0, 16], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <ParticleField pointer={pointer} />
    </Canvas>
  );
}
