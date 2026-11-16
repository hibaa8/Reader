import DOMPurify from 'dompurify';

/** Preserve editorial headings without presenting thematic sections as source chapters. */
export function structureSummary(rawHtml) {
    const clean = DOMPurify.sanitize((rawHtml || '').replace(/```(?:html)?/gi, ''), {
        ALLOWED_TAGS: ['h3', 'h4', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i'],
        ALLOWED_ATTR: [],
    });
    const document = new DOMParser().parseFromString(clean, 'text/html');
    const headings = [...document.body.querySelectorAll('h4')];
    const chaptered = headings.length > 1 && headings.every((heading) =>
        /^(chapter|letter|book|act|stave)\b/i.test(heading.textContent.trim()));
    const sections = [];
    if (headings.length === 0) {
        if (document.body.textContent.trim()) {
            sections.push({ id: 'summary-section-0', title: 'Overview', text: document.body.textContent.trim() });
        }
    } else {
        const introNodes = [];
        let node = document.body.firstChild;
        while (node && node !== headings[0]) {
            if (node.nodeName === 'P') introNodes.push(node.textContent || '');
            node = node.nextSibling;
        }
        const intro = introNodes.join(' ').replace(/\s+/g, ' ').trim();
        if (intro && intro.length > 40) {
            const firstParagraph = [...document.body.querySelectorAll('p')].find((paragraph) =>
                paragraph.compareDocumentPosition(headings[0]) & Node.DOCUMENT_POSITION_FOLLOWING);
            if (firstParagraph) firstParagraph.id = 'summary-intro';
            sections.push({ id: 'summary-intro', title: 'Introduction', text: intro });
        }
        headings.forEach((heading, index) => {
            heading.id = `summary-section-${index}`;
            const parts = [];
            let sibling = heading.nextSibling;
            while (sibling && sibling !== headings[index + 1]) {
                parts.push(sibling.textContent || '');
                sibling = sibling.nextSibling;
            }
            sections.push({ id: heading.id, title: heading.textContent.trim(), text: `${heading.textContent}. ${parts.join(' ')}`.replace(/\s+/g, ' ').trim() });
        });
    }
    return { html: document.body.innerHTML, sections, chaptered };
}
