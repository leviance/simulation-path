# Project 19 — Lambert tetrahedron

Project này dựng một tetrahedron bằng indexed mesh rồi tự tính flat Lambert lighting trên CPU. Final nối liền face normal, `surfaceToLight`, material, back-face culling, near-plane clipping, perspective projection và top-left rasterization.

## Build final

```powershell
cmake -S . -B build
cmake --build build --config Debug
./build/Debug/project_19_final.exe
```

## Build starter, checkpoint và tests

```powershell
cmake -S . -B build-all -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build-all --config Debug
ctest --test-dir build-all -C Debug --output-on-failure
```

SDL3 được khóa ở release 3.4.8. Mỗi thư mục `starter`, `checkpoints/01`…`07` và `final` là một snapshot độc lập; tests chỉ dùng code thuần trong `final/include` nên không mở cửa sổ.
