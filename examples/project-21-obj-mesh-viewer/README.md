# Project 21 — OBJ mesh viewer

Project này tự đọc Wavefront OBJ rồi render model bằng CPU pipeline: face-token parser, negative index, triangle-fan triangulation, mesh normalization, Lambert shading, near-plane clipping, top-left rasterization và Z-buffer.

Asset `assets/low-poly-rocket.obj` được tạo riêng cho khóa học và phát hành theo CC0-1.0. Parser chỉ dùng position của `v`/`f`; `vt`, `vn`, material và smoothing group được nhận diện nhưng chưa dùng trong project này.

## Build final

```powershell
cmake -S . -B build
cmake --build build --config Debug
./build/Debug/project_21_final.exe
```

## Build starter, checkpoint và tests

```powershell
cmake -S . -B build-all -DBUILD_CHECKPOINTS=ON -DBUILD_TESTING=ON
cmake --build build-all --config Debug
ctest --test-dir build-all -C Debug --output-on-failure
```

SDL3 được khóa ở release 3.4.8. `starter`, tám checkpoint và `final` chạy độc lập; CTest chỉ include code thuần trong `final/include` nên không mở window.
