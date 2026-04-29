Import("env")
import subprocess, os, shutil

def merge_firmware(source, target, env):
    build_dir   = env.subst("$BUILD_DIR")
    project_dir = env.subst("$PROJECT_DIR")

    bootloader = os.path.join(build_dir, "bootloader.bin")
    partitions = os.path.join(build_dir, "partitions.bin")
    firmware   = os.path.join(build_dir, "firmware.bin")
    merged_out = os.path.join(project_dir, "merged_firmware.bin")

    if not all(os.path.exists(f) for f in [bootloader, partitions, firmware]):
        print("merge_firmware: one or more source .bin files not found, skipping merge")
        return

    # esptool is bundled with the PlatformIO espressif32 platform
    esptool = os.path.join(
        env.subst("$PROJECT_PACKAGES_DIR"),
        "tool-esptoolpy", "esptool.py"
    )
    python  = env.subst("$PYTHONEXE")

    cmd = [
        python, esptool,
        "--chip", "esp32",
        "merge_bin",
        "-o", merged_out,
        "--flash_mode", "dio",
        "--flash_freq", "40m",
        "--flash_size", "4MB",
        "0x1000",  bootloader,
        "0x8000",  partitions,
        "0x10000", firmware,
    ]

    print("\n>>> Merging bootloader + partitions + firmware ...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        size_kb = os.path.getsize(merged_out) // 1024
        print(f">>> merged_firmware.bin created ({size_kb} KB) — flash at 0x0\n")
    else:
        print(f">>> Merge failed: {result.stderr}\n")

env.AddPostAction("$BUILD_DIR/firmware.bin", merge_firmware)
