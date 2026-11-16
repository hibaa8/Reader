"""Present older generated summaries in the guide layout without claiming source review."""

from functools import lru_cache
from html.parser import HTMLParser
import re


class SummaryBlocks(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks = []
        self.current = None
        self.parts = []
        self.ignored = 0

    def handle_starttag(self, tag, attrs):
        if tag in {'head', 'script', 'style'}:
            self.ignored += 1
        if self.ignored:
            return
        if tag in {'h3', 'h4', 'h5', 'p', 'li'} and self.current is None:
            self.current = tag
            self.parts = []
        elif tag == 'br' and self.current:
            self.parts.append(' ')

    def handle_endtag(self, tag):
        if tag in {'head', 'script', 'style'}:
            self.ignored = max(0, self.ignored - 1)
            return
        if tag == self.current:
            value = re.sub(r'\s+', ' ', ''.join(self.parts)).strip()
            if value:
                self.blocks.append((tag, value))
            self.current = None
            self.parts = []

    def handle_data(self, data):
        if self.current and not self.ignored:
            self.parts.append(data)


@lru_cache(maxsize=128)
def legacy_guide(title, summary, source_url):
    if not summary or summary.strip().lower().startswith(('error summarizing', 'error fetching')):
        return None
    parser = SummaryBlocks()
    parser.feed(re.sub(r'```(?:html)?', '', summary, flags=re.I))
    blocks = parser.blocks
    h4_count = sum(tag == 'h4' for tag, _ in blocks)
    h5_count = sum(tag == 'h5' for tag, _ in blocks)
    heading_tag = 'h5' if h5_count > h4_count * 2 else 'h4'
    sections = []
    current_title = None
    paragraphs = []

    def flush():
        if paragraphs:
            sections.append({
                'label': f'Section {len(sections) + 1}',
                'title': current_title or 'Overview',
                'summary': '\n\n'.join(paragraphs),
            })

    for tag, value in blocks:
        if tag == heading_tag:
            flush()
            current_title = value
            paragraphs = []
        elif tag in {'p', 'li'}:
            paragraphs.append(value)
    flush()
    if not sections:
        return None

    # The opening sentence is a preview, not a claim that the old sections
    # follow the chapter divisions of the linked Gutenberg edition.
    preview = next((part for section in sections for part in section['summary'].split('\n\n')
                    if len(part) > 40), sections[0]['summary'])
    match = re.search(r'^(.{40,240}?[.!?。！？])(?:\s|$)', preview)
    deck = match.group(1) if match else preview[:180].rstrip() + ('…' if len(preview) > 180 else '')
    return {
        'source': source_url,
        'deck': deck,
        'overview': [],
        'takeaways': [],
        'sections': sections,
        'reviewed': False,
    }
