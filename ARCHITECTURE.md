# Kiến trúc nội dung Simulation Path

Repository được tổ chức để đủ 78 project không biến thành một ứng dụng có vài file trung tâm khổng lồ. Mỗi project sở hữu nội dung, metadata giảng dạy, metadata Canvas và source C++ của chính nó. Các registry chỉ chứa metadata nhẹ hoặc hàm `import()` và được sinh tự động.

## Tài liệu tham chiếu roadmap

[Product Specification v4 — 78 project](docs/specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md) là nguồn chuẩn về sản phẩm cuối, phạm vi, quy mô và tiêu chí nghiệm thu của từng project. Đọc phần tương ứng trước khi xây dựng hoặc review nội dung, source và mô phỏng.

`course/roadmap.ts` là metadata triển khai cho tên, thứ tự và học phần trên website; `course/projects.json` quản lý catalog đã phát hành. Hai file này không thay thế đặc tả sản phẩm. Project đã phát hành hoặc đã qua tests không mặc nhiên được xem là đáp ứng toàn bộ spec.

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
examples/drafts/<slug>/        source đang xây, chưa tham gia catalog hoặc ZIP
```

`lib/course.ts` chỉ ghép roadmap với `project-summaries.ts`. Manifest đầy đủ chỉ được tải khi mở đúng project. Search, Canvas metadata, source checkpoint và lesson content đều dùng literal dynamic import để bundler tách chunk.

`project-summaries.ts` chỉ ghép các shard trong `course/generated/summaries/`. Mỗi shard chứa tối đa 10 project, mục tiêu 8 KiB và giới hạn 16 KiB; generator giữ nguyên thứ tự catalog. Metadata của đủ 78 project vẫn được chia nhỏ thay vì nối thành một file lớn.

## Source C++ và checkpoint

Một project có thể khai báo `native` trong `course/projects/pXX/lab.ts`. Overview và các mode được liệt kê hiển thị đúng ảnh/video từ chương trình, kèm nguồn và mô tả. Video không tự chạy; trang chỉ gắn media của cảnh đang xem. Các mode còn lại vẫn dùng Canvas cho thí nghiệm. Tư liệu ở `public/field-notes/` là đầu ra biên tập được chọn, không phải thư mục chứa tất cả frame.

Khi đang bật Vite trên Windows, không cho SDL ghi PNG thẳng vào `public`: file có thể còn bị khóa độc quyền khi watcher nhận sự kiện thêm file. Dùng `node scripts/publish-native-still.mjs <executable> <collection> <ten-anh.png> [tham số native]`. Công cụ chỉ đưa file đã đóng từ `.validation/` sang thư mục public cùng volume bằng rename.

Chuỗi `flock-workbench` (65–72) dùng lại đúng bảy header Boids/grid của Project 28, khóa ở checkpoint 10. Tệp được lấy từ nguồn authored khi sinh ZIP, không trỏ sang một thư mục `final/` trên máy người học. Phần bàn quan sát mới thuộc `examples/flock-workbench/`; không sao chép solver vào tám project và không nhúng solver khác vào trình duyệt.

`source-template/` giữ nguyên cấu trúc thư mục mà snapshot cần có:

```text
source-template/
  include/
  src/
  shaders/      tùy chọn; chỉ dành cho file thay đổi theo checkpoint
