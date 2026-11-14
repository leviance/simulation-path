# Công thức và nguồn của Atomic Playground

Mã C++/GLSL/TypeScript trong học phần được viết riêng. Không sao chép source,
binary, asset hoặc dependency từ repository của tác giả video.

- [OpenStax, University Physics Volume 3, §8.1](https://openstax.org/books/university-physics-volume-3/pages/8-1-the-hydrogen-atom): ý nghĩa mật độ xác suất, tọa độ cầu và các hàm 1s/2s/2p. Đây là nguồn công thức được cung cấp, không phải yêu cầu suy cơ học lượng tử.
- [NIST DLMF 18.39.37](https://dlmf.nist.gov/18.39.E37): radial hydrogen chuẩn hóa theo measure r² dr. Catalog dùng n=l+1 cho 1s/2p/3d/4f và công thức riêng 2s; không cần một solver Laguerre tổng quát.
- [NIST DLMF §14.30](https://dlmf.nist.gov/14.30): spherical harmonics. Các đa thức real Cartesian trong catalog được kiểm độc lập bằng tích phân moment trên sphere và node/symmetry fixtures.
- [Video/reference project Atoms](https://github.com/kavan010/Atoms): tham chiếu trải nghiệm hiển thị, không dùng làm oracle phân bố hoặc giấy phép mặc định để reuse. Chưa xác nhận quyền reuse code/asset từ repository này; không copy chúng.

Quy ước của catalog: hydrogen một electron, a0=1, density=|R(r)Y(direction)|².
Một triệu điểm là một triệu mẫu vị trí, không phải một triệu electron. Màu sign
chỉ dấu của basis real, không phải xác suất âm hoặc vận tốc. Không dùng các hàm
này như nghiệm chính xác cho mọi nguyên tố, nhiều electron hoặc hóa học.

Sampler dùng radial midpoint mass r²R² Δr và angular midpoint mass Y² Δmu Δphi,
mu=cos(theta). Sau khi chọn cell theo CDF, jitter đều trong từng tọa độ r/mu/phi;
đây là PDF piecewise-constant trong các tọa độ đó, không phải lời khẳng định đã
lấy mẫu nghiệm liên tục chính xác. R_max cắt tail; xác suất báo trong UI là
conditional trong miền đã giữ lại, tail riêng, không normalize lại sau clipping.

RNG counter dùng hash unsigned 32-bit và top 23 bits + half-bin để float nằm
strictly trong (0,1). Không có rejection loop; rejection budget bằng 0. Invalid
record làm candidate thất bại; không chèn điểm gốc hoặc nhân bản để giả đủ N.
