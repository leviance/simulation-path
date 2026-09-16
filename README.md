# Simulation Path

Simulation Path là lộ trình học C++20, SDL3, đồ họa máy tính và mô phỏng số thông qua 78 mini project có thể chạy được. Thay vì học công thức hoặc API riêng lẻ, người học dùng chúng để lần lượt tạo framebuffer, renderer 3D trên CPU, mô phỏng vật lý, hệ hạt, chất lỏng, volume renderer, thế giới voxel và bộ UI của riêng mình.

Project 01–45 hiện đã có 337 bài tiếng Việt, 45 Canvas lab tương tác và 45 gói source độc lập. Project 46–78 đã có vị trí cùng dependency trong roadmap nhưng vẫn mang trạng thái **Sắp ra mắt**; chúng chưa được trình bày như tutorial hoàn chỉnh.

## Vì sao có lộ trình này?

Nhiều tài liệu C++ dạy cú pháp nhưng không cho người học thấy những dòng code đó kết hợp thành một chương trình lớn như thế nào. Ở chiều ngược lại, tài liệu về đồ họa và mô phỏng thường bắt đầu bằng công thức, engine hoặc GPU API khi người học chưa kịp xây trực giác về pixel, hệ tọa độ, timestep và cách kiểm chứng kết quả.

Simulation Path chọn con đường đi từ dưới lên:

- Bắt đầu bằng một pixel trong framebuffer và tự viết những primitive nhỏ nhất.
- Dùng chương trình tương tác để biến vector, lượng giác, projection và numerical integration thành thứ có thể kéo, chạy chậm và quan sát.
- Tự dựng renderer 3D trên CPU trước khi chuyển cùng dữ liệu và pipeline sang GPU.
- Xây mô phỏng từ trường hợp nhỏ có nghiệm hoặc invariant đã biết, rồi mới tăng quy mô và tối ưu.
- Luôn đo sai số, chi phí và điều kiện thất bại thay vì chỉ kết luận rằng hình ảnh “trông có vẻ đúng”.

Mục tiêu không phải hoàn thành thật nhanh 78 ứng dụng. Mục tiêu là hình thành khả năng tự tách một bài toán kỹ thuật thành dữ liệu, công thức, bước cập nhật, cách hiển thị và tiêu chí kiểm chứng — sau đó tự xây được project tiếp theo mà không cần chép nguyên một lời giải có sẵn.

## Lộ trình dành cho ai?

Lộ trình phù hợp với người đã biết những phần C++ cơ bản như biến, hàm, `struct`, vòng lặp và `std::vector`, nhưng chưa từng tự xây renderer hay simulator. Bạn không cần biết sẵn đồ họa 3D hoặc vật lý số; kiến thức toán được giới thiệu tại nơi nó thực sự được dùng và đi kèm Canvas để thử trực tiếp.

Nếu bạn hoàn toàn mới với lập trình, nên học trước cú pháp C++ nền tảng và cách dùng debugger. Nếu đã quen game engine, lộ trình vẫn hữu ích khi bạn muốn hiểu những tầng bên dưới `Draw`, camera, collision solver hoặc particle system.

## Sau lộ trình, người học hướng tới điều gì?

Khi hoàn thành các phần tương ứng, người học có thể:

- Tổ chức một ứng dụng C++/SDL3 có event loop, input, timing, framebuffer và vòng đời tài nguyên rõ ràng.
- Chuyển một công thức toán thành code, hình ảnh tương tác và test kiểm tra invariant.
- Tự viết các phần cốt lõi của pipeline 3D: transform, projection, clipping, rasterization, Z-buffer, lighting và texture mapping.
- Chọn và đánh giá timestep, integrator, collision response cùng các metric bảo toàn trong mô phỏng.
- Nhận ra khi nào thuật toán brute force không còn phù hợp, rồi chuyển sang spatial grid, tree, cách bố trí dữ liệu hoặc GPU compute.
- Đọc một bài toán lớn như molecular dynamics, fluid, volume rendering hay voxel world theo các lớp nhỏ có thể xây và kiểm chứng độc lập.

