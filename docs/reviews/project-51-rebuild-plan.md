# Project 51 — khối nước 3D trên GPU

Nguồn chuẩn: Project 51, Mục 0 và Mục 3.4–3.6 của [đặc tả v4](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md). Mốc bắt buộc là 100.000 hạt SPH thật; 500.000/một triệu là mở rộng cần kiểm riêng trên phần cứng. Không dùng Canvas nhỏ hoặc chỉ đổi nhãn quy mô làm bằng chứng hoàn thành.

## Khoảng cách của bản hiện có

Pipeline đã có cubic spline 3D, density/force/integration, CSR count/scan/scatter, reduction và oracle CPU nhỏ. Tuy nhiên camera chiếu trực giao; fragment shader chỉ vẽ đĩa phẳng màu đơn; số đo chính nằm ở title/console, profiler chỉ đo cả batch. Chưa có bằng chứng scene động 100.000 hạt, thống kê leakage hoặc đồ họa đáp ứng hợp đồng sphere impostor có depth/shading. Nội dung đang mô tả các hạn chế này như sản phẩm cuối nên cần chỉnh đồng bộ với implementation.

## Sản phẩm sẽ hoàn thiện

- Bể 3D với perspective orbit/zoom, sàn ô lưới và đường biên; dam-break nhìn được từ mọi phía. Hạt có kích thước world-space, sphere impostor với normal/depth/shading, không chỉ đĩa phẳng 3 px. Vẽ đủ workload chuẩn; nếu giới hạn phần vẽ ở mốc mở rộng phải ghi rõ, không giảm phần physics.
- C++/SDL3/OpenGL 4.3 độc lập; UI hiển thị controls, N cấp phát/sống/cập nhật/vẽ, tick/time/dt, density distribution, boundary leakage và profiler từng pass. Có chế độ quan sát sạch và debug. Không dùng ImGui hoặc WebView.
- Giữ kernel 3D chuẩn hóa `1/(πh³)`, density kg/m³, pressure Pa và mass theo thể tích. GPU clear/count/scan/scatter, density, force, reduction và integration đều tự viết; kiểm CPU oracle độc lập nhỏ và fixture qua nhiều workgroup.
- Tách profiler GPU khỏi readback/CPU/UI và render. Không chờ bận, không `glFinish`; chỉ một batch đang chạy, poll fence timeout 0, giới hạn batch và process. Thống kê mô hình ghi riêng với thời gian pass.
- Scale ladder có mốc ít nhất 100.000 thật; preset nhỏ phục vụ bài học, không thay nghiệm thu. Kiểm GL limits/RAM/VRAM trước cấp phát, báo rõ workload không được phần cứng hỗ trợ. Không cam kết FPS.
- Giáo trình giải thích đúng chỗ đổi từ 2D sang 3D, std430, ownership/barrier, grid nhiều tầng, camera/render và kiểm chứng. Tự quyết số bài theo nội dung; code markers theo checkpoint, One Dark, bốn spaces, comment và mã đầy đủ. Canvas 2D hỗ trợ quan sát/oracle nhỏ, không giả là GPU benchmark.

## Bằng chứng cần thu

1. Kernel/gradient/đơn vị, pair pressure và viscosity, CSR ranges/permutation/neighbors/density/force/integration so CPU; tail và scan/reduction qua nhiều workgroup.
2. Build starter, mọi checkpoint, final ở Debug/Release; CTest thuần và GPU correctness thật; ZIP so từng byte với source.
3. Scene động tối thiểu 100.000 hạt: finite, density distribution, dt, leakage và count thật; ảnh/camera và tương tác native kiểm riêng. Các mốc nâng cao chỉ được ghi đã kiểm nếu thực sự chạy đạt.
4. Benchmark Release: máy/driver/N, warm-up, samples, median/phân tán; từng pass và tổng bước, không dùng thời gian enqueue làm thời gian GPU.
5. Website build, route, code/source/ZIP, Canvas mouse/keyboard/DPR/reduced-motion/dispose; kiểm local có sẵn, không tự bật server.

Giữ bản authored cũ trong `.validation/retired-project-51-*` kèm hash và trong lịch sử Git. Chỉ một job nặng mỗi lần, native build một worker, mỗi job có supervisor/deadline và dọn process tree. Không tự stage, commit, push hoặc publish trong yêu cầu xây Project 51.

## Tiến độ ngày 16/11/2026

Đã giữ 60 file tracked cũ tại `.validation/retired-project-51-GgwmTl` kèm SHA-256. Đã hoàn thiện renderer, UI/readout, profiler, 12 bài với 48 marker C++/GLSL, benchmark hữu hạn, fixture lực khác 0 và scan nhiều workgroup. ZIP cuối gồm 703 file, đã so byte, build/CTest đủ Debug/Release, chạy sáu fixture GPU và cảnh động 110.592 hạt. Sau khi tách `GpuBatchError`, Controls và oracle phụ ném tiếp lỗi fence/deadline tới main; gói mới đã được build/kiểm lại, không tái dùng log scale cũ. Website/Canvas/local browser được kiểm độc lập; source viewer và ZIP HTTP khớp gói mới.

Các con số pilot trước khi đổi khối ban đầu xuống sát đáy không dùng để nghiệm thu source mới. Bằng chứng hiện tại và phạm vi kiểm được ghi tại [báo cáo xây lại Project 51](project-51-rebuild-validation.md).

**Đã chốt nghiệm thu ngày 16/11/2026:** người dùng trả lời “project đã đạt yêu cầu” cho yêu cầu tự kiểm Checklist tương tác native trong README. Xác nhận này được ghi riêng với kiểm tự động; agent không nhận đã trực tiếp bấm các nút/phím C++. Lượt Computer Use trước đó hết thời gian chờ cấp quyền và guardian đóng đúng hạn vẫn không tính PASS. Đã gỡ ghi chú chờ nghiệm thu, giữ `replacement` để bảo toàn trạng thái/liên kết; chưa tự commit/push/publish.
