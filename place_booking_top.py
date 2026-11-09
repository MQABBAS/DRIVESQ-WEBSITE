#!/usr/bin/env python3
"""Move each page's booking form (the DRIVESQ-INLINE-BOOKING-V1 block) to just below the page title, so every SEO page reads:
title/hero -> booking card ("Book in 60 seconds" + full form) -> all the page's information.
Safe to re-run: pages already done (data-dsq-top) are skipped. Usage: python3 place_booking_top.py [--dry]"""
import re, subprocess, sys

START, END = "<!-- DRIVESQ-INLINE-BOOKING-V1 -->", "<!-- /DRIVESQ-INLINE-BOOKING-V1 -->"
TOK = re.compile(r'<!--.*?-->|<(/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>', re.S)
VOID = {'br', 'img', 'input', 'meta', 'link', 'hr', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr'}


def hero_end(h):
    """End offset of the nearest <section>/<header> that contains the first <h1> (the title block)."""
    stack, target = [], None
    for m in TOK.finditer(h):
        if m.group(0).startswith('<!--'): continue
        close, tag, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if not close:
            if tag in VOID or attrs.rstrip().endswith('/'): continue
            stack.append((tag, m.start()))
            if tag == 'h1' and target is None:
                anc = [k for k, s in enumerate(stack[:-1]) if s[0] in ('section', 'header')]
                if not anc: return None
                target = anc[-1]
                tstart = stack[target][1]
        else:
            for k in range(len(stack) - 1, -1, -1):
                if stack[k][0] == tag:
                    if target is not None and k == target and stack[k][1] == tstart: return m.end()
                    del stack[k:]; break
    return None


def after_h1(h):
    """No title block: just after </h1> and the intro paragraph that follows it."""
    i = h.find('</h1>')
    if i < 0: return None
    i += 5
    m = re.match(r'\s*<p\b[^>]*>.*?</p>', h[i:i + 1500], re.S)
    return i + m.end() if m else i


def process(h):
    if 'data-dsq-top' in h or START not in h or '<h1' not in h: return None
    a, b = h.find(START), h.find(END)
    if b < a: return None
    b += len(END)
    # Solihull pages wrap the form in <div class="sol-form" id="book"> — move the wrapper too (it is the #book anchor)
    w = h.rfind('<div class="sol-form" id="book">', 0, a)
    if w >= 0 and h[w:a].strip() == '<div class="sol-form" id="book">':
        a = w; c = h.find('</div>', b); b = c + 6 if c >= 0 and h[b:c].strip() == '' else b
    block = h[a:b]
    rest = h[:a] + h[b:]
    pos = hero_end(rest)
    if pos is None: pos = after_h1(rest)
    if pos is None or pos > a: pass
    if pos is None: return None
    if pos >= a and a < rest.find('<h1'):  # booking already above the title — leave it
        return None
    return rest[:pos] + '\n<div class="dsq-book-top" data-dsq-top>' + block + '</div>\n' + rest[pos:]


if __name__ == '__main__':
    dry = '--dry' in sys.argv
    files = subprocess.run("git ls-files '*.html'", shell=True, capture_output=True, text=True).stdout.split()
    done = skipped = 0
    for f in files:
        if f in ('index.html', 'admin.html', 'dashboard.html', 'student.html', 'portal.html'): continue
        h = open(f, encoding='utf-8', errors='ignore').read()
        out = process(h)
        if out is None: skipped += START in h; continue
        done += 1
        if not dry: open(f, 'w', encoding='utf-8').write(out)
    print(('would move' if dry else 'moved'), done, 'booking forms; left as they were:', skipped)
