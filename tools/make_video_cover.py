from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random


OUT = Path("docs/video-assets")
BG = OUT / "cover-background.png"
SCREENSHOT = OUT / "idea-drop-box-screenshot.png"
COVER = OUT / "idea-drop-box-video-cover.png"
W, H = 1920, 1080

FONT_DIR = Path("C:/Windows/Fonts")
MSYH = str(FONT_DIR / "msyh.ttc")
MSYHBD = str(FONT_DIR / "msyhbd.ttc")


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


F = {
    "title": font(MSYHBD, 116),
    "title2": font(MSYHBD, 84),
    "sub": font(MSYHBD, 42),
    "body": font(MSYH, 28),
    "small": font(MSYH, 22),
    "tiny": font(MSYH, 18),
    "uih": font(MSYHBD, 58),
    "uim": font(MSYHBD, 25),
}


def rr(draw: ImageDraw.ImageDraw, xy, r, fill, outline=None, width=1) -> None:
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def shadow(base: Image.Image, box, radius=28, offset=(0, 18), alpha=120) -> None:
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x1, y1, x2, y2 = box
    rr(d, (x1 + offset[0], y1 + offset[1], x2 + offset[0], y2 + offset[1]), radius, (0, 0, 0, alpha))
    base.alpha_composite(layer.filter(ImageFilter.GaussianBlur(24)))


