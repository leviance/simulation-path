# Kiến trúc nội dung Simulation Path

Repository được tổ chức để đủ 78 project không biến thành một ứng dụng có vài file trung tâm khổng lồ. Mỗi project sở hữu nội dung, metadata giảng dạy, metadata Canvas và source C++ của chính nó. Các registry chỉ chứa metadata nhẹ hoặc hàm `import()` và được sinh tự động.

## Cấu trúc chính

```text
course/
  projects.json                 catalog project đã phát hành
  roadmap.ts                    tên và học phần của đủ 78 project
  projects/pXX/
    manifest.ts                 thử thách, mục tiêu và lesson metadata
    learning.ts                 code guide và reference của riêng project
    lab.ts                      tiêu đề và mode của Canvas lab
  generated/                    registry nhẹ; không sửa bằng tay
    progress/                   shard chỉ tải khi cần migrate localStorage cũ

content/<slug>/*.mdx            nội dung từng lesson
content/generated/pXX.ts        registry lesson riêng của từng project
components/labs/<demo>-lab.tsx  một lazy client chunk cho mỗi Canvas lab
examples/project-XX-<slug>/     project C++ build độc lập
```

`lib/course.ts` chỉ ghép roadmap với `project-summaries.ts`. Manifest đầy đủ chỉ được tải khi mở đúng project. Search, Canvas metadata, source checkpoint và lesson content đều dùng literal dynamic import để bundler tách chunk.

## Source C++ và checkpoint

`source-template/` giữ nguyên cấu trúc thư mục mà snapshot cần có:

```text
source-template/
  include/
  src/
  shaders/      tùy chọn; chỉ dành cho file thay đổi theo checkpoint
assets/         tùy chọn; dùng chung cho mọi checkpoint
```

Generator duyệt đệ quy nên project có thể có nhiều `.cpp`, `.hpp` hoặc shader thay đổi theo bài. Chỉ các định dạng text nằm trong allowlist mới được xử lý `LAB_CHECKPOINT`; mọi định dạng chưa biết mặc định là binary và được sao chép nguyên byte. Asset bất biến và dataset lớn phải đặt trong `assets/` ở thư mục gốc project để không bị nhân bản vào starter, từng checkpoint và final. Chúng vẫn có trong ZIP nhưng không bị nhúng vào code block. Mỗi snapshot source được đưa lên web bằng một module riêng, vì vậy mở Bài 03 không tải source của cả project.

Các thư mục `starter/`, `checkpoints` và `final/` là output được sinh, không được Git theo dõi. Không sửa trực tiếp trong đó. Generator so sánh byte trước khi ghi nên file không đổi giữ nguyên timestamp và cache Vite. `predev` đồng bộ source và ZIP để Downloads hoạt động ngay trên bản clone mới; ZIP không đổi không bị nén lại. `npm run build` dùng cùng bước chuẩn bị trước khi gọi Vinext.

## File được sinh tự động

`npm run generate:course` đồng bộ:

- catalog, project summary và các manifest/learning/lab loader;
- các search shard tự chia theo kích thước serialized, mục tiêu tối đa 16 KiB mỗi shard;
- progress migration shard riêng cho từng project;
- một lesson registry nhỏ cho từng project và router gốc chỉ import registry của project đang mở;
- starter, checkpoint và final từ toàn bộ cây `source-template/`;
- `CMakeLists.txt` độc lập cho từng project từ một template chung;
- source module riêng cho từng snapshot.

Toàn bộ output trên, cùng `public/downloads/` (ZIP và manifest), nằm trong `.gitignore`. `scripts/git-hygiene.mjs` xác định các đường dẫn được sinh để `npm run check:git` và CI chặn việc đưa chúng vào Git. Quy tắc áp dụng theo cấu trúc thư mục, không cần thêm ID mỗi khi phát hành project. Test đối chiếu quy tắc với `.gitignore`, bao gồm Project 78, và chứng minh source gốc không bị bỏ qua.

Catalog chỉ kiểm tra nguồn đầu vào: MDX, metadata, `source-template`, README và tests. Không yêu cầu CMake hoặc snapshot có sẵn trước khi sinh. `check:course` vẫn đối chiếu toàn bộ output, bao gồm CMake, với kết quả mong đợi từ generator.

`npm run check:course` chỉ kiểm tra, không ghi file. Validator kiểm tra ID, slug, lesson order, lesson ID, MDX filename, code guide bị thiếu hoặc mồ côi, Canvas mode bằng MDX AST, checkpoint count và output cũ. Các file `manifest.ts`, `learning.ts`, `lab.ts` được phép dùng `import type`, nhưng phải tự chứa toàn bộ runtime value để generator có thể đánh giá ổn định.

Search chỉ tải page/project shard khi mở hộp thoại. Glossary và lesson shard được tải khi người dùng bắt đầu nhập, vì vậy số request khởi tạo không tăng theo toàn bộ số lesson.

