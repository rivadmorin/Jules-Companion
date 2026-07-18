#!/usr/bin/env python3
# semantic_merge.py
# A script to extract additions from a patched jules session and apply them to src/sources.rs on main.

import sys
import os
import re
import subprocess
import tempfile
import shutil

def get_file_content_at_commit(filepath, commit):
    cmd = ["git", "show", f"{commit}:{filepath}"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error getting file at commit {commit}: {result.stderr}")
        sys.exit(1)
    return result.stdout

def find_quoted_string_after_keyword(text, keyword):
    idx = text.find(keyword)
    if idx == -1:
        return None
    start_quote = text.find('"', idx + len(keyword))
    if start_quote == -1:
        return None
    end_quote = text.find('"', start_quote + 1)
    if end_quote == -1:
        return None
    return text[start_quote + 1 : end_quote]

def main():
    if len(sys.argv) < 2:
        print("Usage: semantic_merge.py <patch_file> [target_file] [base_commit]")
        sys.exit(1)
        
    patch_file = os.path.abspath(sys.argv[1])
    target_file = sys.argv[2] if len(sys.argv) > 2 else "src/sources.rs"
    base_commit = sys.argv[3] if len(sys.argv) > 3 else "384d5fa7ac33593212ee4ddd417b10956e0ed3a1"
    
    # 1. Read current target file
    if not os.path.exists(target_file):
        print(f"Error: Target file {target_file} not found.")
        sys.exit(1)
        
    with open(target_file, "r") as f:
        current_content = f.read()
        
    # 2. Get base target file content at base commit
    base_content = get_file_content_at_commit(target_file, base_commit)
    
    # 3. Apply patch in a temporary isolated git repository
    with tempfile.TemporaryDirectory() as tmpdir:
        base_file_path = os.path.join(tmpdir, os.path.basename(target_file))
        with open(base_file_path, "w") as f:
            f.write(base_content)
            
        os.makedirs(os.path.join(tmpdir, os.path.dirname(target_file)), exist_ok=True)
        shutil.move(base_file_path, os.path.join(tmpdir, target_file))
        
        subprocess.run(["git", "init"], cwd=tmpdir, capture_output=True)
        subprocess.run(["git", "config", "user.name", "temp"], cwd=tmpdir, capture_output=True)
        subprocess.run(["git", "config", "user.email", "temp@temp.com"], cwd=tmpdir, capture_output=True)
        subprocess.run(["git", "add", target_file], cwd=tmpdir, capture_output=True)
        subprocess.run(["git", "commit", "-m", "initial"], cwd=tmpdir, capture_output=True)
        
        shutil.copy(patch_file, os.path.join(tmpdir, "patch.diff"))
        
        result = subprocess.run(["git", "apply", f"--include={target_file}", "patch.diff"], cwd=tmpdir, capture_output=True)
        if result.returncode != 0:
            print(f"Error applying patch to base commit: {result.stderr.decode()}")
            sys.exit(1)
            
        with open(os.path.join(tmpdir, target_file), "r") as f:
            patched_content = f.read()
            
    # 4. Extract additions from patched_content compared to base_content
    
    # A. Extract feeds from patched_content using robust parser
    feeds = []
    for block in re.findall(r'FeedSource\s*\{([^\}]+)\}', patched_content):
        url = find_quoted_string_after_keyword(block, 'url:')
        cat = find_quoted_string_after_keyword(block, 'category:')
        name = find_quoted_string_after_keyword(block, 'source_name:')
        if url and cat and name:
            feeds.append({
                'url': url,
                'category': cat,
                'source_name': name
            })
            
    base_urls = set(re.findall(r'url:\s*"([^"]+)"', base_content))
    for url in re.findall(r'url:\s*Box::leak\(\s*"([^"]+)"', base_content):
        base_urls.add(url)
        
    new_feeds = [f for f in feeds if f['url'] not in base_urls]
    
    added_categories = set(f['category'] for f in new_feeds)
    if not added_categories:
        with open(patch_file, "r") as pf:
            patch_content = pf.read()
        for cat in ["Lifestyle", "Crypto", "Security", "AI", "Tech", "Legal", "Science", "Health", "Sports", "Environment", "Gaming", "Entertainment", "Finance", "Auto", "Geopolitics"]:
            if cat.lower() in patch_content.lower():
                added_categories.add(cat)
                
    print(f"Added categories found: {added_categories}")
    
    # B. Extract keyword vectors from patched_content
    base_lets = set(re.findall(r"let\s+(\w+)\s*=", base_content))
    patched_lets = re.findall(r"let\s+(\w+)\s*=\s*vec\!\[.*?\];", patched_content, re.DOTALL)
    
    vectors = {}
    for var_name in patched_lets:
        if var_name not in base_lets and var_name != "extra_feeds" and var_name != "categories_kws" and not var_name.startswith("categories"):
            pattern = rf"let\s+{var_name}\s*=\s*vec\!\[.*?\];"
            match = re.search(pattern, patched_content, re.DOTALL)
            if match:
                var_code = match.group(0)
                if "FeedSource" not in var_code and "url:" not in var_code:
                    vectors[var_name] = var_code
                
    # C. Extract category mappings from patched_content
    mappings = []
    for match in re.finditer(r'\(\s*"([^"]+)"\s*,\s*(.*?)\s*\)', patched_content):
        cat_name = match.group(1)
        rest = match.group(2)
        parts = [p.strip().strip('"') for p in rest.split(',')]
        if len(parts) == 1:
            kws_var = parts[0]
            if "id" in kws_var or "indo" in kws_var:
                lang = "id"
            elif "en" in kws_var or "global" in kws_var or "us" in kws_var:
                lang = "en"
            else:
                lang = "id" if cat_name in ["Indonesia", "Sports_ID", "Sports"] else "en"
        elif len(parts) == 2:
            if parts[1] in ["true", "false"]:
                kws_var = parts[0]
                lang = "id" if parts[1] == "true" else "en"
            else:
                lang = parts[0]
                kws_var = parts[1]
        elif len(parts) == 3:
            lang = parts[0]
            kws_var = parts[1]
        else:
            continue
            
        valid_categories = {"Indonesia", "Finance", "Geopolitics", "Tech", "AI", "Sports", "Environment", "Gaming", "Auto", "Legal", "Science", "Health", "Crypto", "Security", "Lifestyle", "Entertainment"}
        if cat_name in valid_categories and "feed" not in kws_var.lower():
            base_categories = {"Indonesia", "Finance", "Geopolitics", "Tech", "AI"}
            if cat_name in added_categories or cat_name not in base_categories:
                mappings.append({
                    'category': cat_name,
                    'lang': lang,
                    'kws_var': kws_var
                })

    # Auto-generate mappings for extracted vectors if explicit mappings are missing
    existing_mapping_vars = set(m['kws_var'] for m in mappings)
    for var_name in vectors.keys():
        if var_name not in existing_mapping_vars:
            for cat in added_categories:
                if cat.lower() in var_name.lower():
                    if "id" in var_name or "indo" in var_name:
                        lang = "id"
                    elif "en" in var_name or "global" in var_name or "us" in var_name:
                        lang = "en"
                    else:
                        lang = "en"
                    mappings.append({
                        'category': cat,
                        'lang': lang,
                        'kws_var': var_name
                    })

    print(f"Extracted {len(new_feeds)} feeds from patch.")
    print(f"Extracted vectors: {list(vectors.keys())}")
    print(f"Extracted mappings: {mappings}")
    
    # 5. Insert new vectors into current_content
    new_vectors_inserted = []
    for var_name, var_code in vectors.items():
        if f"let {var_name}" not in current_content:
            idx = current_content.find("let categories_kws = vec![")
            if idx != -1:
                current_content = current_content[:idx] + var_code + "\n\n" + current_content[idx:]
                new_vectors_inserted.append(var_name)
    if new_vectors_inserted:
        print(f"Inserted vectors: {new_vectors_inserted}")
        
    # 6. Insert new feeds into extra_feeds in current_content
    new_feeds_inserted = 0
    feeds_code_lines = []
    for feed in new_feeds:
        if feed['url'] not in current_content:
            feed_code = f"""        FeedSource {{
            url: "{feed['url']}",
            category: "{feed['category']}",
            source_name: "{feed['source_name']}",
        }},"""
            feeds_code_lines.append(feed_code)
            new_feeds_inserted += 1
            
    if feeds_code_lines:
        idx = current_content.find("let extra_feeds = vec![")
        if idx != -1:
            bracket_count = 0
            for i in range(idx + len("let extra_feeds = vec!["), len(current_content)):
                if current_content[i] == '[':
                    bracket_count += 1
                elif current_content[i] == ']':
                    if bracket_count == 0:
                        insert_idx = i
                        feeds_str = "\n" + "\n".join(feeds_code_lines) + "\n"
                        current_content = current_content[:insert_idx] + feeds_str + current_content[insert_idx:]
                        break
                    else:
                        bracket_count -= 1
        print(f"Inserted {new_feeds_inserted} new feeds into extra_feeds.")
        
    # 7. Insert new category mappings into categories_kws in current_content
    mappings_inserted = []
    for m in mappings:
        dup_pattern = rf'\(\s*"{m["category"]}"\s*,\s*"{m["lang"]}"\s*,\s*{m["kws_var"]}\s*\)'
        if not re.search(dup_pattern, current_content):
            mapping_code = f'        ("{m["category"]}", "{m["lang"]}", {m["kws_var"]}),'
            idx = current_content.find("let categories_kws = vec![")
            if idx != -1:
                bracket_count = 0
                for i in range(idx + len("let categories_kws = vec!["), len(current_content)):
                    if current_content[i] == '[':
                        bracket_count += 1
                    elif current_content[i] == ']':
                        if bracket_count == 0:
                            insert_idx = i
                            current_content = current_content[:insert_idx] + "\n" + mapping_code + "\n" + current_content[insert_idx:]
                            mappings_inserted.append(f'("{m["category"]}", "{m["lang"]}", {m["kws_var"]})')
                            break
                        else:
                            bracket_count -= 1
    if mappings_inserted:
        print(f"Inserted category mappings: {mappings_inserted}")
        
    with open(target_file, "w") as f:
        f.write(current_content)
        
    print("Semantic merge complete.")

if __name__ == "__main__":
    main()
