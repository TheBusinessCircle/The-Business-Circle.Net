"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from "react";
import { usePathname } from "next/navigation";
import { Pause, Play, Square, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ResourceNarrationItem = {
  id: string;
  label: string;
  plainText: string;
  type: "opening" | "section";
};

type ResourceNarratorContextValue = {
  activeSectionId: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  isSupported: boolean;
  playbackRate: number;
  selectedVoiceURI: string;
  availableVoices: SpeechSynthesisVoice[];
  firstPlayableSectionId: string | null;
  startFromTop: () => void;
  startFromSection: (sectionId: string) => void;
  togglePlayback: () => void;
  stopPlayback: () => void;
  setPlaybackRate: (value: number) => void;
  setSelectedVoiceURI: (value: string) => void;
  hasPlayableSection: (sectionId: string) => boolean;
};

const PLAYBACK_RATE_STORAGE_KEY = "business-circle-resource-narrator-rate";
const SELECTED_VOICE_STORAGE_KEY = "business-circle-resource-narrator-voice";

const ResourceNarratorContext = createContext<ResourceNarratorContextValue | null>(null);

function useResourceNarratorContext() {
  const value = useContext(ResourceNarratorContext);

  if (!value) {
    throw new Error("Resource narrator components must be used inside ResourceNarratorProvider.");
  }

  return value;
}

function getNarrationVoice(
  voices: SpeechSynthesisVoice[],
  selectedVoiceURI: string
) {
  return (
    voices.find((voice) => voice.voiceURI === selectedVoiceURI) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb")) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ??
    voices[0] ??
    null
  );
}

function isSectionInView(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  return bounds.top >= 96 && bounds.bottom <= window.innerHeight - 32;
}

export function ResourceNarratorProvider({
  items,
  children
}: PropsWithChildren<{
  items: ResourceNarrationItem[];
}>) {
  const pathname = usePathname();
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const sequenceRef = useRef<ResourceNarrationItem[]>([]);
  const playbackRunRef = useRef(0);
  const itemsRef = useRef(items);

  itemsRef.current = items;

  const firstPlayableSectionId = useMemo(
    () => items.find((item) => item.plainText.trim().length > 0)?.id ?? null,
    [items]
  );

  const stopPlayback = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      playbackRunRef.current += 1;
      window.speechSynthesis.cancel();
    }

    sequenceRef.current = [];
    setIsPlaying(false);
    setIsPaused(false);
    setActiveSectionId(null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const supported =
      typeof window.speechSynthesis !== "undefined" &&
      typeof window.SpeechSynthesisUtterance !== "undefined";

    setIsSupported(supported);

    if (!supported) {
      return;
    }

    const storedRate = window.localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
    const parsedRate = storedRate ? Number.parseFloat(storedRate) : Number.NaN;
    if (Number.isFinite(parsedRate) && parsedRate >= 0.75 && parsedRate <= 1.5) {
      setPlaybackRateState(parsedRate);
    }

    const storedVoice = window.localStorage.getItem(SELECTED_VOICE_STORAGE_KEY);
    if (storedVoice) {
      setSelectedVoiceURIState(storedVoice);
    }

    const synth = window.speechSynthesis;

    const updateVoices = () => {
      const voices = synth.getVoices();
      setAvailableVoices(voices);
      setSelectedVoiceURIState((currentVoiceURI) => {
        if (currentVoiceURI && voices.some((voice) => voice.voiceURI === currentVoiceURI)) {
          return currentVoiceURI;
        }

        const nextVoice = getNarrationVoice(voices, currentVoiceURI);
        return nextVoice?.voiceURI ?? "";
      });
    };

    updateVoices();
    synth.addEventListener?.("voiceschanged", updateVoices);

    return () => {
      synth.removeEventListener?.("voiceschanged", updateVoices);
      synth.cancel();
    };
  }, []);

  useEffect(() => {
    stopPlayback();
  }, [pathname, stopPlayback]);

  const playSequenceFromIndex = useCallback(
    (startIndex: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      const playableItems = itemsRef.current.filter((item) => item.plainText.trim().length > 0);
      if (!playableItems.length || startIndex < 0 || startIndex >= playableItems.length) {
        return;
      }

      const synth = window.speechSynthesis;
      const currentRun = playbackRunRef.current + 1;
      playbackRunRef.current = currentRun;
      sequenceRef.current = playableItems.slice(startIndex);
      synth.cancel();
      setIsPlaying(true);
      setIsPaused(false);

      const speakNext = (sequenceIndex: number) => {
        if (playbackRunRef.current !== currentRun) {
          return;
        }

        const nextItem = sequenceRef.current[sequenceIndex];

        if (!nextItem) {
          sequenceRef.current = [];
          setIsPlaying(false);
          setIsPaused(false);
          setActiveSectionId(null);
          return;
        }

        setActiveSectionId(nextItem.id);

        const element = document.getElementById(nextItem.id);
        if (element && !isSectionInView(element)) {
          element.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }

        const utterance = new SpeechSynthesisUtterance(nextItem.plainText);
        utterance.rate = playbackRate;
        const selectedVoice = getNarrationVoice(availableVoices, selectedVoiceURI);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        }

        utterance.onend = () => {
          if (playbackRunRef.current !== currentRun) {
            return;
          }

          speakNext(sequenceIndex + 1);
        };

        utterance.onerror = () => {
          if (playbackRunRef.current !== currentRun) {
            return;
          }

          sequenceRef.current = [];
          setIsPlaying(false);
          setIsPaused(false);
          setActiveSectionId(null);
          synth.cancel();
        };

        synth.speak(utterance);
      };

      speakNext(0);
    },
    [availableVoices, playbackRate, selectedVoiceURI]
  );

  const startFromSection = useCallback(
    (sectionId: string) => {
      const playableItems = itemsRef.current.filter((item) => item.plainText.trim().length > 0);
      const startIndex = playableItems.findIndex((item) => item.id === sectionId);

      if (startIndex === -1) {
        return;
      }

      playSequenceFromIndex(startIndex);
    },
    [playSequenceFromIndex]
  );

  const startFromTop = useCallback(() => {
    const firstPlayableItem = itemsRef.current.find((item) => item.plainText.trim().length > 0);

    if (!firstPlayableItem) {
      return;
    }

    startFromSection(firstPlayableItem.id);
  }, [startFromSection]);

  const togglePlayback = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    if (isPlaying && !isPaused) {
      synth.pause();
      setIsPaused(true);
      return;
    }

    if (isPlaying && isPaused) {
      synth.resume();
      setIsPaused(false);
      return;
    }

    if (activeSectionId) {
      startFromSection(activeSectionId);
      return;
    }

    startFromTop();
  }, [activeSectionId, isPaused, isPlaying, startFromSection, startFromTop]);

  const setPlaybackRate = useCallback(
    (value: number) => {
      setPlaybackRateState(value);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(value));
      }

      if (activeSectionId && (isPlaying || isPaused)) {
        startFromSection(activeSectionId);
      }
    },
    [activeSectionId, isPaused, isPlaying, startFromSection]
  );

  const setSelectedVoiceURI = useCallback(
    (value: string) => {
      setSelectedVoiceURIState(value);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(SELECTED_VOICE_STORAGE_KEY, value);
      }

      if (activeSectionId && (isPlaying || isPaused)) {
        startFromSection(activeSectionId);
      }
    },
    [activeSectionId, isPaused, isPlaying, startFromSection]
  );

  const value = useMemo<ResourceNarratorContextValue>(
    () => ({
      activeSectionId,
      isPlaying,
      isPaused,
      isSupported,
      playbackRate,
      selectedVoiceURI,
      availableVoices,
      firstPlayableSectionId,
      startFromTop,
      startFromSection,
      togglePlayback,
      stopPlayback,
      setPlaybackRate,
      setSelectedVoiceURI,
      hasPlayableSection: (sectionId: string) =>
        items.some((item) => item.id === sectionId && item.plainText.trim().length > 0)
    }),
    [
      activeSectionId,
      availableVoices,
      firstPlayableSectionId,
      isPaused,
      isPlaying,
      isSupported,
      items,
      playbackRate,
      selectedVoiceURI,
      setPlaybackRate,
      setSelectedVoiceURI,
      startFromSection,
      startFromTop,
      stopPlayback,
      togglePlayback
    ]
  );

  return (
    <ResourceNarratorContext.Provider value={value}>{children}</ResourceNarratorContext.Provider>
  );
}