## Bản đồ 78 project

Các project được xếp theo dependency. Mỗi phần dùng trực tiếp công cụ và trực giác đã xây ở phần trước, thay vì bắt đầu lại bằng một bộ khung không được giải thích.

| Phần                                    | Project | Trọng tâm                                                                    |
| --------------------------------------- | ------: | ---------------------------------------------------------------------------- |
| SDL3, pixel và tương tác cơ bản         |   01–05 | Window, input, framebuffer, raster 2D và đổi hệ tọa độ                       |
| Học toán bằng chương trình tương tác    |   06–10 | Vector, lượng giác, dot product, transform và normal 3D                      |
| Tự dựng đồ họa 3D trên CPU              |   11–21 | Camera, projection, clipping, rasterizer, Z-buffer, lighting, texture và OBJ |
| Vật lý và numerical methods             |   22–26 | Projectile, integrator, collision, spring và chaos                           |
| Cấu trúc không gian và hiệu năng        |   27–32 | Brute force, spatial grid, quadtree, octree, Barnes–Hut, AoS/SoA             |
| Chuyển từ renderer CPU sang OpenGL/GLSL |   33–36 | Đối chiếu CPU/GPU, shader và ray marching                                    |
| GPU compute và hàng triệu phần tử       |   37–40 | Vector compute, particle, reduction, prefix sum và grid song song            |
| Mô phỏng phân tử                        |   41–45 | Lennard–Jones, molecular dynamics, periodic bounds và neighbor list          |
| Từ ô lưới đến chất lỏng                 |   46–51 | Cellular automata, heat, vector field, Stable Fluids và SPH                  |
| Ray, volume và giả lập X-ray            |   52–57 | Intersection, volume ray marching, detector, CT và Monte Carlo               |
| Voxel world kiểu Minecraft              |   58–64 | Chunk, hidden faces, ray picking, greedy meshing, streaming và terrain       |
| Tự xây UI cho simulator                 |   65–72 | Widget tree, layout, markup, style, event binding và scripting nhỏ           |
| Các project cầu nối tùy chọn            |   73–78 | Quaternion, BVH, thread pool, Fourier, Monte Carlo và floating point         |

Roadmap đầy đủ, tên từng project và trạng thái phát hành nằm trong [`course/roadmap.ts`](./course/roadmap.ts) và được hiển thị tại trang `/roadmap` khi website chạy local.

## Cách học một project

Mỗi project là một sản phẩm nhỏ hoàn chỉnh, không phải một nhóm bài lý thuyết rời nhau. Một vòng học được thiết kế như sau:

1. **Đọc thử thách đầu project.** Xem sản phẩm cần làm, input, hành vi, giới hạn và Definition of Done; thử tự thiết kế trước khi mở lời giải.
2. **Chạy starter.** Xác nhận bộ khung hiện có làm được gì và phần nào còn thiếu. Starter không chứa sẵn kiến thức của bài sau.
3. **Đi qua từng checkpoint.** Mỗi bài chỉ thêm một ý chính, giải thích dữ liệu đi vào, state thay đổi và kết quả phải nhìn thấy.
4. **Dùng Canvas như bàn thí nghiệm.** Kéo dữ liệu, tiến từng bước, đổi preset và đối chiếu tên biến với source C++.
5. **Cố ý làm sai.** Thực hiện các lỗi được gợi ý, dự đoán triệu chứng rồi hoàn tác; đây là cách phân biệt hiểu thuật toán với chỉ chép code.
6. **Kiểm chứng trước khi sang bài mới.** Chạy checklist, test và checkpoint độc lập. Cuối project, so lại với source hoàn chỉnh rồi làm bài tập mở rộng.

