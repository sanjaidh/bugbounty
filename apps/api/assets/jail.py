#!/usr/bin/env python3
"""
"Safe" calculator -- junior dev's take on sandboxing.
Blacklists a few dangerous keywords, then just calls eval().
"""

import sys

# Flag lives in flag.txt next to this script on the server -- it is NOT
# embedded here, since this source file itself is handed out to players.
# No fallback on purpose: if flag.txt is missing, the deploy is broken
# and this should fail loudly rather than leak a flag into the source.
with open("flag.txt") as f:
    FLAG = f.read().strip()

BANNED_SUBSTRINGS = [
    "import", "open(", "exec(", "eval(", "os.system",
    "subprocess", "__", "compile(", "input(",
]

SAFE_BUILTINS = {
    "getattr": getattr, "setattr": setattr, "chr": chr, "ord": ord,
    "str": str, "len": len, "print": print, "range": range,
    "list": list, "int": int, "dict": dict, "tuple": tuple,
    "True": True, "False": False, "None": None,
}

def is_safe(code: str) -> bool:
    lowered = code.lower()
    for bad in BANNED_SUBSTRINGS:
        if bad in lowered:
            return False
    return True

def main():
    print("=== SafeCalc v1.0 ===")
    print("Enter a Python expression. Dangerous keywords are blocked.")
    while True:
        try:
            line = input(">>> ")
        except EOFError:
            break
        if line.strip() in ("quit", "exit"):
            break
        if not is_safe(line):
            print("Blocked: forbidden keyword detected.")
            continue
        try:
            result = eval(line, {"__builtins__": SAFE_BUILTINS}, {})
            print(result)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()
