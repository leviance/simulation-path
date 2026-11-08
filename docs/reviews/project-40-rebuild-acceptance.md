# Project 40 — Bảng bằng chứng nghiệm thu xưởng vải 3D

Nguồn chuẩn: [Product Specification v4, Project 40](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md#project-40--xưởng-vải-3d-kéo-ghim-và-thả-vải-phủ-lên-vật-thể). Bảng này ghi bằng chứng theo từng cổng; không suy từ build xanh sang tính đúng vật lý, tương tác native hay quy mô GPU.

| Cổng              | Bằng chứng cần thu                                                                                                            | Trạng thái                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Giáo trình        | 14 bài biên dịch MDX; đủ bảy vai trò; code trích liên tiếp đúng checkpoint; glossary và route/source đồng bộ                  | Chờ chạy kiểm tra                         |
| C++ Debug         | Configure/build final và checkpoint; CTest fixture CPU với timeout                                                            | Chờ chạy kiểm tra                         |
| C++ Release       | Configure/build và CTest; không có NaN/Inf hoặc ghi ngoài vùng                                                                | Chờ chạy kiểm tra                         |
| Ràng buộc         | Oracle độc lập một/hai constraints; inverse mass, pin, compliance, zero distance, input lỗi; CPU/GPU cùng scheme              | Chờ chạy fixture                          |
| Grid và contact   | count=N; offset/range; ID không mất/trùng; cell rỗng/đông; loại kề; sát thickness; candidate/contact so brute force           | Chờ chạy fixture                          |
| Analytic          | Normal, signed distance và penetration plane/sphere/capsule có đáp án hình học riêng                                          | Chờ chạy fixture                          |
| Solver hữu hạn    | Residual/penetration qua các cấu hình h và iteration; đơn vị/tolerance và finite policy được công bố                          | Chờ thu số đo                             |
| GPU tối thiểu     | Ít nhất 100.000 đỉnh động; toàn constraints/contact/velocity/normals GPU; dynamic/pinned/updated/drawn, bytes và pass timings | Chờ chạy GPU thật                         |
| GPU mở rộng       | Một triệu đỉnh; ngân sách RAM/VRAM/candidates, cấu hình, lý do từ chối hoặc kết quả riêng                                     | Chưa kiểm chứng; không phải cổng hạ chuẩn |
| Hình ảnh native   | Treo/phủ sphere/rơi bàn; ánh sáng hai mặt, pattern, nếp gấp, không nổ hoặc xuyên rõ rồi báo PASS                              | Cần kiểm trên executable                  |
| Input native      | Orbit/pan/zoom; pin/unpin/drag/release/cancel/blur; Pause/single-step/Reset; đổi topology hủy job/drag cũ                     | Cần kiểm thao tác                         |
| Jobs và ngân sách | Validation/benchmark hữu hạn, tiến độ/Cancel/deadline; candidate quá tải bị từ chối rõ; scene trước vẫn hợp lệ                | Chờ kiểm hành vi                          |
| Canvas            | CPU thu nhỏ, các mode, input/capture/blur/resize/Pause, không gắn kết quả Canvas với quy mô GPU                               | Chờ kiểm trình duyệt                      |
| Source và ZIP     | Starter/checkpoint/final tự chứa; cuối bài hiện full code; Debug/Release commands; ZIP final đúng byte/digest                 | Chờ kiểm package                          |

## Phạm vi mô hình

- Stretch/shear và bend-distance là ràng buộc khoảng cách; bend-distance không phải mô hình góc nhị diện đầy đủ.
- Self-contact theo vertex với thickness công bố, không phải edge/triangle CCD và không bảo đảm chống xuyên mọi tốc độ.
- Compliance (m/N), damping rate (1/s), friction fraction (không đơn vị mỗi substep contact), thickness (m) và sai số solver có ý nghĩa khác nhau.
- Một triệu đỉnh là mốc mở rộng riêng. Máy chưa chạy được phải ghi chưa kiểm chứng, không giảm mốc tối thiểu 100.000 đỉnh động.
- Giáo trình, tests và bảng này không đưa ra cam kết FPS chung.
