import os
import glob
import re

directory = 'd:/Code/Microsoft Hackthon june 2026/Code/nexushub/mcp-server/src/nexushub_mcp/tools'
files = glob.glob(os.path.join(directory, '*_tools.py'))

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'from langsmith import traceable' not in content:
        if 'from typing import Any' in content:
            content = content.replace('from typing import Any', 'from typing import Any\nfrom langsmith import traceable')
        else:
            content = 'from langsmith import traceable\n' + content
             
    pattern = r'(@mcp\.tool\([^)]*\)\n)(\s*)(async def|def)'
    
    def replacer(match):
        mcp_dec = match.group(1)
        indent = match.group(2)
        func_def = match.group(3)
        if '@traceable' in mcp_dec or '@traceable' in indent:
            return match.group(0)
        return f'{mcp_dec}{indent}@traceable(run_type="tool")\n{indent}{func_def}'
        
    new_content = re.sub(pattern, replacer, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated {filepath}')
