# Source C++ dành cho người học

Mỗi thư mục `project-XX-*` giữ nguồn chuẩn trong `source-template/`, cùng tests, README và assets cần thiết. Các bản `starter/`, `checkpoints/`, `final/` và `CMakeLists.txt` được sinh từ nguồn chuẩn, không được lưu lặp lại trong Git.

## Nếu bạn clone repository từ GitHub

Tại thư mục gốc repository, chạy một lần trước khi build C++:

```bash
npm run generate:checkpoints
```

Lệnh này cần Node.js nhưng không cần mở website, không biên dịch SDL và không cần cài npm dependencies. Sau đó, vào thư mục project muốn học và làm theo README của project đó.

Nếu bạn đã chạy `npm run dev` hoặc `npm run build`, các bản source này đã được chuẩn bị sẵn.

## Nếu bạn tải ZIP từ trang Downloads

Giải nén rồi làm theo README trong ZIP. Gói đã có đủ starter, tất cả checkpoint, final, CMake và tests; không cần Node.js hay npm để build.

## Nếu bạn muốn đóng góp

Sửa `source-template/` thay vì sửa các bản được sinh. Chạy lại generator và tests trước khi gửi thay đổi. Chỉ commit nguồn chuẩn; không dùng `git add -f` để đưa checkpoint hoặc ZIP vào Git.

Xem thêm [hướng dẫn tại thư mục gốc](../README.md) và [quy ước kiến trúc](../ARCHITECTURE.md).
