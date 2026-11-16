import React from 'react';
import '../styles/ReadingGuide.css';

export default function ReadingGuide({ guide }) {
    return <div className="reading-guide">
        <div className="guide-lead" id="guide-overview">
            <span className="eyebrow">{guide.reviewed ? 'THE QUICK TAKE' : 'AT A GLANCE'}</span>
            <p className="guide-deck">{guide.deck}</p>
            {guide.overview.length > 0 && <div className="guide-overview">{guide.overview.map((point, index) => <p key={index}>{point}</p>)}</div>}
        </div>
        <div className="guide-body">
            <nav className="guide-contents" aria-label="Guide sections">
                <span className="eyebrow">JUMP TO</span>
                <a href="#guide-overview">{guide.reviewed ? 'Quick take' : 'At a glance'}</a>
                {guide.sections.map((section, index) => <a key={index} href={`#guide-section-${index}`}><span>{String(index + 1).padStart(2, '0')}</span>{section.label}</a>)}
                {guide.takeaways.length > 0 && <a href="#guide-takeaways">Key ideas</a>}
            </nav>
            <div className="guide-chapters">
                {guide.sections.map((section, index) => <section className="guide-chapter" id={`guide-section-${index}`} key={index} aria-labelledby={`guide-title-${index}`}>
                    <div className="guide-chapter-top"><span>{section.label}</span><span>{String(index + 1).padStart(2, '0')} / {String(guide.sections.length).padStart(2, '0')}</span></div>
                    <h3 id={`guide-title-${index}`}>{section.title}</h3>
                    {section.summary.split('\n\n').map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
                </section>)}
                {guide.takeaways.length > 0 && <section className="guide-takeaways" id="guide-takeaways" aria-labelledby="takeaways-title">
                    <span className="eyebrow">REMEMBER THIS</span>
                    <h3 id="takeaways-title">Key ideas</h3>
                    <ol>{guide.takeaways.map((point, index) => <li key={index}>{point}</li>)}</ol>
                </section>}
            </div>
        </div>
    </div>;
}
