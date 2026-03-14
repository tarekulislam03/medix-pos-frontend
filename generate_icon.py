import sys
from PIL import Image, ImageDraw, ImageFilter

SS = 4

def draw_rounded_rect(draw, bbox, radius, fill):
    x0, y0, x1, y1 = [int(v) for v in bbox]
    radius = int(radius)
    # Ensure correct bounds to avoid PIL ValueError
    if x1 - radius < x0 + radius:
        mid = (x0 + x1) // 2
        r1, r2 = mid, mid
    else:
        r1, r2 = x0 + radius, x1 - radius
        
    if y1 - radius < y0 + radius:
        mid_y = (y0 + y1) // 2
        ry1, ry2 = mid_y, mid_y
    else:
        ry1, ry2 = y0 + radius, y1 - radius

    draw.rectangle([r1, y0, r2, y1], fill=fill)
    draw.rectangle([x0, ry1, x1, ry2], fill=fill)
    
    # Corners
    if radius > 0:
        draw.pieslice([x0, y0, x0 + radius*2, y0 + radius*2], 180, 270, fill=fill)
        draw.pieslice([x1 - radius*2, y0, x1, y0 + radius*2], 270, 360, fill=fill)
        draw.pieslice([x0, y1 - radius*2, x0 + radius*2, y1], 90, 180, fill=fill)
        draw.pieslice([x1 - radius*2, y1 - radius*2, x1, y1], 0, 90, fill=fill)

def generate_icon(size, filename, is_splash=False, is_adaptive=False):
    canvas_size = size * SS
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    
    if is_adaptive:
        padding = int(canvas_size * 0.166)
    elif is_splash:
        padding = int(canvas_size * 0.25)
    else:
        padding = int(canvas_size * 0.08)

    box_w_max = canvas_size - (padding * 2)
    box_w = box_w_max * 0.82
    
    x0 = int((canvas_size - box_w)/2 - (box_w * 0.05))
    y0 = int((canvas_size - box_w)/2 + (box_w * 0.05))
    x1 = int(x0 + box_w)
    y1 = int(y0 + box_w)
    
    radius = int(box_w * 0.28)
    
    # 1. White Round Square
    draw_rounded_rect(d, [x0, y0, x1, y1], radius, (255, 255, 255, 255))
    
    # 2. Teal Dot
    dot_radius = int(box_w * 0.15)
    dot_cx = int(x1 - radius*0.1)
    dot_cy = int(y0 + radius*0.1)
    
    d.ellipse([dot_cx - dot_radius, dot_cy - dot_radius, dot_cx + dot_radius, dot_cy + dot_radius], fill="#4CA19B")

    # 3. Plus sign (Dark Green)
    cross_length = int(box_w * 0.46)
    cross_thick = int(box_w * 0.12)
    cross_radius = int(cross_thick / 2)
    cross_color = "#1A3C34" 
    
    box_center_x = (x0 + x1) // 2
    box_center_y = (y0 + y1) // 2
    
    # Horizontal arm
    hx0 = box_center_x - cross_length//2
    hy0 = box_center_y - cross_thick//2
    hx1 = box_center_x + cross_length//2
    hy1 = box_center_y + cross_thick//2
    draw_rounded_rect(d, [hx0, hy0, hx1, hy1], cross_radius, cross_color)

    # Vertical arm
    vx0 = box_center_x - cross_thick//2
    vy0 = box_center_y - cross_length//2
    vx1 = box_center_x + cross_thick//2
    vy1 = box_center_y + cross_length//2
    draw_rounded_rect(d, [vx0, vy0, vx1, vy1], cross_radius, cross_color)
    
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    img.save(f"assets/{filename}")

print("Generating perfectly crisp anti-aliased HD logos in transparent format...")
generate_icon(1024, "icon.png", is_splash=False, is_adaptive=False)
generate_icon(1024, "splash-icon.png", is_splash=True, is_adaptive=False)
generate_icon(1024, "adaptive-icon.png", is_splash=False, is_adaptive=True)
generate_icon(256, "favicon.png", is_splash=False, is_adaptive=False)
print("Logos successfully created in /assets/. Ready for Expo builds.")
