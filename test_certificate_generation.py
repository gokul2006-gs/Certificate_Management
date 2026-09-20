"""
Test script to generate a demo certificate
Run this from the backend directory: python test_certificate_generation.py
"""
import os
import sys
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Set up Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from PIL import Image, ImageDraw
from certificates.views import (
    _load_script_font,
    _format_certificate_date,
    _draw_centered_single_line
)

def create_demo_certificate():
    """Generate a demo certificate for testing"""
    
    # Use the empty template
    template_path = input("Enter path to empty certificate template (or press Enter for default): ").strip()
    if not template_path:
        template_path = "backend/media/certificate_templates/empty_template.png"
    
    if not os.path.exists(template_path):
        print(f"Error: Template not found at {template_path}")
        return
    
    # Open template
    template = Image.open(template_path).convert("RGB")
    width, height = template.size
    draw = ImageDraw.Draw(template)
    
    # Colors
    text_color = (21, 32, 54)
    accent_color = (227, 126, 26)
    
    # Helper function
    def box(fx1, fy1, fx2, fy2):
        return (int(width * fx1), int(height * fy1), int(width * fx2), int(height * fy2))
    
    # Test data
    student_name = "Vinotha H"
    course_name = "Full Stack Development"
    start_date = "2026-06-01"
    end_date = "2026-06-30"
    
    # Positioning
    name_box = box(0.220, 0.318, 0.780, 0.388)
    course_box = box(0.200, 0.470, 0.800, 0.532)
    date_box = box(0.300, 0.558, 0.700, 0.588)
    
    print(f"Generating certificate for: {student_name}")
    print(f"Course: {course_name}")
    print(f"Date range: {start_date} to {end_date}")
    
    # Draw student name
    _draw_centered_single_line(
        draw, student_name,
        name_box,
        max(68, int(width * 0.066)), text_color,
        font_loader=_load_script_font,
        min_size=max(34, int(width * 0.032)),
        stroke_width=0,
    )
    print("✓ Name added")
    
    # Draw course name
    _draw_centered_single_line(
        draw, course_name,
        course_box,
        max(64, int(width * 0.062)), text_color,
        font_loader=_load_script_font,
        min_size=max(32, int(width * 0.030)),
        stroke_width=0,
    )
    print("✓ Course name added")
    
    # Draw date
    issue_date = f"{start_date} to {end_date}"
    date_text = f"({_format_certificate_date(issue_date)})"
    _draw_centered_single_line(
        draw, date_text,
        date_box,
        max(22, int(width * 0.021)), accent_color,
        font_loader=_load_script_font,
        min_size=max(13, int(width * 0.012)),
        stroke_width=0,
    )
    print("✓ Date added")
    
    # Save output
    output_path = "demo_certificate_test.png"
    template.save(output_path)
    print(f"\n✅ Demo certificate saved to: {output_path}")
    print(f"Open the file to check the positioning!")

if __name__ == "__main__":
    try:
        create_demo_certificate()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
