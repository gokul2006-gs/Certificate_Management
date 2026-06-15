"""
Find the installed Great Vibes font
"""
import os
import glob

print("\n" + "=" * 70)
print("SEARCHING FOR GREAT VIBES FONT")
print("=" * 70 + "\n")

# Check system fonts
system_fonts = "C:/Windows/Fonts"
print(f"Checking system fonts: {system_fonts}")
if os.path.exists(system_fonts):
    for file in os.listdir(system_fonts):
        if 'great' in file.lower() or 'vibes' in file.lower():
            full_path = os.path.join(system_fonts, file)
            print(f"  ✅ FOUND: {file}")
            print(f"     Path: {full_path}")

# Check user fonts
user_fonts = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft\\Windows\\Fonts')
print(f"\nChecking user fonts: {user_fonts}")
if os.path.exists(user_fonts):
    for file in os.listdir(user_fonts):
        if 'great' in file.lower() or 'vibes' in file.lower():
            full_path = os.path.join(user_fonts, file)
            print(f"  ✅ FOUND: {file}")
            print(f"     Path: {full_path}")
else:
    print("  (User fonts directory not found)")

# Check if font is registered but with different name
print("\nChecking Windows font registry...")
try:
    import winreg
    key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                         r"SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts")
    i = 0
    while True:
        try:
            name, value, _ = winreg.EnumValue(key, i)
            if 'great' in name.lower() or 'vibes' in name.lower():
                print(f"  ✅ FOUND in registry: {name}")
                print(f"     File: {value}")
                if not value.startswith('C:'):
                    # Relative path, prepend Windows\Fonts
                    full_path = os.path.join('C:', 'Windows', 'Fonts', value)
                    print(f"     Full path: {full_path}")
                    if os.path.exists(full_path):
                        print(f"     ✓ File exists!")
                    else:
                        print(f"     ✗ File not found")
            i += 1
        except WindowsError:
            break
    winreg.CloseKey(key)
except Exception as e:
    print(f"  Could not check registry: {e}")

print("\n" + "=" * 70)
print("\nIf no Great Vibes font was found above, please:")
print("1. Download from: https://fonts.google.com/specimen/Great+Vibes")
print("2. Right-click the .ttf file and select 'Install for all users'")
print("3. Run this script again to verify")
print("=" * 70 + "\n")