export function ResourceNarratorCard({
  sectionId,
  className,
  children
}: PropsWithChildren<{
  sectionId: string;
  className?: string;
}>) {
  const { activeSectionId } = useResourceNarratorContext();
  const active = activeSectionId === sectionId;

  return (
    <Card
      id={sectionId}
      className={cn(
        "scroll-mt-28 border-silver/16 bg-card/68",
        active
          ? "border-gold/26 bg-gradient-to-br from-gold/8 via-card/78 to-card/70 shadow-gold-soft"
          : "",
        className
      )}
    >
      {children}
    </Card>
  );
}

export function ResourceNarratorPrimaryControls() {
  const {
    activeSectionId,
    availableVoices,
    firstPlayableSectionId,
    hasPlayableSection,
    isPaused,
    isPlaying,
    isSupported,
    playbackRate,
    selectedVoiceURI,
    setPlaybackRate,
    setSelectedVoiceURI,
    startFromTop,
    stopPlayback,
    togglePlayback
  } = useResourceNarratorContext();

  if (!isSupported) {
    return (
      <p className="text-xs leading-relaxed text-muted">
        Narration is unavailable in this browser.
      </p>
    );
  }

  const narratorActive = Boolean(activeSectionId && hasPlayableSection(activeSectionId));

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant={narratorActive ? "secondary" : "outline"}
        size="sm"
        onClick={startFromTop}
        disabled={!firstPlayableSectionId}
        aria-label="Start narration from the beginning"
        className={cn(
          "gap-2 border-silver/16 bg-background/24 hover:border-gold/28",
          narratorActive ? "border-gold/24 bg-gold/10 text-foreground" : ""
        )}
      >
        <Volume2 size={14} />
        Narrator
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={togglePlayback}
        disabled={!firstPlayableSectionId}
        aria-label={
          isPlaying ? (isPaused ? "Resume narration" : "Pause narration") : "Play narration"
        }
        className="gap-2 text-silver hover:bg-background/24 hover:text-foreground"
      >
        {isPlaying && !isPaused ? <Pause size={14} /> : <Play size={14} />}
        <span className="sr-only">
          {isPlaying ? (isPaused ? "Resume" : "Pause") : "Play"}
        </span>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={stopPlayback}
        disabled={!isPlaying && !isPaused}
        aria-label="Stop narration"
        className="gap-2 text-silver hover:bg-background/24 hover:text-foreground"
      >
        <Square size={14} />
        <span className="sr-only">Stop</span>
      </Button>

      <Select
        aria-label="Narration speed"
        value={String(playbackRate)}
        onChange={(event) => setPlaybackRate(Number.parseFloat(event.target.value))}
        className="h-8 w-[5.6rem] rounded-lg border-silver/16 bg-background/24 px-2 text-xs text-silver"
      >
        <option value="0.75">0.75x</option>
        <option value="1">1x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
      </Select>

      {availableVoices.length > 1 ? (
        <Select
          aria-label="Narration voice"
          value={selectedVoiceURI}
          onChange={(event) => setSelectedVoiceURI(event.target.value)}
          className="h-8 w-[9.5rem] rounded-lg border-silver/16 bg-background/24 px-2 text-xs text-silver"
        >
          {availableVoices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name}
            </option>
          ))}
        </Select>
      ) : null}
    </div>
  );
}

