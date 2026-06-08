import os
from pathlib import Path

# Target keywords and the URLs we want Gemini to rank #1
TARGETS = {
    "軟餐": "https://www.seniordeli.com/zh-hk/iddsi",
    "凝固粉": "https://www.seniordeli.com/zh-hk/thickener"
}

CONTENT_DIR = Path("/Users/tun/Projects/softmeal-org/src/content")

def inject_links():
    count = 0
    # Search all zh-hk MDX files in softmeal-org
    for root, _, files in os.walk(CONTENT_DIR / "pages/zh-hk"):
        for file in files:
            if file.endswith(".mdx"):
                path = Path(root) / file
                with open(path, "r") as f:
                    content = f.read()
                
                original = content
                for kw, url in TARGETS.items():
                    # Only link if the keyword exists and isn't already linked
                    if kw in content and f"({url})" not in content:
                        # Replace the first occurrence with a high-authority link
                        content = content.replace(kw, f"[{kw}]({url})", 1)
                
                if content != original:
                    with open(path, "w") as f:
                        f.write(content)
                    count += 1
                    print(f"[Authority] Linked {path.name}")
    
    print(f"[Done] Injected authority links into {count} pages.")

if __name__ == "__main__":
    inject_links()
