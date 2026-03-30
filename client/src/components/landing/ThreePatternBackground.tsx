import { useEffect, useRef } from "react";
import * as THREE from "three";

export function ThreePatternBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 11);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    const pointCount = 110;
    const positions = new Float32Array(pointCount * 3);
    const pointData: Array<{ x: number; y: number; z: number; speed: number }> = [];

    for (let i = 0; i < pointCount; i++) {
      const x = (Math.random() - 0.5) * 12;
      const y = (Math.random() - 0.5) * 7;
      const z = (Math.random() - 0.5) * 5;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      pointData.push({ x, y, z, speed: 0.06 + Math.random() * 0.12 });
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      color: new THREE.Color("hsl(160, 70%, 55%)"),
      size: 0.06,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    root.add(points);

    const linePositions: number[] = [];
    for (let i = 0; i < pointCount - 1; i += 2) {
      linePositions.push(
        positions[i * 3],
        positions[i * 3 + 1],
        positions[i * 3 + 2],
        positions[(i + 1) * 3],
        positions[(i + 1) * 3 + 1],
        positions[(i + 1) * 3 + 2],
      );
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3),
    );
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("hsl(43, 85%, 55%)"),
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    root.add(lines);

    const ringMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("hsl(160, 65%, 60%)"),
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
    });
    const ringOne = new THREE.LineLoop(
      new THREE.CircleGeometry(2.8, 64).deleteAttribute("normal").deleteAttribute("uv"),
      ringMaterial,
    );
    ringOne.rotation.x = Math.PI * 0.35;
    ringOne.rotation.y = Math.PI * 0.15;
    root.add(ringOne);

    const ringTwo = new THREE.LineLoop(
      new THREE.CircleGeometry(4.2, 64).deleteAttribute("normal").deleteAttribute("uv"),
      ringMaterial.clone(),
    );
    ringTwo.material.opacity = 0.1;
    ringTwo.rotation.x = -Math.PI * 0.2;
    ringTwo.rotation.y = -Math.PI * 0.25;
    root.add(ringTwo);

    const resize = () => {
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const clock = new THREE.Clock();
    const pointsAttr = pointsGeometry.getAttribute("position") as THREE.BufferAttribute;
    const linesAttr = lineGeometry.getAttribute("position") as THREE.BufferAttribute;

    const tick = () => {
      const t = clock.getElapsedTime();
      for (let i = 0; i < pointData.length; i++) {
        const p = pointData[i];
        const nx = p.x + Math.sin(t * p.speed + i * 0.34) * 0.22;
        const ny = p.y + Math.cos(t * p.speed + i * 0.21) * 0.18;
        const nz = p.z + Math.sin(t * p.speed + i * 0.13) * 0.12;
        pointsAttr.setXYZ(i, nx, ny, nz);
      }
      pointsAttr.needsUpdate = true;

      let li = 0;
      for (let i = 0; i < pointData.length - 1; i += 2) {
        const a = i;
        const b = i + 1;
        linesAttr.setXYZ(li++, pointsAttr.getX(a), pointsAttr.getY(a), pointsAttr.getZ(a));
        linesAttr.setXYZ(li++, pointsAttr.getX(b), pointsAttr.getY(b), pointsAttr.getZ(b));
      }
      linesAttr.needsUpdate = true;

      root.rotation.y = Math.sin(t * 0.18) * 0.22;
      root.rotation.x = Math.cos(t * 0.12) * 0.06;
      root.position.z = Math.sin(t * 0.16) * 0.4;
      ringOne.rotation.z += 0.0014;
      ringTwo.rotation.z -= 0.001;

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      container.removeChild(renderer.domElement);

      pointsGeometry.dispose();
      pointsMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      ringOne.geometry.dispose();
      (ringOne.material as THREE.Material).dispose();
      ringTwo.geometry.dispose();
      (ringTwo.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