Nên học theo thứ tự, đặc biệt từ Project 01 đến 30, vì project sau thường dùng lại framebuffer, camera, fixed timestep hoặc công cụ kiểm thử của project trước. Một project có thể chia thành vài buổi; không cần ép toàn bộ challenge, tutorial và bài tập vào cùng một lần học.

## Cấu trúc của một bài học

Mỗi lesson đi theo cùng một nhịp để người học luôn biết mình đang giải quyết điều gì:

```text
vấn đề → trực giác và công thức → code từng thay đổi → chạy và quan sát
→ cố ý làm sai → kiểm chứng → bài tập mở rộng
```

Đầu project có challenge để tự làm trước. Cuối mỗi lesson có source đầy đủ tại đúng checkpoint; cuối project có final source, tests và ZIP chạy độc lập. Code block dùng One Dark Pro, còn Canvas lab dùng cùng tên biến và công thức với C++ để việc chuyển từ minh họa sang code không tạo thêm một lớp dịch thuật.

## Yêu cầu kỹ thuật

- Node.js `>=22.13.0` và npm.
- CMake `>=3.24`.
- Compiler C++20. Trên Windows, cấu hình đã được kiểm tra bằng Visual Studio 2022 với workload **Desktop development with C++**.
- Kết nối mạng ở lần configure CMake đầu tiên để tải SDL 3.4.8.
- Google Chrome để chạy smoke test trình duyệt trong `npm test`.

## Chạy website local

```bash
npm ci
npm run dev
```

Mở địa chỉ local mà terminal in ra, thường là `http://localhost:3000`. Website không có đăng nhập, database hoặc backend. Theme, bài gần nhất và tiến độ chỉ được lưu trong `localStorage` của trình duyệt.

Bản clone mới chỉ chứa nguồn chuẩn. Trước khi mở server, `npm run dev` tự tạo registry, source checkpoint, CMake và ZIP tải về. Lần sau, các file không đổi được giữ nguyên; ZIP chỉ được nén lại khi thiếu hoặc source thay đổi. Bước chuẩn bị có giới hạn 2 phút và không biên dịch SDL/C++.

Các lệnh kiểm tra:

```bash
npm run lint
npm run typecheck
npm run test:fast
npm run test:site
npm run check:git
npm test
```

`test:fast` tự chuẩn bị dữ liệu rồi kiểm tra Git, registry, giới hạn kích thước file, format, TypeScript, Canvas math và ZIP mà không build website. `npm test` chạy thêm production build, toàn bộ regression route/nội dung và smoke test Chrome cho theme, navigation, progress, search cùng Canvas. Chạy riêng `npm run test:browser` cũng tự build trước; `test:browser:built` chỉ dành cho pipeline đã có `dist` mới.

`test:site` đóng gói ZIP, build mới rồi kiểm tra HTML của toàn site, nội dung bài học và source contract. Lệnh này không mở trình duyệt hay bật server và có giới hạn tổng 8 phút. Dùng nó khi cần kiểm tra toàn bộ trang mà chưa chạy smoke test tương tác.

Mọi lệnh kiểm tra chính đều chạy qua process supervisor. Mỗi stage in tên và hard timeout trước khi bắt đầu; `test:fast` bị giới hạn 6 phút, riêng Playwright 3 phút, toàn bộ `test:browser` 10 phút và `npm test` 15 phút. Khi nhận `Ctrl+C`, `SIGTERM` hoặc hết giờ, supervisor dừng cả process tree — gồm Vinext, Playwright và các tiến trình npm con — rồi trả quyền điều khiển cho terminal. Trên Windows, việc dọn cây tiến trình dùng PID chính xác với `taskkill /T /F`. Mỗi stage còn có guardian theo dõi PID cha để tự dọn nếu terminal hoặc ứng dụng bị đóng cưỡng bức trước khi callback cleanup chạy.

## Cấu trúc source C++

Sau khi chạy `npm run generate:course` hoặc `npm run dev`, mỗi thư mục `examples/project-*` có cấu trúc:

