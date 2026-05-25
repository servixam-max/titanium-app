#!/usr/bin/env python3
import subprocess
import os

sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for size in sizes:
    subprocess.run([
        'convert', '-size', f'{size}x{size}', 
        'xc:#131313',
        '-pointsize', str(int(size/3)),
        '-fill', '#ccff00',
        '-gravity', 'center',
        '-annotate', '+0+0', 'T',
        f'icon-{size}x{size}.png'
    ], check=True)
    print(f"Generated icon-{size}x{size}.png")