assets/         tùy chọn; dùng chung cho mọi checkpoint
```

Generator duyệt đệ quy nên project có thể có nhiều `.cpp`, `.hpp` hoặc shader thay đổi theo bài. Chỉ các định dạng text nằm trong allowlist mới được xử lý `LAB_CHECKPOINT`; mọi định dạng chưa biết mặc định là binary và được sao chép nguyên byte. Asset bất biến và dataset lớn phải đặt trong `assets/` ở thư mục gốc project để không bị nhân bản vào starter, từng checkpoint và final. Chúng vẫn có trong ZIP nhưng không bị nhúng vào code block. Mỗi snapshot có một payload JSON riêng, tối đa 5 MiB, vì vậy mở source của Bài 03 không tải source của cả project.

Các thư mục `starter/`, `checkpoints` và `final/` là output được sinh, không được Git theo dõi. Không sửa trực tiếp trong đó. Generator so sánh byte trước khi ghi nên file không đổi giữ nguyên timestamp và cache Vite. `predev` đồng bộ source và ZIP để Downloads hoạt động ngay trên bản clone mới; ZIP không đổi không bị nén lại. `npm run build` dùng cùng bước chuẩn bị trước khi gọi Vinext.

Thư mục `examples/` không được dev server theo dõi để tránh quét cả cây build. Server import dữ liệu của snapshot cần dùng từ `lib/generated-checkpoint-sources/pXX/data/`, chia mảnh nếu payload lớn, không tạo một module `?raw` cho mỗi tệp C++. Trình duyệt đọc manifest nhỏ của đúng project tại `public/project-sources/XX/manifest.json`, rồi tải hai JSON cần thiết: phần dùng chung và checkpoint đang mở. Payload có hash nội dung trong tên và bản mirror byte giống nhau ở server/public; manifest được đọc mới khi mở tệp, nên mã thay đổi không bị giữ nhầm trong cache. Bộ đọc phía client không import registry source toàn khóa học. Không cần backend hay endpoint API cho các tệp này.

MDX giữ code One Dark và công thức KaTeX trong HTML ban đầu, bao gồm MathML và annotation công thức. `lib/rehype-static-code.mjs` chạy sau Shiki và KaTeX, gom các thẻ HTML lặp lại vào một dictionary thay vì gửi một cây React element cho từng token. Client boundary `CourseStaticMarkup` dựng lại cùng HTML đã escape trong cả SSR lẫn hydration; không cần tải Shiki hoặc KaTeX xuống trình duyệt. Bộ mã hóa trong `lib/static-markup.mjs` chỉ nhận output tin cậy của compiler, không phải bộ lọc HTML cho input của người dùng. Tests kiểm round-trip, màu, thụt dòng và giới hạn trust của công thức. Phần diff cuối bài chỉ tô màu khi người học mở tên tệp; mã diff vẫn được tạo từ hai checkpoint thực tế.

CMake dùng một target `project_N_runtime_files` để chuẩn bị DLL SDL và assets bất biến đúng một lần trong mỗi build/configuration; mọi app target phụ thuộc target này. Không để từng executable cùng POST_BUILD chép vào một thư mục runtime, vì build song song trên Windows có thể tranh chấp file. Generator single-config dùng ngay build directory; Visual Studio và generator multi-config dùng thư mục cấu hình con.

Project có shader thay đổi theo checkpoint có thể bật `shaderRuntimePerTarget` trong catalog. Khi bật, mỗi target có bản fallback tại `shaders/<target-name>/` cạnh executable và nhận đường này qua `COURSE_SHADER_FALLBACK_SUBDIRECTORY`; các target không chép đè GLSL của nhau. Source directory của đúng snapshot vẫn được ưu tiên để hỗ trợ hot reload. Các project chưa bật option giữ cách tìm runtime shader hiện tại.

Mọi ZIP có ba cách kiểm C++: mặc định kiểm `final/` (nhãn CTest `reference`); bật `COURSE_TEST_STARTER` để kiểm ngay `starter/`; hoặc bật `COURSE_WORKBOOK` (riêng 58–64: `VOXEL_WORKBOOK`) để tạo `work/` một lần và kiểm thư mục này. Hai chế độ làm bài loại trừ nhau. Target `project_N_check_work` chỉ tồn tại ở chế độ học: nó build lại test rồi chạy CTest với nhãn `learner`. Binary test mang tên riêng theo cây mã, nên đổi chế độ không thể vô tình chạy executable của lời giải cũ. Không phải học phần nào có chế độ `work/` cũng đã có hướng dẫn ghép tệp từng bước.

Sau khi đổi CMake chung, đóng gói P02 và chạy `node --experimental-strip-types scripts/verify-learner-ctest.mjs <thư-mục-chứa-SDL3Config.cmake>`. Ca tích hợp giải nén ZIP vào một thư mục tạm, làm sai rồi khôi phục công thức di chuyển trong từng cây bài làm. Bản mẫu phải không đổi, còn CTest phải lần lượt báo đỏ và xanh. Lệnh dùng SDL đã cài, một tiến trình biên dịch và giới hạn tổng 150 giây.

## File được sinh tự động

### Nền C++ dùng chung của tuyến cảnh quan voxel

Với Project 58–64, một mục catalog có thể khai báo `sourceSeries: "voxel-expedition"`. Header authored dùng xuyên suốt nằm ở `examples/voxel-expedition/include/trail/`; kiến thức mới ở các mốc sau đặt trong `from-NN/include/trail/`. Generator chỉ lấy các thư mục tới đúng project hiện hành. Trong header chung, `LAB_CHECKPOINT >= 6102` nghĩa là từ Bài 02 của Project 61. File local của từng project vẫn dùng số checkpoint bắt đầu từ 0. Hai nguồn cùng tên file bị từ chối. Bộ sinh snapshot, trình kiểm đường dẫn code guide và giới hạn dung lượng cùng đọc một danh sách đầu vào. ZIP đã chứa mọi header cần dùng, không cần giải nén các project trước hoặc nối nhiều thư mục bằng tay.

Trong ZIP voxel, cấu hình `cmake -S . -B build-work -DVOXEL_WORKBOOK=ON` tạo `work/` từ starter **chỉ khi chưa có thư mục này**. Target `project_N_work` và CTest của cấu hình này đọc code người học. Không đưa work vào generator, ZIP hay Git. Phần thực hành trong MDX dùng `VoxelWorkFile` đúng tại bước chỉnh từng header; bộ đọc chỉ tải hai snapshot khi mở tệp và cho biết đoạn phải chèn/thay, kèm mốc phía trên/dưới. Phần diff và bản final cuối trang chỉ để đối chiếu.

Các ZIP 11, 31–32 và 52–57 dùng `COURSE_WORKBOOK=ON` cho cùng đường thực hành, với `CourseWorkFile` nhận đường dẫn đầy đủ của header, main hoặc shader. `tests/science-workbook.test.mjs` đọc hướng dẫn trong từng bài rồi dựng lại **tất cả tệp** và so với checkpoint; mỗi đoạn C++/GLSL cũng phải khớp source. Để kiểm bản đóng gói, chạy `node --experimental-strip-types scripts/verify-voxel-workbook.mjs 55 <thư-mục-SDL3Config>` cho một project. Không chạy nhiều lượt native cùng lúc. Ảnh trong `public/field-notes/optics` được chụp từ framebuffer ứng dụng bằng `--capture`, không dùng ảnh Canvas thay thế.

`tests/voxel-workbook.cases.mjs` làm theo các bước theo thứ tự từ starter đến hết, kiểm các mốc chèn và toàn bộ tệp sau mỗi bài. Để kiểm cả native trên một ZIP, chạy `node --experimental-strip-types scripts/verify-voxel-workbook.mjs 58 <thư-mục-SDL3Config.cmake>` (đổi 58 thành ID cần kiểm). Lệnh dùng SDL đã có, một tiến trình build, một thư mục tạm riêng và timeout tổng bốn phút cho mỗi project. Không chạy tự động phiên khảo sát 10 phút.

`npm run generate:course` đồng bộ:

- catalog, project summary và các manifest/learning/lab loader;
- registry import glossary dùng chung cho trang thuật ngữ và search;
- các search shard tự chia theo kích thước serialized, mục tiêu tối đa 16 KiB mỗi shard;
- progress migration shard riêng cho từng project;
- một lesson registry nhỏ cho từng project và router gốc chỉ import registry của project đang mở;
- starter, checkpoint và final từ toàn bộ cây `source-template/`;
- `CMakeLists.txt` độc lập cho từng project từ một template chung;
- source module riêng cho từng snapshot.

Toàn bộ output trên, cùng `public/downloads/` (ZIP và manifest) và `public/project-sources/` (JSON source), nằm trong `.gitignore`. `scripts/git-hygiene.mjs` xác định các đường dẫn được sinh để `npm run check:git` và CI chặn việc đưa chúng vào Git. Quy tắc áp dụng theo cấu trúc thư mục, không cần thêm ID mỗi khi phát hành project. Test đối chiếu quy tắc với `.gitignore`, bao gồm Project 78, và chứng minh source gốc không bị bỏ qua.

Catalog chỉ kiểm tra nguồn đầu vào: MDX, metadata, `source-template`, README và tests. Không yêu cầu CMake hoặc snapshot có sẵn trước khi sinh. `check:course` vẫn đối chiếu toàn bộ output, bao gồm CMake, với kết quả mong đợi từ generator.

### Bản cũ, bản mới và trạng thái nghiệm thu

`course/roadmap.ts` giữ tên và học phần theo đặc tả hiện tại. `course/roadmap-revisions.ts` đánh dấu các project chờ xây dựng lại, tóm tắt sản phẩm mới và lưu tên/học phần của bản cũ. `lib/roadmap-state.ts` ghép hai nguồn với catalog thành ba trạng thái: đã có hướng dẫn, chờ xây dựng lại và chưa phát hành. Đây là trạng thái biên tập, không phải chứng nhận đáp ứng spec.

Trang `/roadmap/<id>` giới thiệu phạm vi mới nhưng không gắn bài học, demo hay ZIP cũ cho sản phẩm mới. Trong lúc chờ xây dựng lại, các route `/projects/<slug-cũ>` và tiến độ vẫn được giữ; overview, lesson, sidebar, tìm kiếm, nút tiếp tục và Downloads ghi rõ bản cũ. Generator giữ tên thật của source cũ trong summary và search thay vì đổi nhãn bài học theo tên mới. `currentProjects` dùng cho thống kê/hướng dẫn hiện tại; `publishedProjects` giữ mọi route còn được phát hành.

Khi bản mới thay bản cũ trong catalog, khai báo `replacement` với slug khớp catalog. Học phần mở đúng bài học, Canvas và ZIP của bản mới; route đề bài cũ chuyển đến hướng dẫn mới, còn tìm kiếm và tiến độ không gắn nhãn bản cũ. Chỉ thêm `acceptanceNote` nếu học phần còn chờ nghiệm thu. Nếu chốt phát hành mà không kiểm thêm, bỏ ghi chú hiển thị nhưng giữ `replacement` và ghi rõ bước chưa thực hiện trong hồ sơ kiểm chứng. `rebuildRevisions` chỉ gồm project vẫn còn cung cấp tài liệu cũ.

Chỉ bỏ entry trong `roadmap-revisions.ts` khi đã thay và nghiệm thu đồng bộ lesson, C++, Canvas, metadata và ZIP cho sản phẩm mới. Không dùng việc đổi tên hoặc build thành công làm căn cứ bỏ nhãn. Metadata chi tiết này chỉ dùng khi render server/sinh registry; client tiến độ chỉ nhận danh sách ID bản cũ nhỏ gọn.

`npm run check:course` chỉ kiểm tra, không ghi file. Validator kiểm tra ID, slug, lesson order, lesson ID, MDX filename, code guide bị thiếu hoặc mồ côi, Canvas mode bằng MDX AST, checkpoint count và output cũ. Các file `manifest.ts`, `learning.ts`, `lab.ts` được phép dùng `import type`, nhưng phải tự chứa toàn bộ runtime value để generator có thể đánh giá ổn định.

Search chỉ tải page/project shard khi mở hộp thoại. Glossary và lesson shard được tải khi người dùng bắt đầu nhập, vì vậy số request khởi tạo không tăng theo toàn bộ số lesson.

Danh sách module thuật ngữ được khai báo một lần trong `scripts/glossary-catalog.mjs`. Khi thêm `lib/glossary-*.ts`, đăng ký module tại đây rồi chạy `npm run generate:course`. Trang thuật ngữ dùng `course/generated/glossary.ts`, chỉ chứa import, không chép lại định nghĩa. Search lấy dữ liệu từ cùng danh sách. Generator báo lỗi nếu thiếu module, ID trùng hoặc định nghĩa rỗng; test đối chiếu toàn bộ anchor hiển thị với kết quả tìm kiếm.

Generator checkpoint xử lý và đối chiếu từng project rồi giải phóng buffer, không giữ source của cả khóa học trong RAM. Khi chỉ sửa một project, dùng `node scripts/generate-checkpoints.mjs --project=44` (ID hai chữ số); thêm `--check` để kiểm mà không ghi. Lượt có scope chỉ dọn output của project đó, vẫn giữ registry gốc cho toàn catalog và không prune payload của project khác. Đây không thay bước sinh metadata/lesson registry hoặc kiểm toàn khóa học khi phát hành. Test fixture hai project kiểm scope, bytes/timestamps, chế độ read-only và dọn output lỗi thời ở lượt đầy đủ.

Module source sinh sẵn dùng `.mjs` để import JSON ở runtime và `.d.mts` khai báo `files`/`version` theo interface dùng chung. TypeScript kiểm API qua declaration, không phân tích hàng chục MiB chuỗi C++ thành cây cú pháp JSON. Không dùng `any` hoặc tắt `resolveJsonModule`: test đối chiếu schema/ngôn ngữ/hash/bytes của mọi payload, kiểm runtime thật và chứng minh consumer vẫn bị chặn với language sai hoặc thao tác sửa mảng readonly.

Payload public vẫn là một JSON versioned cho mỗi snapshot. Server giữ bản mirror byte-identical để đối chiếu nhưng chia import runtime lớn thành các mảnh tối đa 128 KiB, theo ranh giới file và giữ nguyên thứ tự; không cắt source giữa chừng. Test ghép đủ các mảnh rồi so trực tiếp mọi file với payload public. Cách này giữ server JS chunk dưới budget hiện có ngay cả khi final là một editor C++ nhiều file; dữ liệu sinh thêm không vào Git hoặc ZIP C++.

## Giới hạn chống phình file

Code block C++ của Project 01–32, Project 40–54 và từ Project 56 trở đi phải khớp một đoạn token liên tiếp trong đúng source checkpoint, bỏ qua comment và khoảng trắng nhưng giữ literal/toán tử. `tests/source-contract.cases.mjs` dùng `scripts/code-snippets.mjs` cho hợp đồng này; Project 40–45 và 51 còn kiểm cả GLSL trong suite riêng. Các project còn lại trong khoảng 33–55 dùng kiểm tra subsequence riêng; test mới không được bỏ qua token như giá trị trả về để làm một snippet sai được chấp nhận.

Project 47–54 gắn code block với `// [snippet id]` / `// [/snippet id]` trong source. Sau khi sinh checkpoints, chạy `node scripts/sync-marked-snippets.mjs --project=54` (hoặc ID 47–54); thêm `--check` để đối chiếu read-only. Script hỗ trợ C++ và GLSL, kiểm ngôn ngữ/đường dẫn và đọc đúng snapshot của lesson, không lấy phần thuật toán tương lai trong source-template. Comments MDX giữ đường dẫn/marker; tests riêng của P51/P52/P53/P54 yêu cầu mọi code block giảng dạy khớp đúng marker, không chỉ khớp một subsequence.

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
5. Chọn cách minh họa theo bài: tạo `components/labs/<demo>-lab.tsx` khi cần tương tác với thuật toán; để xem thành phẩm native, khai báo `native` trong `lab.ts`. Có thể dùng cả hai ở các bài khác nhau. Học phần chỉ dùng ảnh/video không cần tạo một Canvas trống hay thêm client chunk.
6. Chạy `npm run generate:course` và `npm run package:projects`.
7. Chạy `npm run lint` và `npm test`.

