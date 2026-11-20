# Sáu thí nghiệm với tia sáng

Bạn có thể thấy một lỗ rỗng bằng ba cách: cắt qua nó, nhìn xuyên qua cả vật, hoặc đo từ nhiều phía rồi dựng lại bên trong. Ba việc này không cho cùng một bức ảnh. Cụm Project 52–57 lấy sự khác biệt đó làm sợi chỉ xuyên suốt; bạn có sáu chương trình C++ độc lập để tự kiểm chứng.

| Project                                                    | Hãy thử trong bản C++                                                                                                 | Đọc kết quả ở đâu?                                                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [52 · Bàn đo quang học](../../content/ray-intersections)   | Bắn tia qua quả cầu rồi giảm `tMax` cho đến khi tia không còn tới mặt sau.                                            | [Hai điểm chạm và đoạn nằm trong vật](../../public/field-notes/optics/bench.png). Mặt phẳng và tấm tam giác không có bề dày như quả cầu.                                 |
| [53 · Cắt viên mã não](../../content/volume-slicer)        | Dời lát cắt qua tâm rồi qua hốc lệch tâm; đổi giữa XY, XZ và YZ mà vẫn giữ cùng một điểm đo.                          | [Vỏ đá, vân và tinh thể trên ba lát](../../public/field-notes/optics/agate.png). Bạn đang đọc trực tiếp mẫu trong khối 128³, chưa hề dựng ảnh từ tia.                    |
| [54 · Đài quan sát mây](../../content/volume-ray-marching) | Xoay nhìn vào khe giữa hai tháp mây; giữ nguyên tia rồi lần lượt chọn MIP, Average và Alpha.                          | [Đám mây hình đe và ba cách tích lũy](../../public/field-notes/optics/anvil.png). Hai đoạn mây cách nhau bởi không khí có thể chồng lên nhau trong ảnh.                  |
| [55 · Soi chiếc bộ đàm](../../content/xray-detector)       | Ngắm một tia đi qua viên pin, một tia qua khe giữa hai viên. Xoay vật để thấy bóng các bộ phận chồng lên nhau.        | [Vật, đường tia và detector](../../public/field-notes/optics/radio.png). Một pixel cho biết cả đường truyền bị suy giảm bao nhiêu, không cho biết riêng độ sâu của pin.  |
| [56 · Quét mặt cắt khúc gỗ](../../content/ct-sinogram)     | Che hình mẫu. Đo từ một góc rồi thu dần tới 180 góc; thử chỉ ra chỗ rỗng và mắt gỗ trên lát dựng trước khi mở mẫu.    | [Mẫu, sinogram và lát dựng lại](../../public/field-notes/optics/timber.png). Backprojection ở đây **không lọc**: tìm được vùng đặc, nhưng các vòng gỗ nhòe hơn mẫu thật. |
| [57 · Bể photon](../../content/photon-rain)                | Theo riêng một photon qua từng lần va chạm. Sau đó phát 16.384 photon và so số thoát khỏi bể với số tới màn bên phải. | [Vết đi, phân bố trên màn và bản đồ sự kiện](../../public/field-notes/optics/tank.png). Thoát ở đáy bể cũng là thoát, nhưng màn bên phải không đếm photon ấy.            |

Các ảnh trên được chụp từ chương trình C++ của từng project. Canvas dùng để thử câu hỏi ngay trong bài; nó không phải nguồn của các ảnh hay của mã C++.

## Từ starter đến sản phẩm của chính bạn

Mỗi ZIP trên website là một project độc lập. Giải nén, mở terminal trong thư mục có `CMakeLists.txt`, rồi bật chế độ bài tập. Ví dụ với Project 56 trên Windows:

```powershell
cmake -S . -B build-learn -DCOURSE_WORKBOOK=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-learn --config Release --target project_56_work --parallel 1
.\build-learn\Release\project_56_work.exe
```

Lần cấu hình đầu tạo `work/` từ starter. Sau mỗi bài, chỉ sửa file trong thư mục này, build lại **cùng target** và so điều bạn vừa nhìn thấy với mô tả của bài. Trong phần thực hành, mở ô mang tên file để xem cần giữ, bỏ và thêm những dòng nào. Muốn đối chiếu toàn bộ file, mở phần mã nguồn ở cuối bài. Cấu hình CMake lại không xóa bài làm. Nếu dùng generator một cấu hình như Ninja, chương trình nằm ngay trong `build-learn/`.

Cuối project, `final/` là lời giải trọn bộ để so sánh, không phải thư mục phải chép đè vào `work/`. Có thể chạy test trực tiếp với bài làm:

```powershell
cmake --build build-learn --config Release --target project_56_tests --parallel 1
ctest --test-dir build-learn -C Release --output-on-failure
```

Đổi `56` thành số project đang học. Một bài kiểm hay cho riêng Project 56: khi vừa đo một góc, lát dựng phải có một dải nhòe theo góc đó. Nếu lập tức thấy đủ từng vòng gỗ như ảnh mẫu, hãy kiểm tra xem phần dựng ảnh có vô tình đọc thẳng dữ liệu của vật hay không.

## Làm sao biết giáo trình không bỏ sót mã?

Trong lần nghiệm thu trên Windows, cả sáu ZIP đều được giải nén ra thư mục mới. Từ mỗi starter, chương trình kiểm áp dụng lần lượt các thay đổi được nêu trong bài, biên dịch và mở bản C++ sau từng bước. Sau 56 bài, sáu thư mục `work/` khớp với `final/` tương ứng và đều qua CTest ở cả Debug lẫn Release. Bạn không cần chạy phép kiểm này để học.

Nếu biên tập giáo trình, có thể lặp lại một project bằng lệnh sau, từ gốc repository. Thay đường dẫn cuối bằng thư mục chứa `SDL3Config.cmake` của bản SDL 3.4.8 đã cài:

```text
node --experimental-strip-types scripts/verify-voxel-workbook.mjs 55 <thu-muc-SDL3Config>
```

Độ đúng của hình vẽ được kiểm riêng. Chẳng hạn, shader Project 54 được so với bản CPU ở 1.452 giá trị trên GPU OpenGL 3.3; sai lệch lớn nhất đo được là 0,000319. Phép so này kiểm kết quả tính trên máy, không thay thế việc xoay đám mây để xem người học có nhận ra hai lớp cách nhau bằng khoảng trống hay không.
