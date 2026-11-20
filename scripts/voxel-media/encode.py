"""Encode native framebuffer takes for the course. No runtime dependency of the site."""
import argparse
import os
from pathlib import Path
import subprocess
import tempfile

from PIL import Image


# Filename, compiled project/checkpoint, native landmark (F5..F9), camera input.
TAKES = (
    ("wind", "61_2", 0, "still"),
    ("grass", "61_3", 0, "still"),
    ("cloud", "62_3", 0, "still"),
    ("river", "63_3", 1, "still"),
    ("sea", "63_4", 0, "still"),
    ("flakes", "64_1", 3, "still"),
    ("walk", "64_3", 1, "walk"),
    ("embers", "64_4", 4, "still"),
)


def record(take, binary, landmark, action, args):
    executable = args.build / ("take_" + binary + args.suffix)
    staging = Path(__file__).resolve().parents[2] / ".validation"
    staging.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=staging, prefix="voxel-take-") as folder:
        stream = Path(folder) / "native.mjpeg"
        poster = Path(folder) / "first.png"
        with subprocess.Popen([executable, str(landmark), action], stdout=subprocess.PIPE) as native:
            try:
                with stream.open("wb") as jpeg:
                    for number in range(96):
                        data = native.stdout.read(800 * 450 * 4)
                        if len(data) != 800 * 450 * 4:
                            raise RuntimeError(f"{take}: incomplete native frame {number}")
                        frame = Image.frombytes("RGBA", (800, 450), data).convert("RGB")
                        if number == 0:
                            first = data
                            frame.save(poster)
                        frame.save(jpeg, "JPEG", quality=94, subsampling=0)
                    if data == first:
                        raise RuntimeError(f"{take}: no motion between first and last frames")
                if native.wait(timeout=5) != 0:
                    raise RuntimeError(f"{take}: native capture failed")
            finally:
                if native.poll() is None:
                    native.kill()
        movie = Path(folder) / "take.webm"
        subprocess.run([args.ffmpeg, "-hide_banner", "-loglevel", "error", "-f", "image2pipe",
                        "-framerate", "24", "-c:v", "mjpeg", "-i", str(stream), "-an",
                        "-c:v", "libvpx", "-pix_fmt", "yuv420p", "-b:v", "950k",
                        "-deadline", "good", "-cpu-used", "4", "-threads", "2", str(movie)],
                       check=True, timeout=35)
        # The public directory and .validation live on the same workspace volume.
        os.replace(movie, args.out / (take + ".webm"))
        os.replace(poster, args.out / (take + ".png"))
        print(f"{take}: 96 native frames; {movie.stat().st_size:,} bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("build", type=Path, help="directory with the compiled take executables")
    parser.add_argument("ffmpeg", help="FFmpeg with an MJPEG decoder and libvpx encoder")
    parser.add_argument("out", type=Path)
    parser.add_argument("--only", choices=[take[0] for take in TAKES], nargs="+")
    args = parser.parse_args()
    args.suffix = ".exe" if os.name == "nt" else ""
    args.out.mkdir(parents=True, exist_ok=True)
    for item in TAKES:
        if not args.only or item[0] in args.only:
            record(*item, args)
