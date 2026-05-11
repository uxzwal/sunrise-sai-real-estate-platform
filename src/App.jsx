import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { siteConfig } from './app/config/site';

gsap.registerPlugin(ScrollTrigger);

const MODEL_PATH = '/models/modern_city_block.glb';

function useMotionSettings() {
  const [settings, setSettings] = useState({ reduced: false, coarse: false, lowPower: false });

  useEffect(() => {
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarseQuery = window.matchMedia('(pointer: coarse)');

    const update = () => {
      const lowPower = coarseQuery.matches || (navigator.hardwareConcurrency || 8) <= 4;
      setSettings({ reduced: reducedQuery.matches, coarse: coarseQuery.matches, lowPower });
    };

    update();
    reducedQuery.addEventListener('change', update);
    coarseQuery.addEventListener('change', update);

    return () => {
      reducedQuery.removeEventListener('change', update);
      coarseQuery.removeEventListener('change', update);
    };
  }, []);

  return settings;
}

function CityModel({ lowPower }) {
  const group = useRef();
  const model = useGLTF(MODEL_PATH);

  useEffect(() => {
    if (group.current) {
      group.current.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = !lowPower;
          child.receiveShadow = !lowPower;
        }
      });
    }
  }, [lowPower]);

  return (
    <group ref={group} scale={0.9} position={[0, -0.85, 0]}>
      <primitive object={model.scene} />
    </group>
  );
}

function FallbackBlock() {
  return (
    <mesh position={[0, -0.2, 0]}>
      <boxGeometry args={[1.8, 0.9, 1.8]} />
      <meshStandardMaterial color="#5a5a5a" metalness={0.35} roughness={0.55} />
    </mesh>
  );
}

function Scene({ pointerTarget, reducedMotion, lowPower, sceneRefs, onReady }) {
  const modelRig = useRef();
  const smoothPointer = useMemo(() => new THREE.Vector2(0, 0), []);
  const lastFrameTime = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    if (sceneRefs.current) {
      sceneRefs.current.camera = camera;
      sceneRefs.current.modelRig = modelRig.current;
      onReady();
    }
  }, [camera, onReady, sceneRefs]);

  useFrame((state) => {
    const now = state.clock.getElapsedTime();
    if (now - lastFrameTime.current < 1 / 45) return;
    lastFrameTime.current = now;

    smoothPointer.lerp(pointerTarget.current, reducedMotion ? 0.04 : 0.1);

    if (modelRig.current && !reducedMotion) {
      const intensity = lowPower ? 0.08 : 0.16;
      modelRig.current.rotation.y = THREE.MathUtils.lerp(modelRig.current.rotation.y, smoothPointer.x * intensity, 0.12);
      modelRig.current.rotation.x = THREE.MathUtils.lerp(modelRig.current.rotation.x, -smoothPointer.y * intensity * 0.7, 0.12);
    }

    if (!reducedMotion) {
      const parallax = lowPower ? 0.08 : 0.18;
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, smoothPointer.x * parallax, 0.08);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, smoothPointer.y * parallax * 0.4, 0.08);
    }
  });

  return (
    <>
      <color attach="background" args={["#0f0f12"]} />

      <ambientLight intensity={lowPower ? 0.7 : 0.5} color="#f4e0b3" />
      <directionalLight position={[2, 4, 2]} intensity={1.4} color="#fff7df" />
      <spotLight position={[-2, 3, 4]} intensity={0.8} angle={0.45} penumbra={0.5} color="#c5a880" />

      <group ref={modelRig}>
        <Suspense
          fallback={
            <Html center>
              <div className="loader">Loading city model...</div>
            </Html>
          }
        >
          <CityModel lowPower={lowPower} />
        </Suspense>
      </group>

      <FallbackBlock />
      {!lowPower && <Environment preset="city" />}

      {!lowPower && !reducedMotion && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.45} luminanceThreshold={0.28} luminanceSmoothing={0.9} mipmapBlur />
        </EffectComposer>
      )}
    </>
  );
}