### Bàn Boids dùng chung (Project 65–72)

Giữ một bản source của solver ở Project 28. `scripts/course-source-templates.mjs` ghim đúng checkpoint kế thừa; các lớp UI nối tiếp nằm trong `examples/flock-workbench/`. Thêm tính năng tại mốc sớm nhất được phép dạy, không sao chép thư mục của bài trước vào Git. Generator đưa đủ mã vào từng starter, checkpoint, final và ZIP: máy người học không cần checkout project trước.

Đoạn C++ trong bài lấy từ marker của chính checkpoint đó. Với dữ liệu ngắn mà chương trình thực sự đọc (`.html`, `.css`, `.tiny`), đặt marker MDX `{/* asset assets/tên-file.css */}` ngay trước code block; file trong ZIP không chứa ký hiệu dành cho giáo trình. Dùng `node scripts/sync-marked-snippets.mjs --project=72 --check` để phát hiện sai lệch.

Ảnh trong `public/field-notes/flock-workbench/` do đúng executable ghi lại. Sau khi build với `BUILD_CHECKPOINTS=ON`, có thể chụp lại bằng `node --experimental-strip-types scripts/capture-flock-series.mjs 72 đường-dẫn-build/Release`. Script đọc danh sách ảnh của học phần, chọn đúng checkpoint/final, rồi công bố PNG sau khi SDL đã đóng file để Vite không đọc ảnh còn viết dở.

