# Sổ thực địa — Project 58–64

Đây là ghi chép về phiên bản **chỉ khám phá** của Phần XI. Mục tiêu sản phẩm nằm trong [đặc tả v4, Phần XI](../specifications/cpp-sdl3-simulation-roadmap-agent-product-spec-v4-complete.md#phần-xi--khám-phá-thế-giới-voxel); file này ghi cách kiểm và những gì phép đo thực sự chứng minh. Bảy học phần dùng chung thế giới do C++20/SDL3 dựng. Không cần mua Minecraft, cài mod hay tải bộ texture của trò chơi.

| Project | Đứng ở đâu, làm gì? | Phép đối chiếu |
| --- | --- | --- |
| 58 | Đi từ nước lên bờ cát, lại gần thân cây; H xem lớp đất. | Một viên đá có 6 quad; khối đặc có 24.576 quad ở bản chưa tối ưu. Suối không bị đứt giữa hai hàng. |
| 59 | Đi vào hốc bằng preset 5, nhìn trần rồi đổi F2. | Vách vẫn kín. Khối đặc chỉ còn 1.536 quad; hai khối đặc nối nhau có 2.560 mặt đơn vị. |
| 60 | Ngắm nước, gỗ và trời; I giữ phép đo rồi đi vòng ra bên. | So hit với ray/hộp độc lập; ngắm không đổi block, mesh hay bộ đếm dựng. |
| 61 | Đổi F2 để so mesh, nhấn G đổi gió và P để dừng giờ. | Gộp khối đặc còn 6 quad, bung ra vẫn đúng mặt cũ. Gốc cỏ đứng im; ngọn ở hai vị trí không nghiêng y hệt nhau. |
| 62 | Băng qua biên âm khi hàng nạp còn dài. L kiểm 5×5 cột; C tắt mây. | Hàng cũ bị hủy, vành giữ hữu hạn, quay lại vẫn cùng đất. Ở cùng góc nhìn, mây trôi dù mắt đứng yên. |
| 63 | Bám theo sông tới biển. Đứng sát mỏm đá để thấy sóng lên xuống. | Cùng seed cho cùng cột và cây; so hướng trôi của vệt và normal biển với sai phân độ cao. |
| 64 | Đi từ bãi cát qua hẻm tới rừng thông tuyết và vòng đá của bếp lửa. | Va chạm, tuyết có chiều sâu, gió và đồng hồ chung; so nắng ở cùng một vách vào hai giờ khác nhau. |

## Đi trong bản tải về

Mở trang cuối của học phần để xem toàn bộ mã và tải ZIP. Phím 1 luôn đưa về cảnh quan; 2/3/4 lần lượt là một viên đá, khối đặc và khoảng không. Ở Project 64:

- WASD để đi; nhấp vào cửa sổ rồi di chuột hoặc dùng các phím mũi tên để nhìn. Escape thả chuột. Space nhảy; F đổi giữa đi bộ có va chạm và bay khảo sát.
- F5/F6/F7/F8/F9 lần lượt đến bãi cát, thung lũng, hẻm đá, rừng tuyết và chỗ nghỉ. Đây là năm địa chỉ trên **cùng bản đồ**, không phải năm cảnh tải riêng.
- Hai phím ngoặc vuông chỉnh cường độ, G đổi hướng gió. C bật/tắt mây, T bật/tắt phát tuyết. Dấu trừ và dấu bằng lùi/tới hai giờ. P dừng đồng hồ cảnh mà vẫn cho phép di chuyển.
- F1 mở thông số; F3 mở ống ngắm chỉ đọc. Khi kiểm hình ảnh, tắt cả hai để nhìn rõ đường chân trời, các hạt gần và xa.

Bài tập đủ ở quy mô này: giải thích tại sao gốc cỏ không trượt, hướng nắng nào làm sáng một vách và vì sao ô nước đứng yên nhưng đỉnh sóng dịch chuyển. Mô phỏng khí quyển, nước SPH cả đại dương, tuyết tích tụ, cháy lan hoặc hệ thống sinh tồn sẽ làm nặng đồ án mà không cần thiết cho các phép kiểm trên.

## Phiên đi bộ theo thời gian thực

Ngày 20/11/2026 (UTC+7), Windows x64, AMD Ryzen 5 5600H, Visual Studio 2022, bản **Release**. SDL dùng software renderer và cửa sổ ẩn để không lấy chuột của người dùng; khung nội bộ 800×450, đầu ra 1120×630. Đây là một phiên **điều khiển tự động**: chương trình cập nhật, di chuyển, va chạm và vẽ mỗi khung trong vòng lặp SDL thật. Nó không thay nhận xét của người chơi về cảm giác chuột hay chất lượng thẩm mỹ.

Lệnh tái lập từ thư mục đã build là `project_64_final.exe --survey 600`; chỉ dùng `--route-check` để tìm chỗ mắc nhanh, không tính thay phiên 10 phút. Tự động hóa đổi hướng gió, tạm dừng, chỉnh giờ, bật/tắt mây và tuyết; không dùng phím nhảy từ mốc này sang mốc khác. Kết quả lượt đã ghi: **600,018 giây, 2.423,15 block, sáu vòng**, qua z từ −5,97 đến 184,05. Một phép thử ngắn hơn trước đó đã phát hiện lối ra bếp bị kẹt ở z≈152. Sau khi sửa độ dốc và khoảng trống, bản cuối cũng đi hết vòng rút gọn dài 401,72 block.

Số sau là của máy và lần chạy này, **không phải cam kết 60 FPS**. Nhật ký lấy mẫu theo chu kỳ 15 giây; thời gian dựng/sinh là lần gần nhất có việc, không phải chi phí cố định của mọi frame.

| Đại lượng | Kết quả đã ghi |
| --- | --- |
| Chunk đang giữ | 2 lúc khởi động; trung vị 31, cao nhất 36 trong các mẫu. Fixture đi–về kiểm thêm giới hạn 49. |
| Tuyết | Mẫu cao nhất 611 bông sống, pool có 768 chỗ; rời vùng tuyết thì dừng phát. |
| Working set tiến trình native | 8,92–11,35 MiB trong 19 mẫu hợp lệ, không phải tổng bộ nhớ hệ điều hành. |
| Sinh cột / dựng mesh | Trung vị 0,16 / 1,43 ms; cao nhất trong mẫu 202,10 / 3,27 ms. |
| Cập nhật / vẽ CPU / upload SDL | Trung vị 0,01 / 14,01 / 0,29 ms. Đỉnh vẽ theo bộ đếm mọi frame: 342,89 ms trong lúc máy còn chạy kiểm tra khác. |

Khi so hiệu năng giữa hai máy, hãy ghi cả tải nền, cấu hình Debug/Release và độ phân giải; để so hai phương pháp meshing, giữ nguyên seed, camera, giờ và cảnh. Không suy ra VRAM hoặc tốc độ của renderer GPU từ số đo software renderer.

## Giáo trình, bản tải và giới hạn nghiệm thu

- 31 bài thuộc bảy học phần (7 / 3 / 3 / 4 / 4 / 5 / 5). Các phép kiểm web mở đủ 31 trang, so 64 đoạn trích với chính checkpoint của bài và kiểm mã hoàn chỉnh ở bài cuối. Cả 55 địa chỉ bài học đã đổi tên đều chuyển đến một bài đang có. Điểm hoàn thành của bản cũ không tự tính cho bài mới; tiến độ học phần khác được giữ nguyên.
- Bảy gói ZIP độc lập có tổng cộng 868 file. Đã đối chiếu SHA-256 từng file với bản nguồn dùng để build; không có bộ biên dịch, SDL DLL, file EXE hay thư mục build trong ZIP.
- Đã build bảy starter, 31 checkpoint và bảy bản final bằng Visual Studio 2022; CTest đạt 7/7 project ở cả Debug lẫn Release. Đã mở cả 45 executable Release bằng SDL, vẽ một khung rồi thoát. MSVC vẫn có một cảnh báo C4100 ở fixture của test Project 60: phép dò này cố ý trả cùng vật liệu bất kể ô được hỏi. Cảnh báo không thuộc mã chạy của ống ngắm.
- TypeScript và production build đạt. Có 33 phép kiểm nội dung/đường dẫn/mã nguồn và 14 ca Chrome trên desktop, gồm chuột, phím, chế độ giảm chuyển động và tải ZIP. Các ảnh phía dưới là ảnh SDL; Canvas trong bài là công cụ để thử từng ý, không phải bản port của trò chơi.
- Không tuyên bố toàn repository đã qua mọi test: kiểm nguồn toàn khóa còn báo thụt 10 dấu cách trong `morph_app.hpp` của Project 42 và không nhận kiểu hàm `require` trong test của Project 49. Hai điểm đó có từ trước; chúng không phải kết quả CTest của các project voxel. Chưa kiểm thiết bị di động hay cảm giác điều khiển C++ bằng tay người chơi.

### Kiểm riêng đường tự học từ starter (20/11/2026)

Đợt này kiểm **bản do người học xây**, không dùng kết quả của bản final làm bằng chứng. Cả 31 bài đều chỉ nơi viết mã trong `work/`, nơi gọi nó và kết quả có thể nhận ra khi chạy. Có 94 đoạn trích C++ ngay trong bài và 83 lượt hướng dẫn sửa tệp. Từng bài phải có ít nhất một đoạn trích thật sự mới so với bài trước; các hàm đã có được giới thiệu là phần dùng lại.

- Từ mỗi starter, áp các bước theo thứ tự xuất hiện trong bài, kiểm dòng làm mốc và đoạn cũ trước mỗi lần thay. Toàn bộ mã sau từng bài khớp checkpoint tương ứng; sau bài cuối khớp final của cả bảy project.
- Giải bảy ZIP vào các thư mục riêng, cấu hình chế độ học rồi build và chạy `project_N_work --smoke` sau đủ **31 lần sửa** bằng Visual Studio 2022. Ở 58.1, chương trình thật in `1 blocks, 6 quads`; ở 58.3 là `4096 blocks, 24576 quads`. Cấu hình lại sau bài đầu không ghi đè bài làm.
- Tests dùng `work/include` qua cả Debug và Release ở cả bảy project. Kiểm đối chứng: đổi sáu mặt thành năm **chỉ trong work/** của 58 thì CTest thất bại, mặc dù bản final bên cạnh vẫn đúng. Công cụ tái lập: `scripts/verify-voxel-workbook.mjs`.
- Bản build web cuối qua 35 phép kiểm nội dung/đường dẫn/tái tạo bài làm và 19 ca Chromium, gồm mở đúng đoạn sửa ở cả bảy project mà không mở lời giải. Danh sách tệp và từng byte trong bảy ZIP đều khớp nguồn đóng gói. Smoke một khung không chứng minh cảm giác đi bộ; phiên khảo sát dài đã ghi ở trên không được tính như một lần chạy mới trong đợt biên tập này.

## Ảnh đối chiếu

[Bờ suối đầu tiên](../../public/field-notes/voxel-expedition/streambank.png) · [Mỏm đá ngoài biển](../../public/field-notes/voxel-expedition/coast.png) · [Tuyết giữa rừng thông](../../public/field-notes/voxel-expedition/snow.png) · [Bếp lửa bên đường](../../public/field-notes/voxel-expedition/fire.png). Các ảnh do chính ứng dụng SDL lưu sau khi vẽ, không phải ảnh ý tưởng. Chụp lại bằng `--landmark 3 --hour 11 --time 3 --capture snow.png`; thay landmark để lấy mốc khác.

Hai phép so ảnh giữ nguyên camera trên bản Release, lấy mẫu cách sáu pixel và chỉ đếm khi tổng chênh lệch ba kênh màu đạt 12/765:

- **Ở biển:** mốc 0, 11 giờ, đổi `--time 2` thành `--time 4`. Trong dải nhìn xuống nước (x: 16–80%, y: 62–89% khung hình), 3.333/3.480 mẫu đổi màu. Cả hai ảnh đều có 105.694 block và 10.912 quad; không cần thay địa hình để mặt biển chuyển động.
- **Ở hẻm đá:** mốc 2, `--time 3`, đổi `--hour 7` thành `--hour 17`. Trong dải nhìn vách và lòng hẻm (x: 16–80%, y: 58–89%), 3.830/3.960 mẫu đổi màu. Đây là bằng chứng phần địa hình cũng nhận ánh sáng theo giờ, không chỉ phần bầu trời. CTest kiểm riêng dấu của hướng nắng và normal sóng; khác màu giữa hai ảnh không tự chứng minh hai công thức ấy đúng.
