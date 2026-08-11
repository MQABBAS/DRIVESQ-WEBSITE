#!/usr/bin/env python3
"""
Roll the enhanced SQWebsites credit footer out to every page.

Removes any prior sq-credit block (both the plain-text version used on ~80
older pages and the elaborate version that used to live only on index.html —
neither had nested <div>s, so a non-greedy match to the first closing </div>
is safe for both) and inserts a new, self-contained block (its own <style> +
markup, uniquely class-prefixed with `sqw-` so it can never collide with any
old `.sq-credit` CSS left behind in a page's <head>) right before </body>.

Idempotent: skips a file that already contains the CREDIT_MARKER, so it's
safe to re-run after a partial run or to pick up newly generated pages later.
"""
import os, re, glob

os.chdir('/home/user/DRIVESQ-WEBSITE')

CREDIT_MARKER = 'SQWEBSITES-CREDIT-V2'

CREDIT_BLOCK = '''<!-- ''' + CREDIT_MARKER + ''' -->
<style>
.sqw-credit{position:relative;padding:44px 20px 34px;text-align:center;overflow:hidden;isolation:isolate;background:linear-gradient(180deg,#050505,#030303)}
.sqw-credit::after{content:'';position:absolute;left:50%;top:50%;width:520px;height:220px;transform:translate(-50%,-50%);background:radial-gradient(ellipse at center, rgba(201,168,76,.10) 0%, rgba(201,168,76,.04) 45%, transparent 72%);z-index:0;animation:sqwBreathe 5s ease-in-out infinite}
@keyframes sqwBreathe{0%,100%{opacity:.7;transform:translate(-50%,-50%) scale(1)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}
.sqw-credit-rule{position:absolute;top:0;left:0;right:0;height:1px;background:rgba(201,168,76,.15);overflow:hidden}
.sqw-credit-rule::before{content:'';position:absolute;top:0;left:-30%;width:30%;height:100%;background:linear-gradient(90deg,transparent,rgba(242,220,148,.9),transparent);animation:sqwSweep 6s ease-in-out infinite}
@keyframes sqwSweep{0%{left:-30%}45%,100%{left:130%}}
.sqw-mark{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;position:relative;padding:10px 22px;border-radius:999px;z-index:1}
.sqw-mark::before{content:'';position:absolute;inset:0;border-radius:999px;border:1px solid rgba(201,168,76,.22);box-shadow:0 0 0 1px rgba(201,168,76,.06) inset,0 0 26px rgba(201,168,76,.16);transition:box-shadow .5s ease,border-color .5s ease}
.sqw-mark:hover::before{border-color:rgba(201,168,76,.4);box-shadow:0 0 0 1px rgba(201,168,76,.1) inset,0 0 42px rgba(201,168,76,.3)}
.sqw-wordmark{font-family:'Oswald',sans-serif;font-weight:700;font-size:2.1rem;letter-spacing:2px;line-height:1;background:linear-gradient(115deg,#8B6914 0%,#C9A84C 22%,#F2DC94 42%,#FFE680 50%,#F2DC94 58%,#C9A84C 78%,#8B6914 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:sqwShimmer 4.2s ease-in-out infinite;filter:drop-shadow(0 0 14px rgba(201,168,76,.55)) drop-shadow(0 0 34px rgba(201,168,76,.28))}
@keyframes sqwShimmer{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.sqw-dot{display:inline-block;width:5px;height:5px;margin-left:6px;margin-bottom:14px;border-radius:50%;background:#FFE680;box-shadow:0 0 8px rgba(255,230,128,.9),0 0 22px rgba(201,168,76,.6);animation:sqwPulse 2.2s ease-in-out infinite}
@keyframes sqwPulse{0%,100%{transform:scale(1);opacity:.85}50%{transform:scale(1.7);opacity:1}}
.sqw-label{display:block;margin-top:2px;font-size:.66rem;letter-spacing:.3em;text-transform:uppercase;font-weight:600;color:rgba(201,168,76,.55);position:relative;z-index:1}
.sqw-url{margin:14px 0 0;font-size:.74rem;color:#3a3a3a;position:relative;z-index:1}
.sqw-url a{color:rgba(201,168,76,.75);font-weight:600;text-decoration:none;transition:color .25s ease,filter .25s ease}
.sqw-url a:hover{color:#F2DC94;filter:drop-shadow(0 0 8px rgba(201,168,76,.5))}
.sqw-divider{width:26px;height:1px;margin:16px auto 12px;background:linear-gradient(90deg,transparent,rgba(201,168,76,.35),transparent);position:relative;z-index:1}
.sqw-founder{font-size:.68rem;color:#4a4a4a;letter-spacing:.04em;position:relative;z-index:1}
.sqw-founder a{color:rgba(201,168,76,.85);font-weight:600;text-decoration:none;transition:color .25s ease}
.sqw-founder a:hover{color:#F2DC94}
@media (prefers-reduced-motion:reduce){.sqw-credit::after,.sqw-credit-rule::before,.sqw-wordmark,.sqw-dot{animation:none!important}}
</style>
<div class="sqw-credit">
  <div class="sqw-credit-rule"></div>
  <a href="https://www.sqwebsites.co.uk" target="_blank" rel="nofollow noopener" class="sqw-mark" aria-label="SQWebsites">
    <span class="sqw-wordmark">SQ<span class="sqw-dot"></span></span>
  </a>
  <span class="sqw-label">Websites</span>
  <p class="sqw-url">Designed &amp; Hosted by <a href="https://www.sqwebsites.co.uk" target="_blank" rel="nofollow noopener">www.sqwebsites.co.uk</a></p>
  <div class="sqw-divider"></div>
  <p class="sqw-founder">Crafted by <a href="https://www.linkedin.com/in/mohammed-qaim-abbas-58699b344" target="_blank" rel="nofollow noopener">Mohammed Qaim Abbas</a></p>
</div>
<!-- /''' + CREDIT_MARKER + ''' -->
'''

# Matches either the old plain-text .sq-credit div (the ~80 older pages) or the
# old elaborate one (index.html) — neither has a nested <div>, so non-greedy to
# the first closing </div> is safe. Also eats a preceding HTML comment banner
# and any surrounding blank lines.
OLD_BLOCK_RE = re.compile(
    r'[ \t]*(?:<!--[^\n]*SQ[^\n]*CREDIT[^\n]*-->\s*)?<div class="sq-credit">.*?</div>\s*',
    re.IGNORECASE | re.DOTALL
)

BODY_CLOSE_RE = re.compile(r'</body>', re.IGNORECASE)

changed = 0
skipped_marker = 0
skipped_nobody = 0
files = sorted(glob.glob('*.html'))

for fname in files:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    if CREDIT_MARKER in content:
        skipped_marker += 1
        continue

    if not BODY_CLOSE_RE.search(content):
        skipped_nobody += 1
        continue

    content = OLD_BLOCK_RE.sub('', content)
    content = BODY_CLOSE_RE.sub(CREDIT_BLOCK + '</body>', content, count=1)

    with open(fname, 'w', encoding='utf-8') as f:
        f.write(content)
    changed += 1

print(f'Updated: {changed}')
print(f'Already had marker (skipped): {skipped_marker}')
print(f'No </body> found (skipped): {skipped_nobody}')
print(f'Total scanned: {len(files)}')
