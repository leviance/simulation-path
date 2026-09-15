import type { Metadata } from "next";
import Link from "@/components/app-link";
import { HighlightedCode } from "@/components/highlighted-code";

export const metadata: Metadata = {
  title: "Bắt đầu",
  description: "Cài C++20, CMake, build bộ khung và chạy project SDL3 đầu tiên.",
};

export default function GettingStartedPage() {
  return (
    <main className="shell reading-page">
      <header className="article-hero">
        <span className="eyebrow">
          <i /> BẮT ĐẦU
        </span>
        <h1>
          Dựng môi trường một lần.
          <br />
          Sau đó tập trung vào code.
        </h1>
        <p>
          Trang này đưa bạn từ một máy chưa có bộ công cụ đến lúc build được mã khởi đầu. Các
          project dùng C++20, CMake 3.24 trở lên và SDL 3.4.8; bạn không cần cài SDL bằng tay.
        </p>
      </header>

      <div className="prose standalone-prose">
        <h2 id="prerequisites">Bạn cần biết gì trước?</h2>
        <p>
          Bạn nên đọc được một chương trình C++ có hàm, <code>if</code>, vòng lặp,{" "}
          <code>struct</code>, reference và <code>std::vector</code>. Nếu chưa quen RAII cũng không
          sao: khi tạo window, renderer hoặc texture, bài học đều chỉ rõ tài nguyên được tạo ở đâu
          và phải hủy lúc nào.
        </p>
        <p>
          Bạn chưa cần học đồ họa máy tính, game engine hay đại số tuyến tính trước. Mỗi khái niệm
          toán học sẽ được giới thiệu ngay lúc chương trình cần đến nó, kèm một Canvas để bạn thay
          số và quan sát.
        </p>
        <div className="callout">
          <b>Sau trang này, bạn cần làm được ba việc</b>
          <p>
            Configure một gói source, build đúng target và chạy được tệp vừa tạo. Nếu một trong ba
            việc chưa thành công, hãy sửa môi trường trước khi bắt đầu Project 01.
          </p>
        </div>

        <h2 id="toolchain">1. Cài và kiểm tra bộ công cụ</h2>
        <h3>Windows · Visual Studio 2022</h3>
        <p>
          Mở Visual Studio Installer và chọn workload <strong>Desktop development with C++</strong>.
          Trong danh sách thành phần, giữ MSVC, Windows SDK và CMake tools. Sau khi cài xong, mở{" "}
          <strong>Developer PowerShell for VS 2022</strong> từ Start Menu.
        </p>
        <HighlightedCode language="bash" code={"cmake --version\ncl"} />
        <p>
          <code>cl</code> có thể in thông tin phiên bản kèm thông báo thiếu tệp đầu vào. Điều đó
          bình thường; mục đích ở đây chỉ là xác nhận terminal tìm thấy compiler. Nếu PowerShell báo
          không nhận diện được lệnh, hãy kiểm tra lại workload trước khi đọc tiếp.
        </p>

        <h3>macOS</h3>
        <HighlightedCode
          language="bash"
          code={"xcode-select --install\nbrew install cmake\ncmake --version\nclang++ --version"}
        />
        <p>
          Lệnh <code>brew</code> cần Homebrew. Nếu bạn không dùng Homebrew, có thể cài CMake theo
          cách khác rồi kiểm tra lại bằng <code>cmake --version</code>.
        </p>

        <h3>Linux · Ubuntu/Debian</h3>
        <HighlightedCode
          language="bash"
          code={
            "sudo apt update\nsudo apt install build-essential cmake ninja-build git\ncmake --version\ng++ --version"
          }
        />

        <h2 id="repository">2. Tải một project và chọn nơi bạn sẽ viết code</h2>
        <p>
          Vào trang <Link href="/downloads">Mã nguồn</Link>, tải ZIP của project rồi giải nén. Bên
          trong, các thư mục có vai trò khác nhau:
        </p>
        <HighlightedCode
          language="text"
          code={[
            "starter/             nơi bạn bắt đầu và tiếp tục viết code",
            "checkpoints/01..06/  lời giải tham khảo ở cuối từng bài",
            "final/               mã hoàn chỉnh của cả project",
            "tests/               kiểm thử phần code không cần mở cửa sổ",
            "CMakeLists.txt       mô tả các chương trình có thể build",
            "README.md            cách build, điều khiển và kết quả mong đợi",
          ].join("\n")}
        />
        <p>
          Hãy coi <code>starter/</code> là bản làm bài của bạn: sửa các tệp trong đó và tiếp tục
          dùng target <code>project_1_starter</code> suốt project. Tên target không đổi dù chương
          trình của bạn ngày càng hoàn thiện.
        </p>
        <p>
          Các thư mục <code>checkpoints/</code> và <code>final/</code> là bản đối chiếu. Đừng viết
          bài trực tiếp trong đó, nếu không bạn sẽ khó biết phần nào do mình làm và phần nào vốn đã
          có trong lời giải.
        </p>

        <h2 id="configure">3. Để CMake chuẩn bị thư mục build</h2>
        <p>
          Mở terminal tại thư mục vừa giải nén, nơi có <code>CMakeLists.txt</code>, rồi chạy:
        </p>
        <HighlightedCode language="bash" code={"cmake -S . -B build -DBUILD_CHECKPOINTS=ON"} />
        <p>
          Bước này gọi là <em>configure</em>. <code>-S .</code> bảo CMake đọc source ở thư mục hiện
          tại; <code>-B build</code> bảo nó đặt mọi file sinh ra vào <code>build/</code>. Tùy chọn
          cuối cùng bật thêm target cho starter và sáu checkpoint.
        </p>
        <p>
          Lần configure đầu cần mạng vì CMake tải đúng source SDL 3.4.8 và kiểm tra SHA-256. Những
          lần sau nó dùng bản đã có trong build directory. Nếu bạn đổi compiler hoặc generator, hãy
          tạo thư mục khác như <code>build-msvc</code> hoặc <code>build-ninja</code>; đừng dùng
          chung một thư mục cho hai cấu hình.
        </p>

        <h2 id="build">4. Build đúng bản bạn đang sửa</h2>
        <p>
          Với Project 01, bản làm bài nằm trong <code>starter/</code>, nên target cần build là{" "}
          <code>project_1_starter</code>:
        </p>
        <HighlightedCode
          language="bash"
          code={"cmake --build build --config Debug --target project_1_starter"}
        />
        <p>Nếu compiler không báo lỗi, chạy tệp vừa tạo:</p>
        <HighlightedCode
          language="bash"
          code={
            "# Windows / Visual Studio\n.\\build\\Debug\\project_1_starter.exe\n\n# macOS, Linux hoặc Ninja\n./build/project_1_starter"
          }
        />
        <p>
          Starter của Project 01 chỉ thoát ngay và chưa mở cửa sổ; đó là kết quả đúng. Sau Bài 01,
          cùng target này sẽ mở được window SDL. Với project khác, thay số <code>1</code> bằng số
          ghi trong README.
        </p>
        <p>
          <code>--config Debug</code> được dùng bởi generator nhiều cấu hình như Visual Studio. Với
          Ninja hoặc Makefiles, bạn thường chọn cấu hình ngay lúc configure bằng{" "}
          <code>-DCMAKE_BUILD_TYPE=Debug</code>.
        </p>

        <h2 id="checkpoints">5. Dùng checkpoint để đối chiếu, không phải để chép bài</h2>
        <p>
          Mỗi checkpoint là chương trình ở đúng cuối một bài. Chẳng hạn,{" "}
          <code>project_2_checkpoint_3</code> cố ý giữ cách di chuyển phụ thuộc FPS; checkpoint 4
          cho thấy phần code cần đổi khi đưa <code>dt</code> vào.
        </p>
        <HighlightedCode
          language="bash"
          code={
            "cmake --build build --config Debug --target project_1_checkpoint_1\ncmake --build build --config Debug --target project_1_checkpoint_2"
          }
        />
        <p>
          Khi code của bạn chưa chạy, hãy so theo thứ tự: đọc diff trong bài, mở đúng hàm vừa sửa,
          sau đó mới xem toàn bộ checkpoint. Hai bản không cần giống từng dòng; điều quan trọng là
          bạn giải thích được dữ liệu đi qua chương trình thế nào và kết quả có vượt qua phần tự
          kiểm tra hay không.
        </p>

        <h2 id="final-build">6. Build bản hoàn chỉnh và chạy test</h2>
        <p>Khi học xong project, build toàn bộ target rồi chạy CTest:</p>
        <HighlightedCode
          language="bash"
          code={
            "cmake --build build --config Debug\nctest --test-dir build -C Debug --output-on-failure"
          }
        />
        <p>
          Lệnh build không có <code>--target</code> sẽ dựng bản final, tests và cả
          starter/checkpoint nếu bạn đã bật <code>BUILD_CHECKPOINTS</code>. CTest kiểm tra phần
          thuật toán không cần mở cửa sổ; bạn vẫn phải chạy ứng dụng và làm checklist thủ công ở
          cuối bài.
        </p>

        <h2 id="debug">7. Khi có lỗi, kiểm tra theo thứ tự này</h2>
        <ol>
          <li>
            Đọc lỗi đầu tiên do compiler hoặc SDL in ra. Những lỗi phía sau thường chỉ là hệ quả của
            lỗi đầu.
          </li>
          <li>
            Xác nhận bạn vừa build và chạy cùng một target; đừng sửa starter nhưng lại mở bản final.
          </li>
          <li>
            Đặt breakpoint trước chỗ dữ liệu thay đổi, rồi xem đầu vào, kết quả trung gian và điều
            kiện phải luôn đúng.
          </li>
          <li>So phần diff của bài với code mình vừa thêm. Chỉ sửa từng khác biệt mà bạn hiểu.</li>
          <li>Chạy lại CTest và lặp lại checklist thủ công sau khi lỗi đã hết.</li>
        </ol>
        <p>
          Trong Visual Studio, bạn có thể mở solution do CMake tạo trong <code>build/</code>, chọn
          target starter làm Startup Project rồi nhấn F5. Với editor khác, hãy trỏ debugger tới đúng
          executable đang được build.
        </p>

        <h2 id="troubleshooting">8. Ba lỗi thiết lập thường gặp</h2>
        <ul>
          <li>
            <strong>CMake không tìm thấy compiler:</strong> trên Windows, mở Developer PowerShell;
            nếu vẫn lỗi, kiểm tra lại workload rồi configure vào một build directory mới.
          </li>
          <li>
            <strong>Không tải được SDL:</strong> kiểm tra mạng, proxy và chứng chỉ. Đừng xóa{" "}
            <code>URL_HASH</code> để lách lỗi, vì checksum giúp mọi người build từ cùng một source.
          </li>
          <li>
            <strong>Không thấy target starter hoặc checkpoint:</strong> chạy lại bước configure với{" "}
            <code>-DBUILD_CHECKPOINTS=ON</code>. Chỉ chạy <code>cmake --build</code> sẽ không thay
            đổi tùy chọn đã lưu.
          </li>
        </ul>

        <h2 id="workflow">9. Một nhịp học dễ theo dõi</h2>
        <ol>
          <li>Đọc thử thách ở đầu project và tự làm trong khoảng thời gian được gợi ý.</li>
          <li>Build target starter trước khi sửa, để biết chắc điểm xuất phát đang hoạt động.</li>
          <li>Thêm từng khối code theo bài và build lại sau mỗi thay đổi có thể quan sát.</li>
          <li>Dùng Canvas để thử tham số, sau đó tự giải thích vì sao kết quả đổi.</li>
          <li>Chạy code của mình trước khi mở diff và checkpoint.</li>
          <li>Làm thí nghiệm lỗi, checklist và CTest rồi mới đánh dấu hoàn thành.</li>
        </ol>

        <h2 id="conventions">10. Những quy ước dùng trong toàn khóa</h2>
        <ul>
          <li>Screen space có gốc ở góc trên bên trái; +X sang phải và +Y đi xuống.</li>
          <li>
            Thời gian mô phỏng tính bằng giây; <code>dt</code> dùng kiểu <code>double</code>.
          </li>
          <li>
            Trong các bài tự viết software renderer, bạn không dùng API vẽ primitive có sẵn của SDL
            để thay cho thuật toán đang học.
          </li>
          <li>
            API, identifier và thuật ngữ kỹ thuật được giữ bằng tiếng Anh để bạn tra được tài liệu
            gốc.
          </li>
          <li>
            Mã chuẩn dùng C++20, CMake tối thiểu 3.24 và luôn link SDL qua <code>SDL3::SDL3</code>.
          </li>
        </ul>

        <div className="next-card">
          <span>SẴN SÀNG?</span>
          <h3>Môi trường đã sẵn sàng? Hãy tự mở cửa sổ SDL đầu tiên.</h3>
          <Link href="/projects/hello-pixels">Mở Dự án 01 →</Link>
        </div>
      </div>
    </main>
  );
}
