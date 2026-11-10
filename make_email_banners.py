#!/usr/bin/env python3
"""DriveSQ animated email banners (1200x480, 24 frames, ~80 ms) in the same style as email/banner-drive.gif:
dark red gradient, DriveSQ logo + wordmark, yellow tag line, big condensed white headline with a red/yellow accent.
Drawn at 2x and downscaled for smooth edges. Writes email/banner-<name>.gif.
Usage: python3 make_email_banners.py <folder with BarlowCondensed_800ExtraBold.ttf, BarlowCondensed_700Bold.ttf, Inter_700Bold.ttf>"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FD = sys.argv[1]
S = 2                                   # supersampling
W, H, N, DUR = 1200, 480, 24, 80
RED, RED2, YEL, WHITE, INK, GREEN = (209, 10, 17), (255, 77, 85), (245, 197, 24), (255, 255, 255), (20, 6, 8), (34, 197, 94)
F = lambda name, size: ImageFont.truetype(os.path.join(FD, name), size * S)
BIG, MID, TAG, SMALL = F("BarlowCondensed_800ExtraBold.ttf", 92), F("BarlowCondensed_800ExtraBold.ttf", 54), F("BarlowCondensed_700Bold.ttf", 30), F("Inter_700Bold.ttf", 22)
LOGO = Image.open(os.path.join(HERE, "email", "logo-240.png")).convert("RGBA").resize((66 * S, 66 * S), Image.LANCZOS)


def ease(t): return 1 - (1 - t) ** 3


def background():
    bg = Image.new("RGB", (W * S, H * S), INK)
    d = ImageDraw.Draw(bg)
    for y in range(0, H * S, 4):                       # vertical gradient: deep red top-right → near black
        k = y / (H * S); c = (int(70 - 50 * k), int(6 + 0 * k), int(10 - 4 * k)); d.rectangle([0, y, W * S, y + 4], fill=c)
    for x in range(-H * S, W * S, 46 * S):              # subtle diagonal stripes
        d.line([(x, H * S), (x + H * S, 0)], fill=(60, 8, 12), width=2 * S)
    d.rectangle([0, (H - 34) * S, W * S, H * S], fill=(16, 16, 18))   # road strip
    return bg


BG = background()


def frame_base(tag, line1, line2, accent=RED2):
    im = BG.copy(); d = ImageDraw.Draw(im)
    im.paste(LOGO, (26 * S, 18 * S), LOGO)
    d.text((104 * S, 26 * S), "Drive", font=F("BarlowCondensed_800ExtraBold.ttf", 46), fill=WHITE)
    wd = d.textlength("Drive", font=F("BarlowCondensed_800ExtraBold.ttf", 46))
    d.text((104 * S + wd, 26 * S), "SQ", font=F("BarlowCondensed_800ExtraBold.ttf", 46), fill=RED2)
    tw = d.textlength(tag, font=TAG); d.text((W * S - 40 * S - tw, 30 * S), tag, font=TAG, fill=YEL)
    for i, (txt, col) in enumerate(((line1, WHITE), (line2, accent))):
        w = d.textlength(txt, font=BIG); d.text((W * S - 40 * S - w, (118 + i * 96) * S), txt, font=BIG, fill=col)
    for i in range(0, W, 120):                          # road dashes
        d.rectangle([(i + 20) * S, (H - 19) * S, (i + 80) * S, (H - 13) * S], fill=YEL)
    return im, d


def rr(d, box, r, **kw): d.rounded_rectangle([v * S for v in box], radius=r * S, **kw)


def tick(d, x, y, s, prog, col=GREEN, w=9):
    pts = [(x, y), (x + s * .38, y + s * .38), (x + s, y - s * .45)]
    if prog <= 0: return
    a = min(prog * 2, 1); m = (pts[0][0] + (pts[1][0] - pts[0][0]) * a, pts[0][1] + (pts[1][1] - pts[0][1]) * a)
    d.line([(pts[0][0] * S, pts[0][1] * S), (m[0] * S, m[1] * S)], fill=col, width=w * S)
    if prog > .5:
        b = (prog - .5) * 2; e = (pts[1][0] + (pts[2][0] - pts[1][0]) * b, pts[1][1] + (pts[2][1] - pts[1][1]) * b)
        d.line([(pts[1][0] * S, pts[1][1] * S), (e[0] * S, e[1] * S)], fill=col, width=w * S)


def car(d, x, y, sc=1.0, body=RED, lights=0.0):
    k = lambda v: v * sc
    rr(d, [x, y + k(40), x + k(260), y + k(100)], int(k(22)), fill=body)                        # body
    d.polygon([((x + k(50)) * S, (y + k(42)) * S), ((x + k(85)) * S, (y + k(2)) * S), ((x + k(185)) * S, (y + k(2)) * S), ((x + k(225)) * S, (y + k(42)) * S)], fill=body)
    d.polygon([((x + k(66)) * S, (y + k(40)) * S), ((x + k(92)) * S, (y + k(12)) * S), ((x + k(134)) * S, (y + k(12)) * S), ((x + k(134)) * S, (y + k(40)) * S)], fill=(40, 44, 54))
    d.polygon([((x + k(142)) * S, (y + k(40)) * S), ((x + k(142)) * S, (y + k(12)) * S), ((x + k(180)) * S, (y + k(12)) * S), ((x + k(208)) * S, (y + k(40)) * S)], fill=(40, 44, 54))
    rr(d, [x + k(100), y - k(22), x + k(170), y - k(2)], 4, fill=WHITE, outline=RED, width=2 * S)    # roof sign
    d.text(((x + k(108)) * S, (y - k(21)) * S), "DriveSQ", font=F("BarlowCondensed_800ExtraBold.ttf", int(k(16))), fill=INK)
    d.text(((x + k(96)) * S, (y + k(56)) * S), "DriveSQ", font=F("BarlowCondensed_800ExtraBold.ttf", int(k(24))), fill=WHITE)
    rr(d, [x + k(12), y + k(52), x + k(32), y + k(72)], 3, fill=WHITE); d.text(((x + k(16)) * S, (y + k(50)) * S), "L", font=F("BarlowCondensed_800ExtraBold.ttf", int(k(20))), fill=RED)
    for cx in (x + k(62), x + k(200)):
        d.ellipse([(cx - k(24)) * S, (y + k(78)) * S, (cx + k(24)) * S, (y + k(126)) * S], fill=(18, 18, 20))
        d.ellipse([(cx - k(11)) * S, (y + k(91)) * S, (cx + k(11)) * S, (y + k(113)) * S], fill=(170, 170, 176))
    if lights > 0:
        a = int(70 + 120 * lights)
        d.polygon([((x + k(258)) * S, (y + k(58)) * S), ((x + k(340)) * S, (y + k(40)) * S), ((x + k(340)) * S, (y + k(92)) * S)], fill=(a, a - 20, 60))
    rr(d, [x + k(246), y + k(52), x + k(260), y + k(64)], 3, fill=(255, 236, 160))


def save(name, frames, alt):
    small = [f.resize((W, H), Image.LANCZOS) for f in frames]
    sheet = Image.new("RGB", (W, H * 4))                 # one shared palette so brand colours never shift between frames
    for k, idx in enumerate((0, len(small) // 3, 2 * len(small) // 3, len(small) - 1)): sheet.paste(small[idx], (0, H * k))
    sw = Image.new("RGB", (W, 40)); sd = ImageDraw.Draw(sw)
    for k, c in enumerate((RED, RED2, YEL, WHITE, GREEN, INK)): sd.rectangle([k * 200, 0, k * 200 + 199, 40], fill=c)
    sheet.paste(sw, (0, 0))
    pal = sheet.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    out = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in small]
    p = os.path.join(HERE, "email", f"banner-{name}.gif")
    out[0].save(p, save_all=True, append_images=out[1:], duration=DUR, loop=0, optimize=True, disposal=1)
    print(f"{p}  {os.path.getsize(p) // 1024} KB  — {alt}")


# 1. welcome — booking card ticking
def welcome():
    fr = []
    for i in range(N):
        im, d = frame_base("BOOKING RECEIVED", "WELCOME TO", "DRIVESQ.")
        rr(d, [150, 120, 470, 400], 22, fill=(250, 246, 238)); rr(d, [150, 120, 470, 170], 22, fill=RED); d.rectangle([150 * S, 150 * S, 470 * S, 170 * S], fill=RED)
        d.text((176 * S, 128 * S), "YOUR BOOKING", font=TAG, fill=WHITE)
        for k, lab in enumerate(("Details received", "Booking reference", "Student Portal")):
            y = 205 + k * 62; t = max(0, min(1, (i - 4 - k * 5) / 5))
            rr(d, [176, y, 214, y + 38], 9, outline=(210, 205, 198), width=3 * S, fill=WHITE)
            tick(d, 184, y + 21, 24, ease(t), w=6)
            d.text((230 * S, (y + 4) * S), lab, font=SMALL, fill=(40, 30, 30))
        fr.append(im)
    save("welcome", fr, "Welcome to DriveSQ — booking received")


# 2. booked — calendar with BOOKED stamp + car driving along the road
def booked():
    fr = []
    for i in range(N):
        im, d = frame_base("YOUR LESSONS", "YOU'RE", "BOOKED IN!", accent=YEL)
        rr(d, [170, 96, 430, 330], 20, fill=(250, 246, 238)); rr(d, [170, 96, 430, 150], 20, fill=RED); d.rectangle([170 * S, 130 * S, 430 * S, 150 * S], fill=RED)
        for cx in (215, 385): rr(d, [cx - 7, 82, cx + 7, 112], 5, fill=(60, 60, 66))
        d.text((206 * S, 102 * S), "FIRST LESSON", font=TAG, fill=WHITE)
        for r in range(3):
            for c in range(5):
                x, y = 190 + c * 46, 166 + r * 50; rr(d, [x, y, x + 36, y + 38], 7, fill=(232, 226, 216))
        s = ease(max(0, min(1, (i - 3) / 7)))
        if s > 0:
            st = Image.new("RGBA", (300 * S, 120 * S), (0, 0, 0, 0)); sd = ImageDraw.Draw(st)
            sd.rounded_rectangle([6 * S, 6 * S, 294 * S, 114 * S], radius=16 * S, outline=GREEN + (255,), width=9 * S)
            tw = sd.textlength("BOOKED", font=MID); sd.text(((300 * S - tw) / 2, 24 * S), "BOOKED", font=MID, fill=GREEN + (255,))
            sc = 1.6 - 0.6 * s; st = st.rotate(-10, expand=True, resample=Image.BICUBIC)
            st = st.resize((int(st.width * sc * .8), int(st.height * sc * .8)), Image.LANCZOS)
            a = st.split()[3].point(lambda v: int(v * min(1, s * 1.4))); st.putalpha(a)
            im.paste(st, (int(300 * S - st.width / 2), int(232 * S - st.height / 2)), st)
        cx = -300 + (i / (N - 1)) * 820
        car(d, cx, 470 - 126 * .55, sc=.55, lights=.6)
        fr.append(im)
    save("booked", fr, "You're booked in with DriveSQ")


# 3. ready — traffic light red → amber → green beside a DriveSQ car
def ready():
    fr = []
    for i in range(N):
        im, d = frame_base("YOUR INSTRUCTOR IS READY", "READY TO", "START?", accent=YEL)
        rr(d, [92, 70, 172, 300], 18, fill=(28, 28, 32)); d.rectangle([126 * S, 300 * S, 138 * S, 446 * S], fill=(40, 40, 44))
        phase = 0 if i < 8 else 1 if i < 13 else 2
        cols = [((255, 59, 66), phase == 0 or phase == 1), ((245, 197, 24), phase == 1), ((34, 197, 94), phase == 2)]
        for k, (c, lit) in enumerate(cols):
            y = 84 + k * 70; fill = c if lit else tuple(int(v * .22) for v in c)
            if lit: d.ellipse([(108 - 10) * S, (y - 10) * S, (156 + 10) * S, (y + 58) * S], fill=tuple(int(v * .35) for v in c))
            d.ellipse([108 * S, y * S, 156 * S, (y + 48) * S], fill=fill)
        x = 200 + (0 if phase < 2 else (i - 13) * 14)
        car(d, x, 470 - 126 * .8, sc=.8, lights=1 if phase == 2 else .3)
        fr.append(im)
    save("ready", fr, "Ready to start your driving lessons?")


# 4. weekly — instructor clipboard ticking
def weekly():
    fr = []
    items = ("Provisional licence", "Eyesight check", "Phone away", "L plates on", "Update portal")
    for i in range(N):
        im, d = frame_base("FOR DRIVESQ INSTRUCTORS", "WEEKLY", "REMINDERS")
        rr(d, [150, 104, 470, 440], 22, fill=(150, 104, 62)); rr(d, [168, 126, 452, 428], 12, fill=(250, 246, 238))
        rr(d, [250, 94, 370, 132], 12, fill=(70, 70, 76))
        for k, lab in enumerate(items):
            y = 142 + k * 56; t = max(0, min(1, (i - 2 - k * 3.5) / 4))
            rr(d, [186, y, 222, y + 36], 8, outline=(200, 195, 188), width=3 * S, fill=WHITE)
            tick(d, 193, y + 20, 22, ease(t), w=6)
            d.text((238 * S, (y + 3) * S), lab, font=SMALL, fill=(40, 30, 30))
        fr.append(im)
    save("weekly", fr, "DriveSQ weekly reminders for instructors")


def star(d, cx, cy, r, fill):
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5; rad = r if k % 2 == 0 else r * .45
        pts.append(((cx + rad * math.cos(a)) * S, (cy + rad * math.sin(a)) * S))
    d.polygon(pts, fill=fill)


# 5. review — five stars filling in
def review():
    fr = []
    for i in range(N):
        im, d = frame_base("GOOGLE REVIEWS", "HELP LEARNERS", "FIND US", accent=YEL)
        rr(d, [80, 150, 560, 330], 26, fill=(250, 246, 238))
        d.text((110 * S, 168 * S), "Rate your lessons", font=SMALL, fill=(60, 50, 50))
        for k in range(5):
            cx = 130 + k * 92; t = max(0, min(1, (i - 2 - k * 3) / 3)); r = 34 + (8 * math.sin(t * math.pi) if 0 < t < 1 else 0)
            star(d, cx, 262, r, (225, 220, 210));
            if t > 0: star(d, cx, 262, r * ease(t), YEL)
        fr.append(im)
    save("review", fr, "Leave DriveSQ a Google review")


# 6. camera — flash burst
def camera():
    fr = []
    for i in range(N):
        im, d = frame_base("PASS DAY", "SHARE YOUR", "PASSES")
        rr(d, [140, 150, 470, 380], 30, fill=(32, 32, 38)); rr(d, [180, 120, 280, 160], 12, fill=(32, 32, 38))
        d.ellipse([235 * S, 185 * S, 385 * S, 335 * S], fill=(60, 60, 70)); d.ellipse([258 * S, 208 * S, 362 * S, 312 * S], fill=(18, 40, 70))
        d.ellipse([288 * S, 230 * S, 318 * S, 260 * S], fill=(120, 170, 230))
        rr(d, [400, 170, 446, 200], 6, fill=(240, 240, 240))
        f = max(0, 1 - abs(i - 10) / 3)
        if f > 0:
            for k in range(12):
                a = k * math.pi / 6; r1, r2 = 30, 30 + 90 * f
                d.line([((423 + r1 * math.cos(a)) * S, (185 + r1 * math.sin(a)) * S), ((423 + r2 * math.cos(a)) * S, (185 + r2 * math.sin(a)) * S)], fill=YEL, width=6 * S)
            d.ellipse([(423 - 26 * f) * S, (185 - 26 * f) * S, (423 + 26 * f) * S, (185 + 26 * f) * S], fill=WHITE)
        fr.append(im)
    save("camera", fr, "Share your DriveSQ pass photos")


for fn in (welcome, booked, ready, weekly, review, camera): fn()
