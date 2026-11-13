# Project 44 — kế hoạch triển khai Xưởng điêu khắc thể tích

Nguồn chuẩn: mục Project 44 trong Product Specification v4 complete. Slug dự kiến: `volume-sculptor`. Bản Neighbor List cũ vẫn giữ nguyên catalog trong khi bản mới được xây ở `examples/drafts/project-44-volume-sculptor`. Đây là kế hoạch triển khai, không phải hồ sơ nghiệm thu.

## Sản phẩm phải đạt

Công cụ C++20/SDL 3.4.8/OpenGL 4.3 có scalar grid lưu thật, cọ add/subtract và falloff, stroke liền, preview, undo/redo có giới hạn, orbit/pan/zoom, slice/probe/wireframe/normals, đổi isovalue/resolution, save/load và export mesh. Grid chính có 128³ samples (127³ cells), không lấy Canvas hoặc một bản CPU nhỏ thay cho quy mô này.

## Các quyết định kỹ thuật

- Field có dấu âm bên trong, dương bên ngoài; domain [-1,5; 1,5]³ và spacing = 3/(N−1). Sau brush, field tổng quát không còn là SDF. Picking dùng bước hữu hạn hoặc mesh, không sphere-trace tùy ý theo giá trị field.
- Chọn marching tetrahedra: mỗi cube chia sáu tetra quanh đường chéo 0–6, cùng định hướng ở mọi cell. Không dùng lookup table marching cubes không giải thích ambiguity. Edge interpolation sắp endpoint theo sample ID để hai owner tính cùng một giao điểm; f=iso thuộc phía outside. Count và emit cùng một quy tắc loại triangle suy biến.
- CPU là đường học/fixture nhỏ, giới hạn extraction 64³; không chạy toàn extraction CPU cho bản GPU 128³. Oracle plane/sphere độc lập kiểm vị trí, normal, convergence và shared faces.
- GPU tự init/edit field, count, exclusive scan và emit. Chunk 16³ cells có tối đa 147.456 vertices; count trước cấp phát. Các chunk lưu counts/offsets riêng; CPU chỉ đọc summary nhỏ để quyết định cấp phát. Capacity dự kiến 4.194.304 vertices, không âm thầm cắt mesh khi đầy.
- Dirty cells gồm vùng brush và halo phụ thuộc gradient. Camera không sửa field hoặc kích hoạt remesh. Snapshot/generation và publish toàn giao dịch giữ last-good khi hủy hoặc không đủ budget; chunk không thay đổi được tái sử dụng vì dữ liệu phụ thuộc không đổi.
- Một pointer owner cho stroke. Mất focus/cancel/reset hoặc đổi resolution phải đóng giao dịch, bỏ input cũ, không tiếp tục ghi vào grid mới. Stroke spacing phụ thuộc radius, không phụ thuộc FPS; giới hạn hàng đợi và số stamp mỗi batch.
- Undo/redo tối đa bốn snapshot stroke. Save/load/export là tác vụ rõ ràng, có bounds/checksum/parse và cancellation; việc đọc field để lưu/kiểm không được lẫn với extraction runtime.
- Giới hạn VRAM dự kiến 512 MiB; khai báo field/history/count/offset/mesh/temporary bytes, preflight capability và kiểm allocation. Mỗi dispatch/batch hữu hạn, fence deadline và process supervisor bên ngoài. Mục tiêu cao hơn 128³ chỉ là mở rộng theo budget, không thay preset bắt buộc.

## Nhịp giáo trình dự kiến

1. Một tetra tạo triangle: dấu, edge và nội suy nhìn thấy được.
2. Nối cell thành khối: world↔grid và sáu tetra nhất quán.
3. Normal/lighting và phát hiện crack, winding hoặc gradient sai.
4. Đặt cọ trong 3D rồi sửa scalar field nhỏ.
5. Stroke liền và undo/redo theo giao dịch.
6. Chuyển field init/edit lên GPU 128³ và kiểm byte/capability.
7. Đếm output và tự viết prefix scan có fixture.
8. Emit/draw mesh GPU trong capacity đã biết.
9. Dirty chunks, generation, cancel và last-good.
10. Ghép slice/probe, camera và các thay đổi isovalue/resolution.
11. Lưu/đọc field, xuất rồi đọc lại mesh hợp lệ.
12. Hoàn thiện, đo từng pass và kiểm sản phẩm đầy đủ.

Đây là số bài dự kiến theo khối kiến thức, được điều chỉnh nếu implementation cần nhịp khác; không giảm sản phẩm để vừa số bài. Mỗi bài phải có code thật, vị trí gọi vào app, thí nghiệm lỗi, checklist và bài tập bằng tiếng Việt tự nhiên. Khung window/GL loader/presentation/camera được công bố là phần cấp sẵn, không giả vờ người học đã tự biết nó.

## Các gate còn phải chứng minh

- CTest Debug/Release: mọi mask tetra, tie/degenerate, edge owner order, shared faces, plane/sphere và convergence; brush/resampling/undo/redo/cancel/reset, file parser và mesh indices.
- GPU thật: init/edit/count/scan/emit 128³, samples khác cells, tail guards/canary, capacity/allocation/cancel và field–mesh generation. Đo riêng brush/count/scan/emit/normals/draw, không gọi enqueue là kernel time.
- Sản phẩm trực tiếp: tạo lỗ và nối hai khối bằng cọ, dùng camera/slice/wireframe/normal, pointer capture/focus loss, undo/redo, save/load/export. Không lấy một ảnh đẹp thay kiểm toán/thuật toán.
- Website: challenge, bài học, source/snippets/One Dark, Canvas 2D hỗ trợ, glossary/search/progress revision, routes và ZIP cùng sản phẩm. Giải nén/build/CTest gói độc lập.
- Giữ nguồn và output cũ dự phòng khi chuyển catalog. Không commit snapshot, ZIP, build, downloaded SDL hoặc cả cây QA vào Git. Chỉ bỏ nhãn chờ nghiệm thu sau khi có bằng chứng đúng phạm vi.

Tham khảo thuật toán: [GPU Gems 3, Chapter 1](https://developer.nvidia.com/gpugems/gpugems3/part-i-geometry/chapter-1-generating-complex-procedural-terrains-using-gpu). Không đưa API DirectX hoặc meshing engine vào implementation OpenGL.