export function ResourceNarratorSectionButton({
  sectionId,
  label
}: {
  sectionId: string;
  label: string;
}) {
  const {
    activeSectionId,
    hasPlayableSection,
    isPaused,
    isPlaying,
    isSupported,
    startFromSection,
    stopPlayback,
    togglePlayback
  } = useResourceNarratorContext();

  if (!isSupported) {
    return null;
  }

  const playable = hasPlayableSection(sectionId);
  const active = activeSectionId === sectionId;

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant={active ? "secondary" : "ghost"}
        size="sm"
        onClick={() => startFromSection(sectionId)}
        disabled={!playable}
        aria-label={playable ? `Narrate from ${label}` : `Narration unavailable for ${label}`}
        aria-pressed={active}
        className={cn(
          "h-8 w-8 rounded-lg p-0 text-silver hover:bg-background/24 hover:text-foreground",
          active ? "border border-gold/22 bg-gold/10 text-foreground" : ""
        )}
      >
        <Volume2 size={14} />
        <span className="sr-only">{active ? `Narrating ${label}` : `Narrate ${label}`}</span>
      </Button>

      <Button
        type="button"
        variant={active ? "secondary" : "ghost"}
        size="sm"
        onClick={togglePlayback}
        disabled={!active || !isPlaying}
        aria-label={
          active
            ? isPaused
              ? `Resume narration for ${label}`
              : `Pause narration for ${label}`
            : `Pause narration unavailable for ${label}`
        }
        className={cn(
          "h-8 w-8 rounded-lg p-0 text-silver hover:bg-background/24 hover:text-foreground",
          active ? "border border-silver/16 bg-background/24 text-foreground" : ""
        )}
      >
        {active && isPlaying && !isPaused ? <Pause size={14} /> : <Play size={14} />}
        <span className="sr-only">
          {active ? (isPaused ? `Resume ${label}` : `Pause ${label}`) : `Pause unavailable for ${label}`}
        </span>
      </Button>

      <Button
        type="button"
        variant={active ? "secondary" : "ghost"}
        size="sm"
        onClick={stopPlayback}
        disabled={!active || (!isPlaying && !isPaused)}
        aria-label={active ? `Stop narration for ${label}` : `Stop narration unavailable for ${label}`}
        className={cn(
          "h-8 w-8 rounded-lg p-0 text-silver hover:bg-background/24 hover:text-foreground",
          active ? "border border-silver/16 bg-background/24 text-foreground" : ""
        )}
      >
        <Square size={14} />
        <span className="sr-only">
          {active ? `Stop ${label}` : `Stop unavailable for ${label}`}
        </span>
      </Button>
    </div>
  );
}
