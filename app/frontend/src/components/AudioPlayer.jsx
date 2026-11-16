import React from 'react';
import '../styles/AudioPlayer.css';

export default function AudioPlayer({ speech, sections, guide = false }) {
    if (!speech.supported || sections.length === 0) return null;
    const active = speech.status !== 'idle';
    const voices = speech.voices.filter((voice) => /^en(?:-|$)/i.test(voice.lang) || voice.voiceURI === speech.voiceURI);
    return <div className="audio-player" aria-label={guide ? 'Guide audio player' : 'Summary audio player'}>
        <div className="audio-main">
            <button type="button" className="audio-primary" onClick={() => active ? speech.togglePause() : speech.play()}>
                {speech.status === 'playing' ? 'Pause' : speech.status === 'paused' ? 'Resume' : guide ? 'Listen to guide' : 'Listen to summary'}
            </button>
            {active && <>
                <button type="button" onClick={() => speech.play(Math.max(0, speech.sectionIndex - 1))} aria-label="Previous section">←</button>
                <button type="button" onClick={() => speech.play(Math.min(sections.length - 1, speech.sectionIndex + 1))} aria-label="Next section">→</button>
                <button type="button" onClick={speech.stop}>Stop</button>
            </>}
        </div>
        <p aria-live="polite">{active ? `Section ${speech.sectionIndex + 1} of ${sections.length}: ${sections[speech.sectionIndex]?.title}` : `Hear this ${guide ? 'guide' : 'summary'} read aloud`}</p>
        <div className="audio-options">
            <label>Voice
                <select value={speech.voiceURI} onChange={(event) => speech.setVoiceURI(event.target.value)}>
                    <option value="">Device default</option>
                    {voices.map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}
                </select>
            </label>
            <label>Speed
                <select value={speech.rate} onChange={(event) => speech.setRate(Number(event.target.value))}>
                    {[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}
                </select>
            </label>
        </div>
    </div>;
}
