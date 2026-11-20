# Ghi lại cảnh voxel từ C++

Đây là công cụ biên tập, không nằm trong ZIP của người học. Mỗi target include đúng `checkpoints/NN/include/trail/scene.hpp` do generator tạo. Công cụ dùng cùng `Scene::update`, `Scene::draw`, atlas và framebuffer 800×450 như bản SDL3. Trừ cảnh đi bộ, camera đứng yên. Không vẽ lại cảnh bằng JavaScript hay nội suy hai ảnh tĩnh.

Sau khi đã sinh checkpoint của Project 61–64, chạy từ gốc repo:

```sh
cmake -S scripts/voxel-media -B .validation/voxel-web-editorial
cmake --build .validation/voxel-web-editorial --config Release --parallel 2
python scripts/voxel-media/encode.py .validation/voxel-web-editorial/Release ffmpeg public/field-notes/voxel-expedition
```

Nếu dùng Ninja một cấu hình, bỏ `/Release` trong đường dẫn executable. Python cần Pillow; FFmpeg cần bộ đọc MJPEG và encoder libvpx. Công cụ ghi lần lượt tám đoạn, mỗi đoạn 96 khung/24 fps, đồng thời lưu khung đầu không nén mất dữ liệu làm poster. Chỉ ghi một cảnh bằng `--only sea`. Clip không dùng để đo FPS. Các ảnh tĩnh riêng được chụp bằng executable tương ứng với `--landmark`, `--hour`, `--time` và `--capture`.
