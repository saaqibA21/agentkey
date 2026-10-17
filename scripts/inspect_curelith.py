import re

path = r"C:\Users\SAAQIB\.gemini\antigravity\brain\19f82505-fd70-438c-be73-e19fd3440e22\.system_generated\steps\403\content.md"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Find all a tags
links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
print(f"Total links found: {len(links)}")
for href, text in links:
    clean = re.sub(r'<[^>]+>', '', text).strip()
    print(f"Link: {href} | Label: {clean}")

# Find all forms / inputs
forms = re.findall(r'<form[^>]*>(.*?)</form>', html, re.IGNORECASE | re.DOTALL)
print(f"\nTotal forms found: {len(forms)}")
for form in forms:
    print("Form content snippet:", form[:200])

buttons = re.findall(r'<button[^>]*>(.*?)</button>', html, re.IGNORECASE | re.DOTALL)
print(f"\nTotal buttons found: {len(buttons)}")
for btn in buttons:
    clean_btn = re.sub(r'<[^>]+>', '', btn).strip()
    print(f"Button: {clean_btn}")
