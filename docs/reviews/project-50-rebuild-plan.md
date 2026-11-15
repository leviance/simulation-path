# Project 50 — xây lại bể nước SPH từ sản phẩm cuối

Nguồn chuẩn là Project 50, Mục 0 và Mục 3.4–3.6 của [đặc tả v4](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Không sửa đặc tả để hạ quy mô. Bản cũ chỉ có khoảng 100 hạt, capacity 384; đó không phải sản phẩm 5.000 hạt mà đặc tả yêu cầu.

## Đích đến

- C++20/SDL3 thật, 5.000 hạt SPH mặc định; 1.000 để học, 10.000 là mở rộng theo phần cứng. Tự viết kernel 2D, density, pressure, viscosity, uniform grid và tương tác tường.
- Dam-break, hồ nghỉ, vòi đổ và vật cản tròn kéo được. Có slider cho c/alpha/gravity, pause/step/reset, điều khiển keyboard, kiểm chứng riêng và số đo ngay trong cửa sổ, không chỉ terminal.
- Nước xanh tạo khối liên tục bằng trường phủ được dựng từ **tất cả vị trí hạt thật**; có lớp hạt, density, pressure, speed, support/neighbors. Không dùng hình nước vẽ sẵn hoặc layer che solver.
- Mô hình WCSPH 2D dùng areal density kg/m²; pressure có đơn vị N/m, không gọi là Pa của chất lỏng 3D. Boundary samples là xấp xỉ và collision giải tích giữ hạt trong bể kín; vật cản kinematic không phải rigid-body hai chiều.
- 12 bài theo mạch: khung/hạt → gravity/collision → kernel → density/tường → pressure → viscosity → grid → timestep → quy mô/hiển thị mặt nước → vòi → vật cản → nghiệm thu. Mỗi bài có code từ marker, vị trí gọi, thí nghiệm lỗi, DoD, bài tập và source đầy đủ.
- Canvas dùng cùng phương trình/đơn vị, dữ liệu số ở ngoài React, cập nhật readout có giới hạn. Bài học chờ Chạy, reduced-motion giữ pause; pointer capture, DPR, bàn phím và dispose đầy đủ.

## Bằng chứng cần thu

1. Kernel integral/gradient độc lập, pair force và viscosity power; grid so all-pairs ở neighbor/density/pressure/acceleration và trajectory nhỏ. Ca cân bằng zero-gravity được đặt tên rõ, không tự nhận đã chứng minh hydrostatics.
2. Dam-break và hồ 5.000 hạt thật: finite, mass/count, density distribution, dt, leakage và giới hạn nén; theo dõi toàn bộ hạt, không thay workload bằng LOD.
3. ZIP bằng từng byte, starter/12 checkpoint/final ở Debug/Release với một worker; CTest có deadline. Native render có capture và kiểm tương tác riêng.
4. Nội dung/markers, TypeScript, kiến trúc/Git hygiene, build website và mọi route P50; kiểm Canvas/web bằng server có sẵn. Tự kiểm localhost, không tự bật dev server.
5. Release benchmark ghi cấu hình máy, N, warm-up, repetitions, median/min–max, tách build grid/density/force/update/render. Không hứa FPS cho mọi máy.

Mỗi job có watchdog và deadline tổng; chỉ một job nặng mỗi lần. Chưa commit/push hoặc publish trong yêu cầu xây lại. Bản authored cũ được giữ trong `.validation/retired-project-50-*` cùng hash; output và thư viện không vào Git.
