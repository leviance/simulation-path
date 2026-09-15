# Project 20 — Perspective checkerboard

Project này tự viết CPU texture mapper cho một quad nghiêng. Bản final so sánh affine UV với perspective-correct UV, nội suy `1/z`, `u/z`, `v/z`, clip UV tại near plane và sample checker texture bằng nearest filtering.

## Build final

```powershell
cmake -S . -B build
cmake --build build --config Debug
./build/Debug/project_20_final.exe
```

## Build starter, checkpoint và tests

```powershell
cmake -S . -B build-all -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build-all --config Debug
ctest --test-dir build-all -C Debug --output-on-failure
```

SDL3 được khóa ở release 3.4.8. `starter`, tám checkpoint và `final` đều chạy độc lập; CTest chỉ include code thuần trong `final/include` nên không mở window.
