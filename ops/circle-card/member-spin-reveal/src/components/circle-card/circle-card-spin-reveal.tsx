"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import styles from "./circle-card-spin-reveal.module.css";

const brandCoin = "/branding/circle-card-logo.jpg";

export function CircleCardSpinReveal({
  name,
  imageUrl,
  destination
}: {
  name: string;
  imageUrl: string | null;
  destination: string;
}) {
  const [portraitFailed, setPortraitFailed] = useState(false);
  const turning = useRef(false);
  const coin = useRef<HTMLSpanElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const portrait = portraitFailed ? null : imageUrl;

  useEffect(() => {
    function restoreIntro(event: PageTransitionEvent) {
      if (!event.persisted) return;
      turning.current = false;
      for (const animation of coin.current?.getAnimations?.() ?? []) animation.cancel();
    }
    window.addEventListener("pageshow", restoreIntro);
    return () => window.removeEventListener("pageshow", restoreIntro);
  }, []);

  async function spin(left = false) {
    if (turning.current) return;
    turning.current = true;

    const element = coin.current;
    if (element && typeof element.animate === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const turn = element.animate(
        [{ transform: "rotateY(0)" }, { transform: `rotateY(${left ? -810 : 810}deg)` }],
        { duration: 1250, easing: "cubic-bezier(.26,.05,.43,1)", fill: "forwards" }
      );
      await turn.finished.catch(() => undefined);
    }

    window.location.assign(destination);
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    void spin();
  }

  function recordPointer(event: PointerEvent<HTMLAnchorElement>) {
    if (!event.isPrimary || event.button !== 0 || turning.current) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function releasePointer(event: PointerEvent<HTMLAnchorElement>) {
    const start = gesture.current;
    if (start?.id !== event.pointerId) return;
    gesture.current = null;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) >= 32 && Math.abs(x) > Math.abs(y)) void spin(x < 0);
  }

  return (
    <section aria-labelledby="member-spin-title" className={styles.experience}>
      <h1 id="member-spin-title">Give it a spin<span>.</span></h1>
      <p className={styles.name}>{name}</p>
      <div className={styles.stage}>
        <a
          className={styles.trigger}
          href={destination}
          aria-label={`Spin to reveal ${name}’s Circle Card`}
          onClick={handleClick}
          onPointerDown={recordPointer}
          onPointerUp={releasePointer}
          onLostPointerCapture={() => { gesture.current = null; }}
        >
          <span ref={coin} className={styles.coin} aria-hidden="true">
            <span className={`${styles.face} ${styles.front}`}>
              <Image
                alt=""
                src={portrait || brandCoin}
                fill
                unoptimized
                draggable={false}
                onError={() => { if (portrait) setPortraitFailed(true); }}
                className={portrait ? styles.portrait : styles.mark}
              />
            </span>
            <span className={`${styles.face} ${styles.back}`}>
              <Image alt="" src={brandCoin} fill unoptimized draggable={false} className={styles.mark} />
            </span>
          </span>
        </a>
      </div>
      <p className={styles.hint}><span aria-hidden="true">↔</span> Tap or swipe the coin</p>
      <a className={styles.skip} href={destination}>Open card directly <span aria-hidden="true">→</span></a>
    </section>
  );
}
