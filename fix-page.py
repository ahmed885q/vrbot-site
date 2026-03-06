import re

with open('app/page.tsx', encoding='utf-8') as f:
    text = f.read()

def fix_mojibake_smart(text):
    result = []
    i = 0
    while i < len(text):
        c = text[i]
        code = ord(c)
        if 0x80 <= code <= 0xFF:
            run = []
            j = i
            while j < len(text) and 0x80 <= ord(text[j]) <= 0xFF:
                run.append(ord(text[j]))
                j += 1
            try:
                decoded = bytes(run).decode('utf-8')
                result.append(decoded)
                i = j
            except Exception:
                result.append(c)
                i += 1
        else:
            result.append(c)
            i += 1
    return ''.join(result)

fixed = fix_mojibake_smart(text)

with open('app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(fixed)

lines = fixed.split('\n')
print('Line 41:', lines[40][:80])
print('Line 42:', lines[41][:80])
print('Done!')
