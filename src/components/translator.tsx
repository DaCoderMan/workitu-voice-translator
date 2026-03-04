"use client";

import { useCallback, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  ArrowRightLeft,
  Volume2,
  VolumeOff,
  Copy,
  Check,
  Trash2,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";

type Direction = "he-en" | "en-he";

interface HistoryEntry {
  id: number;
  source: string;
  translated: string;
  direction: Direction;
}

const LANG_CONFIG = {
  "he-en": {
    sourceLang: "HE",
    targetLang: "EN",
    sourceLabel: "Hebrew",
    targetLabel: "English",
    sourceFlag: "\u{1F1EE}\u{1F1F1}",
    targetFlag: "\u{1F1EC}\u{1F1E7}",
    speechLang: "he-IL",
    targetSpeechLang: "en-US",
  },
  "en-he": {
    sourceLang: "EN",
    targetLang: "HE",
    sourceLabel: "English",
    targetLabel: "Hebrew",
    sourceFlag: "\u{1F1EC}\u{1F1E7}",
    targetFlag: "\u{1F1EE}\u{1F1F1}",
    speechLang: "en-US",
    targetSpeechLang: "he-IL",
  },
};

export function Translator() {
  const [direction, setDirection] = useState<Direction>("he-en");
  const [sourceText, setSourceText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const nextId = useRef(1);

  const config = LANG_CONFIG[direction];
  const { isSpeaking, speak, stop: stopSpeaking } = useSpeechSynthesis();

  const translate = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setIsTranslating(true);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            sourceLang: config.sourceLang,
            targetLang: config.targetLang,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Translation failed");
        }

        const data = await res.json();
        setTranslatedText(data.translatedText);

        setHistory((prev) => [
          {
            id: nextId.current++,
            source: text,
            translated: data.translatedText,
            direction,
          },
          ...prev.slice(0, 9),
        ]);

        if (autoSpeak && data.translatedText) {
          speak(data.translatedText, config.targetSpeechLang);
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Translation failed"
        );
      } finally {
        setIsTranslating(false);
      }
    },
    [config, direction, autoSpeak, speak]
  );

  const handleSpeechResult = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (isFinal) {
        setSourceText((prev) => {
          const updated = prev ? prev + " " + transcript : transcript;
          return updated;
        });
        setInterimText("");
      } else {
        setInterimText(transcript);
      }
    },
    []
  );

  const handleSpeechEnd = useCallback(() => {
    setSourceText((current) => {
      if (current.trim()) {
        translate(current.trim());
      }
      return current;
    });
    setInterimText("");
  }, [translate]);

  const { isListening, isSupported, start, stop } = useSpeechRecognition({
    lang: config.speechLang,
    onResult: handleSpeechResult,
    onEnd: handleSpeechEnd,
  });

  const toggleListening = () => {
    if (isListening) {
      stop();
    } else {
      setSourceText("");
      setTranslatedText("");
      setInterimText("");
      start();
    }
  };

  const swapDirection = () => {
    setDirection((d) => (d === "he-en" ? "en-he" : "he-en"));
    setSourceText("");
    setTranslatedText("");
    setInterimText("");
  };

  const copyTranslation = async () => {
    if (!translatedText) return;
    await navigator.clipboard.writeText(translatedText);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const speakTranslation = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (translatedText) {
      speak(translatedText, config.targetSpeechLang);
    }
  };

  if (!isSupported) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center">
          <MicOff className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-lg font-semibold">
            Speech Recognition Not Supported
          </h2>
          <p className="text-sm text-muted-foreground">
            Please use Chrome, Edge, or Safari for voice translation.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Languages className="h-6 w-6 text-amber-500" />
            <h1 className="text-lg font-bold">Bee Translator</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoSpeak((v) => !v)}
            className="gap-2"
          >
            {autoSpeak ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeOff className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              Auto-speak {autoSpeak ? "on" : "off"}
            </span>
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
        {/* Language selector */}
        <div className="flex items-center justify-center gap-3">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
            {config.sourceFlag} {config.sourceLabel}
          </Badge>
          <Button
            variant="outline"
            size="icon"
            onClick={swapDirection}
            className="h-9 w-9 rounded-full"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-sm">
            {config.targetFlag} {config.targetLabel}
          </Badge>
        </div>

        {/* Translation panels */}
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
          {/* Source panel */}
          <Card className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {config.sourceFlag} {config.sourceLabel}
              </span>
              {sourceText && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setSourceText("");
                    setInterimText("");
                    setTranslatedText("");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div
              className="min-h-[120px] flex-1 text-base leading-relaxed"
              dir={direction === "he-en" ? "rtl" : "ltr"}
            >
              {sourceText || interimText ? (
                <>
                  <span>{sourceText}</span>
                  {interimText && (
                    <span className="text-muted-foreground">{interimText}</span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">
                  {isListening
                    ? "Listening..."
                    : "Tap the microphone to start speaking"}
                </span>
              )}
            </div>
          </Card>

          {/* Target panel */}
          <Card className="flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {config.targetFlag} {config.targetLabel}
              </span>
              <div className="flex gap-1">
                {translatedText && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={speakTranslation}
                    >
                      {isSpeaking ? (
                        <VolumeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={copyTranslation}
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div
              className="min-h-[120px] flex-1 text-base leading-relaxed"
              dir={direction === "en-he" ? "rtl" : "ltr"}
            >
              {isTranslating ? (
                <span className="text-muted-foreground">Translating...</span>
              ) : translatedText ? (
                <span>{translatedText}</span>
              ) : (
                <span className="text-muted-foreground">
                  Translation will appear here
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* Mic button */}
        <div className="flex flex-col items-center gap-3 pb-4">
          <button
            onClick={toggleListening}
            className={`flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200 ${
              isListening
                ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-110"
                : "bg-amber-500 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)]"
            }`}
          >
            {isListening ? (
              <MicOff className="h-8 w-8 text-white" />
            ) : (
              <Mic className="h-8 w-8 text-white" />
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            {isListening
              ? "Tap to stop"
              : "Tap to speak"}
          </p>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Recent translations
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setHistory([])}
              >
                Clear
              </Button>
            </div>
            <div className="space-y-2">
              {history.map((entry) => {
                const c = LANG_CONFIG[entry.direction];
                return (
                  <Card
                    key={entry.id}
                    className="flex cursor-pointer items-start gap-3 p-3 transition-colors hover:bg-accent/50"
                    onClick={() => {
                      setDirection(entry.direction);
                      setSourceText(entry.source);
                      setTranslatedText(entry.translated);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate text-sm"
                        dir={entry.direction === "he-en" ? "rtl" : "ltr"}
                      >
                        {c.sourceFlag} {entry.source}
                      </p>
                      <p
                        className="truncate text-sm text-muted-foreground"
                        dir={entry.direction === "en-he" ? "rtl" : "ltr"}
                      >
                        {c.targetFlag} {entry.translated}
                      </p>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <a
          href="https://www.deepl.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-500 hover:underline"
        >
          DeepL
        </a>
        {" "}&middot;{" "}
        <a
          href="https://blaze-post.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-500 hover:underline"
        >
          Bee AI
        </a>
      </footer>
    </div>
  );
}
