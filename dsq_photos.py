"""DriveSQ pass-photo gallery for generated pages. Photos: _data/pass_photos.json (img/passes/, metadata stripped).
gallery(picks, caption) -> HTML: first photo large (2x2 on desktop), the rest in a grid; responsive srcset + lazy loading."""
import html, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS = json.load(open(os.path.join(HERE, "_data", "pass_photos.json")))
CSS = ("<style>.dsq-ph{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:minmax(0,260px);gap:14px;margin-top:22px}"
       ".dsq-ph figure{margin:0;position:relative;border-radius:18px;overflow:hidden;background:#111;box-shadow:0 14px 34px rgba(0,0,0,.18)}"
       ".dsq-ph figure.big{grid-column:span 2;grid-row:span 2}"
       ".dsq-ph img{width:100%;height:100%;object-fit:cover;object-position:50% 35%;display:block;transition:transform .8s cubic-bezier(.2,.7,.2,1)}"
       ".dsq-ph figure:hover img{transform:scale(1.05)}"
       ".dsq-ph figcaption{position:absolute;left:0;right:0;bottom:0;padding:28px 12px 10px;font-size:.78rem;font-weight:600;color:#fff;background:linear-gradient(transparent,rgba(0,0,0,.72))}"
       ".dsq-ph figcaption i{color:#4ade80;margin-right:5px}"
       "@media (max-width:760px){.dsq-ph{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:minmax(0,220px);gap:10px}.dsq-ph figure.big{grid-row:span 1;grid-column:span 2}}</style>")


def gallery(picks=(5, 0, 1, 3, 4), caption="Passed with DriveSQ"):
    e = lambda s: html.escape(str(s), quote=True)
    figs = []
    for k, i in enumerate(picks):
        p = PHOTOS[i]
        figs.append(f'<figure{" class=" + chr(34) + "big" + chr(34) if k == 0 else ""}><img src="{p["sm"]}" srcset="{p["sm"]} 700w, {p["src"]} 1400w" '
                    f'sizes="{"(max-width:760px) 100vw, 50vw" if k == 0 else "(max-width:760px) 50vw, 25vw"}" width="{p["w"]}" height="{p["h"]}" alt="{e(p["alt"])}" loading="lazy" decoding="async">'
                    f'<figcaption><i class="bi bi-patch-check-fill"></i>{e(caption)}</figcaption></figure>')
    return CSS + '<div class="dsq-ph reveal">' + "".join(figs) + "</div>"


def schema(site, picks=(5, 0, 1, 3, 4)):
    return {"@context": "https://schema.org", "@type": "ImageGallery", "name": "DriveSQ learners who passed",
            "image": [{"@type": "ImageObject", "contentUrl": f"{site}/{PHOTOS[i]['src']}", "description": PHOTOS[i]["alt"]} for i in picks]}