`npm test` kiểm tra pipeline development bằng các fixture cố định có đủ MDX, công thức, Canvas và code block; production build vẫn compile toàn bộ lesson. Khi sửa cấu hình MDX/Vite, dùng `npm run test:mdx-dev-full` để ép development pipeline compile từng lesson theo các batch giới hạn concurrency.

Các lệnh `build`, `lint`, `test:fast`, `test:browser` và `test` đi qua `scripts/process-supervisor.mjs`. Supervisor đặt timeout cho từng stage và toàn suite, chuyển tín hiệu dừng thành việc dọn toàn bộ process tree, rồi buộc thoát sau thời gian ân hạn hữu hạn. `scripts/guarded-process.mjs` còn theo dõi PID cha; nếu terminal hoặc ứng dụng bị đóng cưỡng bức, guardian tự dọn descendant mà không cần callback của tiến trình cha. Không dùng `spawnSync` cho tiến trình dài, không để `spawnSync` ngắn thiếu timeout và không gọi server/test runner mà thiếu hard timeout. Test hồi quy trong `tests/process-supervisor.test.mjs` phải chứng minh timeout, descendant cleanup và trường hợp tiến trình cha biến mất.

CI bắt đầu từ checkout chỉ có nguồn chuẩn: kiểm tra Git không theo dõi output, sinh course và ZIP, rồi kiểm tra nội dung, build và tests. Cuối job website, source phải giữ nguyên và không xuất hiện file mới cần commit. Job C++ tự sinh CMake/snapshot bằng Node.js trước khi configure; generator này không cần cài npm dependencies. CI lấy ma trận trực tiếp từ `course/projects.json`, gom tối đa 10 project vào mỗi Windows shard và build SDL 3.4.8 đúng một lần cho cả workflow. Project mới vẫn tự động được build và chạy CTest ở Debug lẫn Release; khi tải ZIP về, `FetchContent` vẫn là đường mặc định nên người học không cần cài SDL sẵn.

