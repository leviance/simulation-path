# Phần VIII — toán cho đồ họa 3D, giả lập và hiệu năng

Ngày biên tập: 2026-10-30. Nguồn chuẩn là [Product Specification v4](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md), Project Index, bản đồ học, Phần VIII và ví dụ liên quan ở Phụ lục B. Báo cáo này không thay đặc tả sản phẩm.

## Trọng tâm đã chốt

Người dùng yêu cầu bỏ toàn bộ các project hiện tại của Phần VIII vì đi quá sâu vào vật lý. Kết quả mỗi project phải trực quan, thao tác được và gợi tò mò; toán/lập trình/giả lập/hiệu năng phục vụ việc xây sản phẩm đó.

Vì vậy, phần này không còn là Molecular Dynamics hoặc một chuỗi năm project vật lý lượng tử. Atomic Playground theo [video người dùng chọn](https://www.youtube.com/watch?v=OSAOh4L41Wg) được giữ thành **một project**, với công thức density orbital cung cấp sẵn, thay vì biến toàn phần thành khóa học nguyên tử.

## Năm sản phẩm mới

| Project | Kết quả người dùng tạo/khám phá                                  | Phần toán và lập trình tự xây                                                      |
| ------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 41      | Vỏ ốc/ống xoắn, dải Möbius, torus/knot có thể chỉnh và xuất mesh | Curve/surface sampling, topology/seam, frame, tangent/normal và regeneration       |
| 42      | Một triệu hạt biến đổi giữa các mô hình, có timeline và A/B      | Area sampling, CDF/barycentric, correspondence, interpolation/easing và GPU update |
| 43      | Fractal Mandelbulb 3D có camera/zoom và heatmap                  | Spherical recurrence, escape/DE, precision, march/quality budget và refinement     |
| 44      | Khối có thể nặn/khoét/ghép, xem slice và xuất mesh               | Scalar grid/brush, gradient, interpolation, topology và GPU count/scan/emit        |
| 45      | Đám mây orbital triệu điểm, cắt lớp, so sánh và đo phân bố       | Generic weighted sampling, GPU lifecycle/rendering, probes, error và performance   |

Các sản phẩm chia sẻ scaffold/primitive khi phù hợp nhưng có mục đích sử dụng riêng và source tự chứa. Không đổi thứ tự 78 project hoặc yêu cầu người học ghép nhiều ZIP để chạy.

## Ranh giới kiến thức

- Mỗi project bắt đầu bằng scene có thể thao tác, một câu hỏi dự đoán được và thay đổi code nhìn thấy kết quả; không mở bằng cả chương lý thuyết tách khỏi app.
- 41/42 là mesh/surface/morph, không phải mô phỏng vật liệu. Chuyển động được mô tả đúng là ánh xạ/nội suy đồ họa.
- 43 kế thừa cách ray march của 36 nhưng học recurrence/DE và kiểm work/precision qua một fractal mới, không chỉ đổi màu sphere/box.
- 44 chỉnh stored scalar field và trích mesh; khác primitive SDF 36 và khác block-world 58–64. Không có solver chất lưu hoặc cơ học.
- 45 nhận catalog density có nguồn/fixture; không buộc suy Schrödinger, quantum numbers, spin, energy levels, photon, coherent superposition hoặc probability current.
- Chú giải khoa học tối thiểu của 45 vẫn phải đúng: các điểm là mẫu vị trí, không phải triệu electron hoặc những electron đi theo quỹ đạo cổ điển. Công thức được cung cấp không có nghĩa được bỏ kiểm phân bố.
- Phần nền được cung cấp và phần tự viết phải nêu rõ trong giáo trình. Không để hidden prerequisites ở 48/52/73 hoặc một engine chưa được dạy.
- Có thí nghiệm A/B/lỗi có chủ đích, reference toán độc lập và counters/timings, nhưng chúng bổ trợ cho kết quả trực quan chứ không thay viewport.

## Quy mô theo đúng công việc

- 41: một preset ít nhất 65.536 vertices, controls resolution và bộ đếm mesh/memory.
- 42: ít nhất một triệu hạt update/draw thật trên GPU; năm triệu là mở rộng.
- 43: ảnh tính đầy đủ ít nhất 960×540, có preview/refinement và work budget theo pixels/ray steps/iterations.
- 44: ít nhất 128³ scalar samples, phân biệt sample/cell/active cell/triangle, kiểm capacity trước emit.
- 45: ít nhất một triệu mẫu hợp lệ ở cloud chính, năm triệu là mở rộng; không đếm điểm trùng/cấp phát thành dữ liệu đã sinh.

Không hứa FPS/speedup chung. Đo generate/upload/update/extract/draw và toàn frame; cancel/last-good/allocation failure và UI phản hồi là các cổng nghiệm thu riêng.

## Source hiện có chưa được thay

Roadmap và giao diện đã chuyển sang tên/sản phẩm mới với trạng thái **Chờ xây dựng lại**. Manifest/lesson/Canvas/C++ của 41–45 vẫn thuộc nhánh LJ/MD cũ, được giữ với nhãn **Bản cũ**. Chúng chưa triển khai các sản phẩm mới ở bảng trên; không dùng kết quả test MD để chứng nhận mesh/morph/fractal/sculpt/orbital sampling.

Có thể đối chiếu trực tiếp từ [manifest 41](../../course/projects/p41/manifest.ts), [manifest 42](../../course/projects/p42/manifest.ts), [README 43](../../examples/project-43-periodic-molecular-box/README.md), [README 44](../../examples/project-44-neighbor-list-skin/README.md) và [README 45](../../examples/project-45-molecular-lab-gpu/README.md). Không đổi nhãn route/download để làm như source đã được xây lại.

Đợt biên tập đặc tả và cập nhật giao diện chưa thay nội dung giảng dạy hoặc source mô phỏng. Các bản viết trước về MD/chuỗi orbital đã được thay bằng hướng mới này. Khi triển khai từng project cần thống nhất phạm vi thay nguồn cũ/dự phòng rồi đồng bộ metadata, lesson, source, Canvas, tests và ZIP.

Không xóa source cũ, không stage/commit/push/deploy và không bật dev server/native app. Đợt cập nhật giao diện chỉ kiểm dữ liệu roadmap/search, TypeScript, giới hạn kiến trúc, build website và các route liên quan; không biên dịch hoặc chạy lại bộ test mô phỏng C++.
