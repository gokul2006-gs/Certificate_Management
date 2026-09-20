"""
Verify Great Vibes font can be loaded from backend folder
"""
import os
import sys

# Add backend to path
sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings

print("\n" + "=" * 70)
print("VERIFYING GREAT VIBES FONT")
print("=" * 70 + "\n")

# Check the path
font_path = os.path.join(settings.BASE_DIR, "Great_Vibes", "GreatVibes-Regular.ttf")
print(f"Checking: {font_path}")

if os.path.exists(font_path):
    print(f"✅ FOUND: Great Vibes font file exists!")
    
    # Try to load it with PIL
    try:
        from PIL import ImageFont
        font = ImageFont.truetype(font_path, 48)
        print(f"✅ SUCCESS: Font loads correctly with PIL/Pillow")
        print(f"\n🎉 Great Vibes font is ready to use!")
        print(f"   Certificates will use this elegant script font.")
    except Exception as e:
        print(f"❌ ERROR: Could not load font with PIL: {e}")
else:
    print(f"❌ NOT FOUND: Font file does not exist at this path")
    print(f"\nSearching for font in backend folder...")
    
    for root, dirs, files in os.walk('backend'):
        for file in files:
            if 'great' in file.lower() and file.endswith('.ttf'):
                full_path = os.path.join(root, file)
                print(f"  Found: {full_path}")

print("\n" + "=" * 70 + "\n")
