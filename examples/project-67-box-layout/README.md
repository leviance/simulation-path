# Project 67 — Đàn chim và bảng điều khiển tự xếp

Dùng lại đàn Boids của Project 28 và cây Widget của Project 66. Lần này bạn không viết tọa độ từng hàng nữa: đổi khoảng cách hoặc ẩn Reset thì cả cột tự dời, hai thanh Radius và Separation vẫn điều khiển đàn ở vị trí mới.

## Thử trước khi đọc lời giải

Tạo root chứa tiêu đề, một Group với ba nút, hai nhãn và hai slider, rồi đến footer. Group tự cao vừa bảy hàng; root cao cố định. Đổi chiều rộng từ 320 xuống 220, ẩn Reset rồi kéo Radius ngay giữa thanh mới. Tách hai câu hỏi: ảnh vẽ có đổi đúng không, và cú kéo có đặt bán kính về đúng 80 px không?

## Chạy bản hoàn chỉnh

Giải nén ZIP. Mở terminal **ở thư mục có CMakeLists.txt**. Cần C++20, CMake 3.24 trở lên; lần cấu hình đầu lấy đúng SDL 3.4.8. Không cần lấy thêm mã từ các project trước.

```powershell
cmake -S . -B build -DBUILD_CHECKPOINTS=ON
cmake --build build --config Release --target project_67_final --parallel 2
.\build\Release\project_67_final.exe
```

Với Ninja/Make, thêm `-DCMAKE_BUILD_TYPE=Release` lúc cấu hình; chạy `./build/project_67_final`. Muốn chạy riêng bài 5, thay tên target và executable bằng `project_67_checkpoint_5`. Không bật `BUILD_CHECKPOINTS` nếu chỉ cần bản hoàn chỉnh và tests.

## Trên bàn quan sát

Click gần một con chim để chọn nó. Pause giữ đàn tại chỗ; Radius đổi số hàng xóm quanh chim vàng, Separation đổi cách chúng tránh nhau khi tiếp tục bay. Neighbors chỉ bật/tắt lớp quan sát, không đổi solver. Tab/Shift+Tab chuyển focus; Enter/Space kích hoạt nút, mũi tên/Home/End chỉnh thanh kéo. N cho đàn đang dừng tiến đúng 1/60 giây, R khởi tạo lại đàn. T dựng lại riêng bố cục và dừng đồng hồ.

| Bài | Việc tự kiểm trong bản C++ |
| --- | --- |
| 1 | Cây đặt tay; Pause có góc trên trái (638,82) trong cửa sổ. |
| 2 | B bật/tắt lớp minh họa margin, border, padding và content. |
| 3 | Có số đo của root nhưng các nút chưa tự dời. |
| 4 | [ và ] đổi gap; − và = trên hàng phím số đổi padding. |
| 5 | Group có bảy hàng, cao 352. Pause ở (656,96), rộng 240. |
| 6 | H ẩn/hiện Reset; A/D thêm/xóa tối đa bốn Label. |
| 7 | Shift+mũi tên trái/phải thay width từng 20; resize cửa sổ cấp width theo window units. Mất focus/đổi hình học hủy gesture cũ. |
| 8 | O chuyển Radius giữa Fill và Fixed rộng 320. Trong bảng hẹp chỉ 158 pixel còn nhìn thấy. |
| 9 | F1 chạy audit; bật B để đọc kết quả và số lượt layout. |

## Kiểm bằng con số

Cộng chiều cao bảy hàng là 220; margin trên/dưới thêm 56, sáu gap thêm 48, padding và border thêm 28: Group cao 352. Ẩn Reset bỏ 36+8+8 = 52 nên còn 300. Thêm bốn Label (mỗi Label làm tăng 40) đưa Group từ 352 lên 512, root cần 620 nhưng vẫn chỉ cao 492. Hai margin cách nhau không gộp. Nếu tràn, clip chỉ cắt phần nhìn thấy; giá trị slider vẫn tính theo toàn bộ bounds.

```powershell
cmake --build build --config Debug --parallel 2
ctest --test-dir build -C Debug --output-on-failure --timeout 20
cmake --build build --config Release --parallel 2
ctest --test-dir build -C Release --output-on-failure --timeout 20
```

Kiểm thử không mở cửa sổ; chạy cả khi có NDEBUG. Đối chiếu thêm trên desktop: ẩn Reset rồi kéo slider, đổi width giữa một lần kéo, click vùng bị clip và dùng Tab sau khi xóa Label. 1.000 frame khi đàn bay không được gây thêm một lượt layout. Chương trình có `--smoke` (một frame), hoặc `--capture anh.png` để ghi lại hình từ chính renderer.

Đây là layout một cột. Không có wrap, scrolling hay flex-shrink; overflow không phải lời hứa về thanh cuộn. `source-template/` là nguồn biên tập trong repository; ZIP có starter, mỗi checkpoint, final, tests. Ảnh web lấy từ các executable này, không giả lập lại đàn chim bằng JavaScript.
