import { useEffect, useRef, useState } from 'react';

const SETTINGS_KEY = 'book-reader:audio-settings:v1';
function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch { return {}; }
}

export function useSummarySpeech(bookId, sections) {
    const settings = useRef(loadSettings());
    const [status, setStatus] = useState('idle');
    const [sectionIndex, setSectionIndex] = useState(0);
    const [rate, setRate] = useState(settings.current.rate || 1);
    const [voiceURI, setVoiceURI] = useState(settings.current.voiceURI || '');
    const [voices, setVoices] = useState([]);
    const generation = useRef(0);
    const supported = typeof window !== 'undefined' &&
        'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    useEffect(() => {
        if (!supported) return undefined;
        const refresh = () => setVoices(window.speechSynthesis.getVoices());
        refresh();
        window.speechSynthesis.addEventListener('voiceschanged', refresh);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh);
    }, [supported]);

    useEffect(() => {
        setStatus('idle');
        setSectionIndex(0);
        return () => {
            generation.current += 1;
            if (supported) window.speechSynthesis.cancel();
        };
    }, [bookId, supported]);

    useEffect(() => {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ rate, voiceURI })); } catch { /* Optional preference. */ }
    }, [rate, voiceURI]);

    const stop = () => {
        generation.current += 1;
        if (supported) window.speechSynthesis.cancel();
        setStatus('idle');
    };

    const play = (startIndex = sectionIndex) => {
        if (!supported || !sections.length) return;
        const index = Math.max(0, Math.min(sections.length - 1, startIndex));
        generation.current += 1;
        const currentGeneration = generation.current;
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        setStatus('playing');

        const speakSection = (nextIndex) => {
            if (generation.current !== currentGeneration) return;
            if (nextIndex >= sections.length) { setStatus('idle'); return; }
            setSectionIndex(nextIndex);
            const chunks = (sections[nextIndex].text || '').replace(/\s+/g, ' ').trim()
                .match(/.{1,180}(?:\s|$)|\S{1,180}/g) || [];
            let chunkIndex = 0;
            const speakChunk = () => {
                if (generation.current !== currentGeneration) return;
                if (chunkIndex >= chunks.length) { speakSection(nextIndex + 1); return; }
                const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex++]);
                utterance.rate = rate;
                utterance.voice = voices.find((voice) => voice.voiceURI === voiceURI) || null;
                utterance.onend = speakChunk;
                utterance.onerror = () => {
                    if (generation.current === currentGeneration) setStatus('idle');
                };
                window.speechSynthesis.speak(utterance);
            };
            speakChunk();
        };
        speakSection(index);
    };

    const togglePause = () => {
        if (!supported) return;
        if (status === 'playing') { window.speechSynthesis.pause(); setStatus('paused'); }
        else if (status === 'paused') { window.speechSynthesis.resume(); setStatus('playing'); }
    };

    return { supported, status, sectionIndex, rate, setRate, voiceURI, setVoiceURI,
        voices, play, stop, togglePause };
}
