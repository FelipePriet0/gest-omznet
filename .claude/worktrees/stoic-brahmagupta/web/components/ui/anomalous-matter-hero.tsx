'use client';

import React, { Suspense, useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import * as THREE from "three";

function readCssColor(variableName: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

  if (!raw) return fallback;
  if (raw.startsWith("#") || raw.startsWith("rgb") || raw.startsWith("hsl")) {
    return raw;
  }
  return fallback;
}

export function GenerativeArtScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const lightRef = useRef<any>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.z = 3;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const baseColor = new THREE.Color(
      readCssColor("--hero-sky-300", "#14b8a6")
    );

    const geometry = new THREE.IcosahedronGeometry(1.2, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointLightPosition: { value: new THREE.Vector3(0, 0, 5) },
        baseColor: { value: baseColor },
      },
      vertexShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;

        vec3 mod289(vec3 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 mod289(vec4 x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
        vec4 permute(vec4 x){return mod289(((x * 34.0) + 1.0) * x);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

        float snoise(vec3 v){
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          vec3 g  = step(x0.yzx, x0.xyz);
          vec3 l  = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);

          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;

          i = mod289(i);
          vec4 p = permute(permute(permute(
                      i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          vec4 x = floor(j * ns.z);
          vec4 y = floor(j - 7.0 * x);
          vec4 x_ = x * ns.x + ns.yyyy;
          vec4 y_ = y * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x_) - abs(y_);

          vec4 b0 = vec4(x_.xy, y_.xy);
          vec4 b1 = vec4(x_.zw, y_.zw);
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);

          vec4 norm = taylorInvSqrt(vec4(
            dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)
          ));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(
            dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)
          ), 0.0);
          m = m * m;
          return 42.0 * dot(m * m, vec4(
            dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)
          ));
        }

        void main(){
          vec3 displacedPosition = position + normal * snoise(position * 2.0 + time * 0.5) * 0.2;
          vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);

          vPosition = worldPosition.xyz;
          vNormal = normalize(normalMatrix * normal);

          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 baseColor;
        uniform vec3 pointLightPosition;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main(){
          vec3 lightDirection = normalize(pointLightPosition - vPosition);
          float diffuse = max(dot(normalize(vNormal), lightDirection), 0.0);
          float fresnel = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 3.0);

          vec3 color = baseColor * (diffuse * 0.8 + 0.35) + fresnel * baseColor * 0.6;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      wireframe: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(0, 0, 5);
    lightRef.current = pointLight;
    scene.add(pointLight);

    let frameId = 0;
    const animate = (time: number) => {
      material.uniforms.time.value = time * 0.0008;
      mesh.rotation.y += 0.001;
      mesh.rotation.x += 0.0004;
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!mount) return;
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;
      const vector = new THREE.Vector3(x, y, 0.5).unproject(camera);
      const direction = vector.sub(camera.position).normalize();
      const distance = -camera.position.z / direction.z;
      const position = camera.position.clone().add(direction.multiplyScalar(distance));

      lightRef.current?.position.copy(position);
      material.uniforms.pointLightPosition.value = position;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);

      scene.remove(mesh);
      scene.remove(pointLight);
      geometry.dispose();
      material.dispose();
      renderer.dispose();

      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={cn("absolute inset-0 h-full w-full", className)} />;
}

type HeroProps = {
  title?: string;
  subtitle?: string;
  description?: string;
  logoSrc?: string;
  logoAlt?: string;
  logoSize?: number;
  className?: string;
};

export function AnomalousMatterHero({
  title = "Observatório Operacional",
  subtitle = "Energia em fluxo constante para decisões melhores.",
  description = "Visual interativo sincronizado com o pulso de dados da MZNET. Conecte-se, ajuste o foco e mantenha o time na mesma frequência.",
  logoSrc = "/mznet-logo.png",
  logoAlt = "Logotipo MZNET",
  logoSize = 208,
  className,
}: HeroProps) {
  return (
    <section
      role="banner"
      className={cn(
        "relative flex h-full min-h-[420px] w-full items-center justify-center overflow-hidden",
        "bg-[rgb(0,0,0)] text-[hsl(var(--hero-foreground,0_0%_100%))]",
        "shadow-[0_0_60px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
        <GenerativeArtScene />
      </Suspense>

      <div className="absolute inset-0 bg-gradient-to-br from-black via-emerald-950/70 to-black/30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.35),transparent_55%)]" />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative flex h-[300px] w-[300px] items-center justify-center rounded-full bg-emerald-500/10 backdrop-blur-sm ring-1 ring-emerald-300/40">
          <Image
            src={logoSrc}
            alt={logoAlt}
            width={logoSize}
            height={logoSize}
            priority
            className="animate-logo-float object-contain drop-shadow-[0_0_35px_rgba(16,185,129,0.75)]"
          />
          <div className="absolute inset-4 rounded-full border border-emerald-300/30" />
          <div className="absolute inset-0 rounded-full animate-pulse-slow border border-emerald-400/20" />
        </div>
      </div>

      <div className="relative z-20 flex h-full w-full max-w-3xl flex-col items-center justify-end gap-6 px-8 pb-16 text-center md:pb-20">
        <div className="space-y-4 text-balance animate-fade-in-long">
          <h1 className="text-sm font-mono uppercase tracking-[0.35em] text-emerald-300/80">
            {title}
          </h1>
          <p className="text-3xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            {subtitle}
          </p>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-emerald-100/70">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
