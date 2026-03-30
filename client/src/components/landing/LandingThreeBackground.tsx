import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type FloatingItem = {
	mesh: THREE.Object3D;
	baseY: number;
	spinX: number;
	spinY: number;
	driftSpeed: number;
	phase: number;
};

function usePrefersReducedMotion() {
	const query = useMemo(
		() =>
			typeof window !== "undefined"
				? window.matchMedia("(prefers-reduced-motion: reduce)")
				: null,
		[],
	);
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(
		() => query?.matches ?? false,
	);

	useEffect(() => {
		if (!query) return;
		const update = () => setPrefersReducedMotion(query.matches);
		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, [query]);

	return prefersReducedMotion;
}

function createChip(color: string, edgeColor: string) {
	const group = new THREE.Group();

	// Face — shiny metallic disc
	const faceGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.1, 48);
	const faceMat = new THREE.MeshStandardMaterial({
		color,
		metalness: 0.75,
		roughness: 0.18,
		emissive: color,
		emissiveIntensity: 0.06,
	});
	const face = new THREE.Mesh(faceGeo, faceMat);
	group.add(face);

	// Edge ring — gold metallic band
	const edgeGeo = new THREE.CylinderGeometry(0.58, 0.58, 0.1, 48, 1, true);
	const edgeMat = new THREE.MeshStandardMaterial({
		color: edgeColor,
		metalness: 0.9,
		roughness: 0.12,
		side: THREE.DoubleSide,
	});
	group.add(new THREE.Mesh(edgeGeo, edgeMat));

	// Inner inset ring (decorative stripe)
	const insetGeo = new THREE.TorusGeometry(0.38, 0.04, 8, 48);
	const insetMat = new THREE.MeshStandardMaterial({
		color: edgeColor,
		metalness: 0.85,
		roughness: 0.15,
	});
	const inset = new THREE.Mesh(insetGeo, insetMat);
	inset.rotation.x = Math.PI / 2;
	group.add(inset);

	return group;
}

function createCard() {
	const geometry = new THREE.BoxGeometry(1.0, 1.42, 0.04, 1, 1, 1);
	const materials = [
		// sides
		new THREE.MeshStandardMaterial({
			color: "#1e293b",
			metalness: 0.1,
			roughness: 0.9,
		}),
		new THREE.MeshStandardMaterial({
			color: "#1e293b",
			metalness: 0.1,
			roughness: 0.9,
		}),
		new THREE.MeshStandardMaterial({
			color: "#1e293b",
			metalness: 0.1,
			roughness: 0.9,
		}),
		new THREE.MeshStandardMaterial({
			color: "#1e293b",
			metalness: 0.1,
			roughness: 0.9,
		}),
		// front face
		new THREE.MeshStandardMaterial({
			color: "#f1f5f9",
			metalness: 0.05,
			roughness: 0.88,
			emissive: "#0f172a",
			emissiveIntensity: 0.05,
		}),
		// back face
		new THREE.MeshStandardMaterial({
			color: "#0f4c35",
			metalness: 0.2,
			roughness: 0.7,
		}),
	];
	return new THREE.Mesh(geometry, materials);
}

export function LandingThreeBackground() {
	const containerRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = usePrefersReducedMotion();

	useEffect(() => {
		if (prefersReducedMotion) return;
		const container = containerRef.current;
		if (!container) return;

		const webgl =
			document.createElement("canvas").getContext("webgl2") ??
			document.createElement("canvas").getContext("webgl");
		if (!webgl) return;

		const scene = new THREE.Scene();
		scene.fog = new THREE.Fog("#020617", 8, 26);

		const camera = new THREE.PerspectiveCamera(
			45,
			container.clientWidth / container.clientHeight,
			0.1,
			100,
		);
		camera.position.z = 12;

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			alpha: true,
			powerPreference: "high-performance",
		});
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
		renderer.setSize(container.clientWidth, container.clientHeight);
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		container.appendChild(renderer.domElement);

		const ambient = new THREE.AmbientLight("#99f6e4", 0.28);
		const fill = new THREE.DirectionalLight("#a7f3d0", 0.7);
		fill.position.set(4, 6, 7);
		const rim = new THREE.PointLight("#d97706", 0.55, 22);
		rim.position.set(-5, -3, 5);
		const topLight = new THREE.PointLight("#5eead4", 0.3, 18);
		topLight.position.set(0, 8, 3);
		scene.add(ambient, fill, rim, topLight);

		const items: FloatingItem[] = [];
		// Emerald, dark teal, forest green, gold — casino palette
		const chipDefs: [string, string][] = [
			["#059669", "#d97706"], // emerald / gold edge
			["#0f766e", "#fbbf24"], // teal / amber edge
			["#166534", "#f59e0b"], // forest / gold edge
			["#0e7490", "#fcd34d"], // dark cyan / yellow edge
		];

		for (let i = 0; i < 20; i += 1) {
			const def = chipDefs[i % chipDefs.length] ?? chipDefs[0];
			const mesh = i % 4 === 0 ? createCard() : createChip(def[0], def[1]);
			const radius = 3.4 + Math.random() * 5.2;
			const angle = Math.random() * Math.PI * 2;
			const baseY = -2.8 + Math.random() * 5.6;
			mesh.position.set(
				Math.cos(angle) * radius,
				baseY,
				-6 + Math.random() * 10,
			);
			mesh.rotation.set(
				Math.random() * Math.PI,
				Math.random() * Math.PI,
				Math.random() * Math.PI,
			);
			scene.add(mesh);
			items.push({
				mesh,
				baseY,
				spinX: 0.1 + Math.random() * 0.25,
				spinY: 0.08 + Math.random() * 0.2,
				driftSpeed: 0.35 + Math.random() * 0.45,
				phase: Math.random() * Math.PI * 2,
			});
		}

		const handleResize = () => {
			if (!containerRef.current) return;
			const width = containerRef.current.clientWidth;
			const height = containerRef.current.clientHeight;
			camera.aspect = width / height;
			camera.updateProjectionMatrix();
			renderer.setSize(width, height);
		};

		window.addEventListener("resize", handleResize);

		let frameId = 0;
		const clock = new THREE.Clock();

		const animate = () => {
			const elapsed = clock.getElapsedTime();
			for (const item of items) {
				item.mesh.rotation.x += item.spinX * 0.004;
				item.mesh.rotation.y += item.spinY * 0.004;
				item.mesh.position.y =
					item.baseY + Math.sin(elapsed * item.driftSpeed + item.phase) * 0.35;
			}
			camera.position.x = Math.sin(elapsed * 0.08) * 0.7;
			camera.lookAt(0, 0, 0);
			renderer.render(scene, camera);
			frameId = window.requestAnimationFrame(animate);
		};

		animate();

		return () => {
			window.cancelAnimationFrame(frameId);
			window.removeEventListener("resize", handleResize);
			for (const item of items) {
				scene.remove(item.mesh);
				item.mesh.traverse((obj) => {
					if (obj instanceof THREE.Mesh) {
						obj.geometry.dispose();
						if (Array.isArray(obj.material)) {
							for (const mat of obj.material) mat.dispose();
						} else {
							obj.material.dispose();
						}
					}
				});
			}
			renderer.dispose();
			container.removeChild(renderer.domElement);
		};
	}, [prefersReducedMotion]);

	return (
		<div
			className="landing-three-root"
			aria-hidden="true"
			data-reduced-motion={prefersReducedMotion}
			ref={containerRef}
		>
			<div className="landing-three-overlay" />
		</div>
	);
}