```text
source-template/     cây source thay đổi theo checkpoint; có thể chứa nhiều src/, include/ và shader
assets/              asset dùng chung cho mọi checkpoint; không đặt asset lớn trong source-template
starter/             được sinh: bộ khung trước bài 1
checkpoints/01..NN/  được sinh: snapshot độc lập cho mỗi bài, chỉ có kiến thức tới bài tương ứng
final/               được sinh: chương trình hoàn chỉnh, không chứa macro ẩn bài sau
tests/               kiểm thử code thuần, không cần mở cửa sổ
CMakeLists.txt        output sinh từ template CMake dùng chung
README.md
```

Sau khi sửa `source-template`, tạo lại starter/checkpoint/final và kiểm tra không có file cũ:

```bash
npm run generate:checkpoints
npm run check:checkpoints
```

Tạo lại các gói ZIP trong `public/downloads`:

```bash
npm run package:projects
npm run check:packages
```

Không sửa trực tiếp `CMakeLists.txt`, `starter`, `checkpoints` hoặc `final`. Các file này được sinh từ nguồn chuẩn và không được Git theo dõi. `npm run dev` và `npm run build` đồng bộ course, chỉ đóng gói ZIP bị thiếu hoặc có source thay đổi. File không đổi được giữ nguyên để Vite tiếp tục dùng cache. Generator duyệt đệ quy, giữ nguyên cấu trúc thư mục và chia source dùng trên web thành một lazy chunk cho từng checkpoint. Asset không thay đổi theo bài phải đặt trong `assets/` ở thư mục gốc project để ZIP chỉ chứa một bản.

Metadata của mỗi project nằm trong `course/projects/pXX/`: `manifest.ts`, `learning.ts` và `lab.ts`. Xem [ARCHITECTURE.md](./ARCHITECTURE.md) trước khi thêm project mới; CI áp dụng file-size budget để registry và file dùng chung không phình dần theo 78 project.

## Build một project C++

Ví dụ với Project 01:

```bash
npm run generate:checkpoints
cmake -S examples/project-01-hello-pixels -B examples/project-01-hello-pixels/build -DBUILD_CHECKPOINTS=ON
cmake --build examples/project-01-hello-pixels/build --config Debug
ctest --test-dir examples/project-01-hello-pixels/build -C Debug --output-on-failure
```

Build mặc định tạo target final. `BUILD_CHECKPOINTS=ON` bổ sung starter và sáu target checkpoint. Mỗi project khóa SDL 3.4.8 bằng URL cùng SHA-256 và link qua `SDL3::SDL3`.

Lệnh sinh checkpoint chỉ cần chạy ở repository của website, không cần mở server. Nếu tải ZIP của một project từ trang Downloads, ZIP đã có đủ CMake, starter, checkpoint và final; bạn không cần Node.js hay npm để build gói đó.

## Những gì nên đưa vào commit

Chỉ commit nguồn chuẩn: bài học, metadata, Canvas, `source-template`, tests, assets, README và các công cụ sinh mã. Không dùng `git add -f` với những output đã có trong `.gitignore`: `course/generated`, `content/generated`, `content/registry.ts`, `lib/generated-checkpoint-sources*`, CMake/snapshot trong từng example và `public/downloads`.

`npm run check:git` phát hiện cả output đã bị force-add vào Git. CI cũng chạy kiểm tra này trước khi sinh dữ liệu. `.gitignore` chỉ ngăn file mới; với file đã được theo dõi từ trước, cần bỏ theo dõi riêng mà không xóa file trên máy.

File biên dịch như `.exe`, `.o`, `.pdb` cũng bị chặn. Riêng `.obj` có thể là file biên dịch hoặc mô hình Wavefront: bộ kiểm tra đọc chữ ký binary trong Git index để phân biệt, không cấm các mesh trong `assets/`. Không đưa file biên dịch vào thư mục source hay dùng `git add -f` để vượt qua quy tắc này.

