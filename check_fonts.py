"""
Check which script fonts are available on your Windows system
"""
import os
from pathlib import Path

fonts_to_check = [
    "C:/Windows/Fonts/GreatVibes-Regular.ttf",
    "C:/Windows/Fonts/GreatVibes.ttf",
    "C:/Windows/Fonts/MTCORSVA.TTF",  # Monotype Corsiva
    "C:/Windows/Fonts/EDWARDIAN SCRIPT ITC.TTF",
    "C:/Windows/Fonts/ITCEDSCR.TTF",
    "C:/Windows/Fonts/PRISTINA.TTF",
    "C:/Windows/Fonts/FRSCRIPT.TTF",
    "C:/Windows/Fonts/FREESCPT.TTF",
    "C:/Windows/Fonts/KUNSTLER.TTF",
    "C:/Windows/Fonts/VLADIMIR.TTF",
    "C:/Windows/Fonts/BrushScriptMT.ttf",
    "C:/Windows/Fonts/BRUSHSCI.TTF",
]

print("Checking for elegant script fonts on your system:\n")
print("=" * 60)

found_fonts = []
for font_path in fonts_to_check:
    if os.path.exists(font_path):
        font_name = Path(font_path).name
        print(f"✓ FOUND: {font_name}")
        found_fonts.append(font_path)
    else:
        font_name = Path(font_path).name
        print(f"✗ NOT FOUND: {font_name}")

print("=" * 60)
print(f"\nTotal fonts found: {len(found_fonts)}")

if found_fonts:
    print(f"\n🎯 The certificate will use: {Path(found_fonts[0]).name}")
    print(f"   (First available font in priority list)")
else:
    print("\n⚠️  No elegant script fonts found!")
    print("   The certificate will use the default system font.")
    print("\n📥 To get the best font style, download 'Great Vibes' font:")
    print("   https://fonts.google.com/specimen/Great+Vibes")
    print("   Then install it on your system.")