`npm run test:clean-checkout` kiểm chứng local bằng bản sao source không mang theo output có sẵn; bản sao chỉ dùng lại `node_modules` để tránh tải dependencies. Script sinh lại dữ liệu, kiểm tra ZIP/TypeScript và chạy bước chuẩn bị lần hai để kiểm tra tính ổn định của nội dung và timestamp. Thêm `-- --build` để build và chạy test nội dung ngay trong bản sao. Cả hai chế độ có hard timeout tổng 10 phút, dùng process supervisor và không khởi động server.

## ZIP tải về

`npm run package:projects` tính SHA-256 từ đường dẫn và nội dung source. Digest trong `public/downloads/manifest.json` khớp thì ZIP được giữ nguyên; chỉ project thay đổi mới gọi CMake để nén lại. `npm run check:packages` kiểm tra manifest, giải nén vào thư mục tạm và so sánh từng byte với source; ZIP cũ hoặc thiếu asset sẽ làm CI thất bại.

Khi agent kiểm tra ZIP, dùng tiến trình local qua process supervisor để giải nén và đối chiếu, với timeout và khả năng hủy độc lập. Nếu chỉ sửa một project, có thể kiểm tra đầy đủ gói của project đó; không dùng kết quả này để tuyên bố tất cả ZIP đã khớp. Trên trình duyệt, kiểm liên kết tải trỏ đúng gói. Không dùng cơ chế tự động theo dõi download nếu công cụ không bảo đảm thao tác chờ có thể được ngắt độc lập; tham số timeout của một lời gọi công cụ không thay thế được watchdog của tiến trình local.