Để kiểm tra quy trình từ một bản source sạch:

```bash
npm run test:clean-checkout
# Kiểm tra thêm production build và nội dung toàn site trong bản sao:
npm run test:clean-checkout -- --build
```

Lệnh này tạo một bản sao tạm chỉ chứa source, dùng lại dependencies đã cài, tạo lại toàn bộ output và đối chiếu ZIP với source. Sau lần chuẩn bị thứ hai, nội dung lẫn timestamp phải giữ nguyên và Git không được xuất hiện file mới cần commit. Lệnh có giới hạn tổng 10 phút, không bật server và không sửa lịch sử Git.

## Quy ước code dành cho người học

Source ưu tiên khả năng đọc và lần theo bằng debugger hơn số dòng ít:

- Setup đi theo thứ tự tuyến tính: tạo một tài nguyên, kiểm tra ngay, rồi mới tạo tài nguyên tiếp theo.
- Mỗi lời gọi SDL có thể thất bại được kiểm tra ở một nhánh riêng; không nối nhiều thao tác bằng `&&` hoặc `||`.
- Dùng biến trung gian có tên cho distance, elapsed time, màu và trạng thái thay vì toán tử ba ngôi lồng nhau.
- Chỉ tạo helper khi tên của nó diễn tả được một công việc cụ thể; không dùng lambda capture để che các đối số mà người học cần biết.
- Một statement dài có thể nằm trên một dòng và cuộn ngang, nhưng `if`, loop, lambda và từng bước thuật toán phải có block riêng dễ đọc.
- API và identifier giữ bằng tiếng Anh; phần giải thích bằng tiếng Việt tự nhiên và luôn nói rõ dữ liệu đi vào, dữ liệu thay đổi và kết quả quan sát được.

Đây là quy ước cho mã giảng dạy, không phải cuộc thi viết code ngắn nhất. Một cách viết tổng quát hoặc tối ưu hơn chỉ được đưa vào sau khi phiên bản trực tiếp đã được giải thích và chạy đúng.

## Quy ước biên soạn dành cho contributor

Phần “Thay đổi chính xác” trong mỗi lesson được tính trực tiếp từ hai source snapshot đã dùng để build; không chép code sang MDX rồi bảo trì một bản thứ hai. Một lesson mới chỉ hoàn tất khi checkpoint chạy độc lập, source hiển thị trên web khớp với file tải về và Definition of Done có thể kiểm tra được.

Bài trung gian chỉ liệt kê những tệp vừa thay đổi; bài cuối phải có đủ source, CMake và tests. Bảy phần chính của bài được khai báo trong `lib/lesson-sections.mjs`. Khi đổi tên một phần, thêm tiêu đề mới vào `aliases` của đúng phần đó: mục lục vẫn dẫn đến anchor cố định, còn tiêu đề hiển thị được viết tự nhiên theo nội dung. Test kiểm tra đủ bảy phần, không trùng, đúng thứ tự; tên mới không được khai báo sẽ bị báo lỗi.

Canvas lab dùng Canvas 2D + TypeScript, hỗ trợ chuột, bàn phím, pointer capture, device-pixel-ratio, reduced motion, pause, reset và mô tả thay thế bằng văn bản. Lab của từng lesson phải cho người học quan sát đúng bước đang được dạy, không chỉ mở phiên bản cuối rồi đổi tiêu đề. Công thức, biến và preset phải giữ đồng nhất với source C++.

## Mã nguồn mở và dữ liệu riêng tư

Repository không cần cấu hình hosting, authentication hoặc dịch vụ cloud. Bạn có thể fork, chạy local và đưa source lên GitHub công khai.

Thuộc tính `"private": true` trong `package.json` chỉ ngăn việc vô tình publish package lên npm; nó không làm GitHub repository thành private và không tạo màn hình đăng nhập.