function OverlayContent() {
  return (
    <div className="overlay">
      <section className="panel hero" data-scroll-marker="hero">
        <p className="kicker">Sunrise Sai Developers Pvt. Ltd.</p>
        <h1>Innovation Beyond Boundaries</h1>
      </section>

      <section className="panel projects" data-scroll-marker="projects">
        <h2>Project Showcase</h2>
        <div className="cards">
          <article className="glass-card">
            <h3>Sunrise Ashoka Complex</h3>
            <p>Digha AIIMS Road</p>
          </article>
          <article className="glass-card">
            <h3>Sunrise Sai Enclave</h3>
            <p>Danapur Khagaul Road</p>
          </article>
          <article className="glass-card">
            <h3>Sunrise Rashmi Heights</h3>
            <p>Danapur Khagaul Road</p>
          </article>
          <article className="glass-card">
            <h3>Sunrise Rupaspur City</h3>
            <p>Rupaspur</p>
          </article>
        </div>
      </section>

      <section className="panel contact" data-scroll-marker="contact">
        <h2>Corporate Office</h2>
        <p>Patna, Bihar</p>
        <p>
          <a href="tel:+918102773315">+91 8102773315</a> · <a href="tel:+919123225417">+91 9123225417</a>
        </p>
        <small>{siteConfig.description}</small>
      </section>
    </div>
  );
}

function CustomCursor({ enabled }) {
  const cursorRef = useRef();

  useEffect(() => {
    if (!enabled) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    const onMove = (event) => {
      x = event.clientX;
      y = event.clientY;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const onHover = (event) => {
      if (!cursorRef.current) return;
      const interactive = event.target.closest('a, button, .glass-card');
      cursorRef.current.classList.toggle('cursor-hover', Boolean(interactive));
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerover', onHover);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onHover);
    };
  }, [enabled]);

  if (!enabled) return null;
  return <div ref={cursorRef} className="custom-cursor" aria-hidden="true" />;
}

export default function App() {
  const sceneRefs = useRef({ camera: null, modelRig: null });
  const [sceneReady, setSceneReady] = useState(false);
  const pointerTarget = useRef(new THREE.Vector2(0, 0));
  const { reduced, coarse, lowPower } = useMotionSettings();

  useEffect(() => {
    const preload = () => {
      try {
        useGLTF.preload(MODEL_PATH);
      } catch {
        return undefined;
      }
      return undefined;
    };

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload);
      return () => window.cancelIdleCallback(idleId);
    }

    const timeout = window.setTimeout(preload, 400);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (reduced) return undefined;

    const onPointerMove = (event) => {
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = (event.clientY / window.innerHeight) * 2 - 1;
      pointerTarget.current.set(x, y);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, [reduced]);

  useEffect(() => {
    if (reduced || !sceneReady || !sceneRefs.current.camera) return undefined;

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 0.95,
      touchMultiplier: 0.85,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const ticker = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(ticker);
    gsap.ticker.lagSmoothing(0);

    const cameraTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: '.overlay',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      },
    });

    cameraTimeline
      .to(sceneRefs.current.camera.position, { z: 3.2, x: 0.3, y: 0.1, ease: 'none' })
      .to(sceneRefs.current.camera.rotation, { y: -0.25, x: 0.02, ease: 'none' }, '<')
      .to(sceneRefs.current.camera.position, { z: 2.7, x: -0.35, y: 0.2, ease: 'none' })
      .to(sceneRefs.current.camera.rotation, { y: 0.22, x: -0.02, ease: 'none' }, '<')
      .to(sceneRefs.current.camera.position, { z: 3.0, x: 0, y: 0, ease: 'none' })
      .to(sceneRefs.current.camera.rotation, { y: 0, x: 0, ease: 'none' }, '<');

    return () => {
      cameraTimeline.kill();
      gsap.ticker.remove(ticker);
      lenis.destroy();
    };
  }, [reduced, sceneReady]);

  return (
    <main className={`app-shell ${!coarse ? 'hide-native-cursor' : ''}`}>
      <div className="background-layer" aria-hidden="true">
        <Canvas
          dpr={lowPower ? 1 : [1, 1.5]}
          gl={{ antialias: !lowPower, alpha: false, powerPreference: lowPower ? 'low-power' : 'high-performance' }}
          camera={{ position: [0, 0.1, 4], fov: 40 }}
        >
          <Scene
            pointerTarget={pointerTarget}
            reducedMotion={reduced}
            lowPower={lowPower}
            sceneRefs={sceneRefs}
            onReady={() => setSceneReady(true)}
          />
        </Canvas>
      </div>

      <div className="foreground-layer">
        <OverlayContent />
      </div>

      <CustomCursor enabled={!coarse && !reduced} />
    </main>
  );
}