Không tự động truyền file qua browser file chooser khi công cụ không bảo đảm hủy độc lập. Kiểm parser bằng asset trên đĩa và thử editor bằng các fixture ngắn; việc mở file bằng UI có thể kiểm thủ công. Cả download tracking lẫn file chooser đã có trường hợp chờ vượt timeout được khai báo, nên không coi timeout của API là bảo đảm an toàn.

Khi project mới cần kiểm thử nội dung riêng, tạo suite theo đợt phát hành, ví dụ `tests/projects-09-13.cases.mjs`, rồi import nó từ `tests/rendered-html.test.mjs`. Không nối toàn bộ regression vào một file duy nhất.

Các lượt quét route, liên kết và dung lượng dùng chung response production trong một lần chạy test. `tests/rendered-route-cache.mjs` giữ tối đa 64 response trong RAM và lưu phần còn lại vào thư mục riêng `.validation/rendered-routes-*`. Cache không dùng lại giữa các tiến trình hoặc các bản build; test hook xóa thư mục riêng khi suite kết thúc bình thường. Nhờ đó kiểm tra toàn khóa học không phải render lại từng trang sau mỗi lần cache RAM bị đẩy ra, nhưng cũng không giữ toàn bộ HTML trong bộ nhớ.

`test:labs` và `test:tooling` giới hạn hai Node test worker bằng `--test-concurrency=2`, thay vì tự lấy số CPU làm mức song song. Giới hạn này không giảm số test hoặc thay đổi timeout của stage; nó tránh khởi chạy nhiều worker TypeScript cùng lúc khi khóa học đã có hàng chục project.