## Giới hạn chống phình file

`npm run check:architecture` áp dụng các budget:

- source dùng chung: tối đa 32 KiB mỗi file;
- `manifest.ts`, `learning.ts`, `lab.ts`: tối đa 20 KiB mỗi file;
- mỗi lesson MDX và mỗi file C++/shader: tối đa 32 KiB;
- mỗi binary asset: tối đa 5 MiB; tổng source authored của một project: tối đa 10 MiB;
- tổng starter/checkpoint/final đã sinh của một project: tối đa 20 MiB; ZIP tối đa 25 MiB;
- lesson router gốc tối đa 16 KiB và mỗi project lesson registry tối đa 12 KiB;
- mỗi search shard: tối đa 20 KiB; tổng CSS toàn cục tối đa 64 KiB;
- cấm khôi phục các registry giảng dạy nguyên khối cũ.

Nếu một project vượt budget, hãy chia dữ liệu hoặc component ngay trong thư mục của project, không tăng giới hạn để che vấn đề.

## Thêm một project đã phát hành

1. Thêm entry kế tiếp vào `course/projects.json`; roadmap tương ứng phải tồn tại.
2. Tạo `course/projects/pXX/{manifest,learning,lab}.ts`.
3. Tạo lesson trong `content/<slug>/` với tiền tố `01-`, `02-`…
4. Tạo `examples/project-XX-<slug>/source-template/`, tests và README; generator sẽ tạo CMake.
5. Tạo `components/labs/<demo>-lab.tsx`.
6. Chạy `npm run generate:course` và `npm run package:projects`.
7. Chạy `npm run lint` và `npm test`.

`npm test` kiểm tra pipeline development bằng các fixture cố định có đủ MDX, công thức, Canvas và code block; production build vẫn compile toàn bộ lesson. Khi sửa cấu hình MDX/Vite, dùng `npm run test:mdx-dev-full` để ép development pipeline compile từng lesson theo các batch giới hạn concurrency.

Các lệnh `build`, `lint`, `test:fast`, `test:browser` và `test` đi qua `scripts/process-supervisor.mjs`. Supervisor đặt timeout cho từng stage và toàn suite, chuyển tín hiệu dừng thành việc dọn toàn bộ process tree, rồi buộc thoát sau thời gian ân hạn hữu hạn. `scripts/guarded-process.mjs` còn theo dõi PID cha; nếu terminal hoặc ứng dụng bị đóng cưỡng bức, guardian tự dọn descendant mà không cần callback của tiến trình cha. Không dùng `spawnSync` cho tiến trình dài, không để `spawnSync` ngắn thiếu timeout và không gọi server/test runner mà thiếu hard timeout. Test hồi quy trong `tests/process-supervisor.test.mjs` phải chứng minh timeout, descendant cleanup và trường hợp tiến trình cha biến mất.

CI bắt đầu từ checkout chỉ có nguồn chuẩn: kiểm tra Git không theo dõi output, sinh course và ZIP, rồi kiểm tra nội dung, build và tests. Cuối job website, source phải giữ nguyên và không xuất hiện file mới cần commit. Job C++ tự sinh CMake/snapshot bằng Node.js trước khi configure; generator này không cần cài npm dependencies. CI lấy ma trận trực tiếp từ `course/projects.json`, gom tối đa 10 project vào mỗi Windows shard và build SDL 3.4.8 đúng một lần cho cả workflow. Project mới vẫn tự động được build và chạy CTest ở Debug lẫn Release; khi tải ZIP về, `FetchContent` vẫn là đường mặc định nên người học không cần cài SDL sẵn.

`npm run test:clean-checkout` kiểm chứng local bằng bản sao source không mang theo output có sẵn; bản sao chỉ dùng lại `node_modules` để tránh tải dependencies. Script sinh lại dữ liệu, kiểm tra ZIP/TypeScript và chạy bước chuẩn bị lần hai để kiểm tra tính ổn định của nội dung và timestamp. Thêm `-- --build` để build và chạy test nội dung ngay trong bản sao. Cả hai chế độ có hard timeout tổng 10 phút, dùng process supervisor và không khởi động server.

## ZIP tải về

`npm run package:projects` tính SHA-256 từ đường dẫn và nội dung source. Digest trong `public/downloads/manifest.json` khớp thì ZIP được giữ nguyên; chỉ project thay đổi mới gọi CMake để nén lại. `npm run check:packages` kiểm tra manifest, giải nén vào thư mục tạm và so sánh từng byte với source; ZIP cũ hoặc thiếu asset sẽ làm CI thất bại.

Khi project mới cần kiểm thử nội dung riêng, tạo suite theo đợt phát hành, ví dụ `tests/projects-09-13.cases.mjs`, rồi import nó từ `tests/rendered-html.test.mjs`. Không nối toàn bộ regression vào một file duy nhất.
