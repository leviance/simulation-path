# Nguồn tham chiếu Project 46

Code, bố cục và các cảnh ở project này được viết cho giáo trình; không lấy code
hoặc assets từ một ứng dụng falling-sand bên ngoài.

- [SDL_LockTexture](https://wiki.libsdl.org/SDL3/SDL_LockTexture): quyền ghi, pitch
  theo byte và yêu cầu streaming texture. Không dựa vào nội dung pixel cũ của vùng lock.
- [SDL_CreateTexture](https://wiki.libsdl.org/SDL3/SDL_CreateTexture) và
  [SDL_SetTextureScaleMode](https://wiki.libsdl.org/SDL3/SDL_SetTextureScaleMode): tạo
  texture một pixel/ô và chọn nearest khi phóng lớn.
- [SDL_RenderCoordinatesFromWindow](https://wiki.libsdl.org/SDL3/SDL_RenderCoordinatesFromWindow):
  đổi tọa độ window qua logical presentation/viewport/scale trước khi tìm ô.
- [SDL_RenderReadPixels](https://wiki.libsdl.org/SDL3/SDL_RenderReadPixels): capture
  hữu hạn trước present, không đưa readback vào benchmark update hoặc draw submission.
- [SDL_RenderDebugText](https://wiki.libsdl.org/SDL3/SDL_RenderDebugText): font ASCII
  8×8 có sẵn cho panel học tập; không phải bộ dựng chữ tiếng Việt hay UI toolkit.

Mô hình được định nghĩa bằng chính các luật trong `rules.hpp`: cập nhật tại chỗ,
đánh dấu hai đầu swap, biên đóng và thứ tự quét công bố. Các ví dụ biết trước một
bước là oracle cho **luật này**, không là bằng chứng của một solver chất lưu liên tục.
