"""
Check which font will be used: Great Vibes or Monotype Corsiva
"""
import os

fonts = [
    ("Great Vibes", "C:/Windows/Fonts/GreatVibes-Regular.ttf"),
    ("Great Vibes", "C:/Windows/Fonts/GreatVibes.ttf"),
    ("Monotype Corsiva", "C:/Windows/Fonts/MTCORSVA.TTF"),
]

print("\n" + "=" * 60)
print("CERTIFICATE FONT CHECK")
print("=" * 60 + "\n")

selected_font = None
for font_name, font_path in fonts:
    if os.path.exists(font_path):
        if not selected_font:
            selected_font = (font_name, font_path)
            print(f"✅ USING: {font_name}")
            print(f"   Path: {font_path}")
        else:
            print(f"✓  Available: {font_name}")
    else:
        print(f"✗  Not found: {font_name}")

print("\n" + "=" * 60)

if selected_font:
    print(f"\n🎯 Certificates will use: {selected_font[0]}")
    print("   This elegant script font will be used for:")
    print("   • Student names")
    print("   • Course titles")
    print("   • Duration dates")
else:
    print("\n⚠️  WARNING: No elegant script fonts found!")
    print("   Certificates will use default system font.")
    print("\n📥 TO FIX: Download and install Great Vibes font:")
    print("   https://fonts.google.com/specimen/Great+Vibes")

print()