def make_ui() -> Image.Image:
    sw, sh = 1120, 720
    img = Image.new("RGBA", (sw, sh), (245, 241, 233, 255))
    d = ImageDraw.Draw(img)

    for x in range(0, sw, 28):
        d.line((x, 0, x, sh), fill=(25, 34, 38, 12))
    for y in range(0, sh, 28):
        d.line((0, y, sw, y), fill=(25, 34, 38, 12))

    rr(d, (0, 0, 265, sh), 0, (25, 31, 34, 255))
    rr(d, (28, 32, 78, 82), 9, (246, 201, 95, 255))
    d.text((43, 43), "ID", font=F["uim"], fill=(18, 22, 24, 255))
    d.text((96, 34), "Idea Drop Box", font=F["uim"], fill=(248, 244, 235, 255))
    d.text((96, 66), "Ctrl+Alt+Space", font=F["tiny"], fill=(166, 176, 172, 255))

    for icon, label, y, active in [("✦", "捕获", 116, True), ("▣", "日报", 170, False), ("⚙", "设置", 224, False)]:
        fill = (242, 238, 227, 255) if active else (255, 255, 255, 0)
        color = (16, 20, 22, 255) if active else (220, 226, 220, 255)
        rr(d, (24, y, 238, y + 44), 8, fill)
        d.text((42, y + 8), icon, font=F["small"], fill=color)
        d.text((78, y + 8), label, font=F["small"], fill=color)

    rr(d, (24, 640, 238, 686), 8, (255, 255, 255, 16))
    d.text((48, 653), "每日 23:00 自动总结", font=F["tiny"], fill=(190, 200, 194, 255))

    d.text((310, 54), "今日收集", font=F["small"], fill=(111, 103, 96, 255))
    d.text((310, 88), "4 条想法", font=F["uih"], fill=(36, 33, 29, 255))
    rr(d, (858, 70, 1044, 116), 8, (246, 201, 95, 255))
    d.text((888, 82), "应用常驻中", font=F["small"], fill=(16, 20, 22, 255))

    rr(d, (306, 162, 1058, 346), 10, (255, 253, 248, 255), (222, 214, 199, 255), 2)
    rr(d, (330, 188, 1034, 286), 8, (248, 245, 239, 255), (216, 208, 194, 255), 1)
    d.text((354, 218), "把灵感、问题、待验证判断先丢进来...", font=F["body"], fill=(96, 91, 84, 255))
    rr(d, (846, 296, 1034, 332), 8, (246, 201, 95, 255))
    d.text((884, 302), "保存想法", font=F["small"], fill=(16, 20, 22, 255))

    ideas = [
        ("09:18", "把碎片想法收集成每日复盘，避免灵感散落在聊天窗口里。"),
        ("11:42", "用 DeepSeek 自动聚类：产品、内容、代码、待办。"),
        ("16:05", "日报导出 Markdown，方便沉淀到知识库。"),
        ("21:30", "全局快捷键唤起小窗，输入后立刻回到工作流。"),
    ]
    y = 374
    for t, text in ideas:
        rr(d, (306, y, 1058, y + 64), 8, (255, 253, 248, 255), (222, 214, 199, 255), 1)
        d.text((330, y + 19), t, font=F["small"], fill=(47, 111, 104, 255))
        d.text((430, y + 18), text, font=F["small"], fill=(36, 33, 29, 255))
        y += 78

    shadow(img, (665, 472, 1080, 668), radius=18, offset=(0, 14), alpha=90)
    rr(d, (665, 472, 1080, 668), 18, (17, 19, 21, 255), (70, 82, 86, 255), 1)
    d.text((690, 492), "✦  Idea Drop Box", font=F["small"], fill=(246, 201, 95, 255))
    rr(d, (690, 528, 1054, 610), 8, (29, 34, 36, 255), (50, 58, 61, 255), 1)
    d.text((710, 552), "凌晨冒出的点子，先记录，明天让 AI 整理。", font=F["tiny"], fill=(241, 237, 228, 255))
    d.text((690, 630), "Ctrl/⌘ + Enter 保存，Esc 收起", font=F["tiny"], fill=(150, 159, 155, 255))
    rr(d, (962, 622, 1054, 654), 8, (246, 201, 95, 255))
    d.text((990, 628), "保存", font=F["tiny"], fill=(16, 20, 22, 255))
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ui = make_ui()
    ui.save(SCREENSHOT)

    bg = Image.open(BG).convert("RGBA").resize((W, H), Image.LANCZOS)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for i in range(W):
        od.line((i, 0, i, H), fill=(3, 7, 8, int(180 * max(0, 1 - i / 1200))))
    for y in range(H):
        od.line((0, y, W, y), fill=(0, 0, 0, int(80 * (y / H))))
    random.seed(8)
    for _ in range(34):
        x = random.randint(0, W)
        y = random.randint(0, H)
        length = random.randint(80, 240)
        color = random.choice([(246, 201, 95, 80), (58, 210, 196, 60), (255, 255, 255, 35)])
        od.line((x, y, x + length, y - random.randint(20, 90)), fill=color, width=random.randint(2, 5))
    bg.alpha_composite(overlay)

    shot = ui.resize((980, 630), Image.LANCZOS)
    shot_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow(shot_layer, (795, 250, 1775, 880), radius=30, offset=(0, 28), alpha=150)
    shot_layer.alpha_composite(shot.rotate(-4, resample=Image.BICUBIC, expand=True), (760, 230))
    bg.alpha_composite(shot_layer)

    d = ImageDraw.Draw(bg)
    rr(d, (94, 88, 420, 142), 12, (246, 201, 95, 255))
    d.text((122, 101), "桌面灵感收集器", font=F["sub"], fill=(15, 19, 20, 255))
    for dx, dy in [(-3, 0), (3, 0), (0, -3), (0, 3), (3, 3), (-3, 3)]:
        d.text((94 + dx, 190 + dy), "灵感别再丢了", font=F["title"], fill=(0, 0, 0, 190))
    d.text((94, 190), "灵感别再丢了", font=F["title"], fill=(255, 253, 244, 255))
    d.text((96, 326), "全局快捷键随手记", font=F["title2"], fill=(246, 201, 95, 255))
    d.text((96, 428), "+ DeepSeek 自动生成日报", font=F["sub"], fill=(226, 246, 240, 255))

    cx, cy = 96, 514
    for c in ["Ctrl+Alt+Space", "AI 日报", "Markdown 留档", "Tauri 桌面版"]:
        tw = d.textlength(c, font=F["body"])
        rr(d, (cx, cy, cx + tw + 38, cy + 52), 14, (9, 18, 19, 185), (246, 201, 95, 110), 1)
        d.text((cx + 19, cy + 10), c, font=F["body"], fill=(248, 244, 235, 255))
        cx += int(tw + 54)

    rr(d, (96, 850, 790, 930), 18, (8, 15, 17, 185), (246, 201, 95, 150), 2)
    d.text((128, 870), "从碎片想法到每日复盘，一键沉淀你的创意资产", font=F["body"], fill=(255, 253, 244, 255))
    rr(d, (96, 970, 298, 1024), 12, (47, 111, 104, 230))
    d.text((124, 983), "Idea Drop Box", font=F["small"], fill=(255, 253, 244, 255))
    bg.convert("RGB").save(COVER, quality=96)
    print(SCREENSHOT.resolve())
    print(COVER.resolve())


if __name__ == "__main__":
    main()
