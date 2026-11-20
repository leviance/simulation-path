import type { ProjectLearningAssets } from "../../learning/types";
const data = {
  guides: {
    "p65-l01": {
      focus:
        "Giả sử một con chim vừa đổi hướng khi bạn kéo thanh trượt. Làm sao biết đó là tác dụng của ngón tay, chứ không phải vì máy vừa vẽ chậm một khung hình? Ta cần một đàn chim có thể dừng lại và tiến đúng một bước trước khi làm bất kỳ chiếc nút nào.",
      expected:
        "Pause giữ nguyên cả vị trí lẫn số tick. Bấm N ba lần tăng đúng ba tick. Thả Space sau khi giữ lâu không làm ứng dụng chạy bù khoảng thời gian đang dừng.",
      files: ["src/main.cpp", "include/simulation.hpp"],
      steps: [
        {
          title: "Đọc đồng hồ, chuyển nano giây thành giây",
          explanation:
            "Giữ thời điểm khung trước trong `previous`. Lấy hiệu hai lần đọc, sau đó cập nhật `previous` ngay. Phần vẽ vẫn chạy cả lúc Pause: dừng chim không có nghĩa là dừng cả cửa sổ.",
        },
        {
          title: "Một lần bấm N tương ứng một bước vật lý",
          explanation:
            "Một bước là 1/60 giây, đúng như ở Project 28. Nếu mới trôi qua nửa bước, giữ lại phần dư. Nếu bạn kéo cửa sổ làm một frame quá dài, chỉ nhận tối đa 0,1 giây và xử lý tối đa sáu bước: UI không phải ngồi đợi solver chạy bù.",
        },
      ],
    },
    "p65-l02": {
      focus:
        "Nếu phải nhắm thấp hơn hình nút vài pixel mới thấy nó sáng, lỗi thường không nằm ở chuột: phần vẽ và phần bắt chuột đang dùng hai hình chữ nhật khác nhau.",
      expected:
        "Rời nút là hết hover. Đi qua phần trống không làm sáng nút nào. Chưa có lệnh nào thay đổi bán kính hay vị trí chim.",
      files: ["include/geometry.hpp", "include/controls.hpp"],
      steps: [
        {
          title: "Quy ước bốn cạnh của nút",
          explanation:
            "Lấy nút Pause từ x=676 tới x=788. Điểm x=676 thuộc nút, còn x=788 thì không. Nhờ miền nửa mở này, hai control đặt sát nhau không thể cùng nhận điểm trên đường biên.",
        },
        {
          title: "Tìm control từ cùng bảng bounds",
          explanation:
            "Viết danh sách control theo thứ tự đọc. Với mỗi control, hỏi điểm có nằm trong bounds không. Nếu không tìm thấy, trả `None`: khoảng trống trên panel không phải là nút gần nhất. Hai slider chỉ có thể nhận chuột từ bài 4.",
        },
      ],
    },
    "p65-l03": {
      focus:
        "Bạn định bấm Reset nhưng đổi ý khi ngón tay còn giữ chuột. Thả ngoài nút phải cho phép hủy, không được làm cả đàn quay về điểm xuất phát.",
      expected:
        "Nhấn Reset, kéo sang Pause rồi thả: cả hai nút đều không chạy. Bấm checkbox một lần chỉ đổi lớp quan sát một lần. Pause không cản hover hay Reset.",
      files: ["include/controls.hpp", "include/simulation.hpp"],
      steps: [
        {
          title: "Chốt một lần click khi thả",
          explanation:
            "Giữ lại ID đã nhấn trước khi xóa `active`. Tính lại `hot` tại tọa độ release; đừng tin sự kiện motion cuối vì chuột có thể vừa đi qua nhiều pixel. Một release lẻ không được kích hoạt button.",
        },
        {
          title: "Lấy lại đúng đàn ở tick 0",
          explanation:
            "Reset dựng lại preset: seed 28, bán kính 64, trọng số tách 1,5 và vòng quan sát bật. Chỉ giữ ý định chạy hay dừng của người dùng. `clockRevision` báo cho vòng lặp bỏ khoảng thời gian thuộc lần chạy cũ.",
        },
      ],
    },
    "p65-l04": {
      focus:
        "Hai thanh trượt đều khiến đàn thay đổi, nhưng không theo cùng cách. Nếu dừng đàn và kéo Radius, bạn vẫn phải thấy danh sách hàng xóm đổi ngay. Nếu kéo Separation, chim không thể dịch chuyển khi thời gian đang dừng.",
      expected:
        "Ở cùng tick, bán kính lớn không làm mất một hàng xóm cũ nào. Kéo ra ngoài cả hai đầu vẫn dừng đúng 20 và 140. Đổi Separation khi Pause không làm chim nhảy sang chỗ khác.",
      files: ["include/controls.hpp", "include/view.hpp"],
      steps: [
        {
          title: "Chuyển vị trí chuột thành tham số solver",
          explanation:
            "Từ mép trái tới mép phải, nội suy bán kính từ 20 tới 140 pixel của thế giới và lực tách từ 0 tới 5. Nếu chuột kéo ra ngoài, vẫn cập nhật control đang giữ nhưng không để giá trị vượt miền.",
        },
        {
          title: "Vẽ núm từ giá trị thật, không từ chuột",
          explanation:
            "Phép ngược là lấy tỷ lệ của giá trị hiện tại để đặt núm trên track. Khi Reset bằng nút hoặc chỉnh bằng bàn phím, núm vẫn đúng vì nó đọc `model.colony.params`, không lưu một tọa độ x riêng.",
        },
      ],
    },
    "p65-l05": {
      focus:
        "Một người vừa chỉnh Radius bằng bàn phím. Chuột vô tình nằm trên Reset. Nhấn Enter phải tác động vào đâu? Nếu chương trình dựa vào hover, nó có thể xóa cả thí nghiệm.",
      expected:
        "Shift+Tab từ nút đầu quay về thanh cuối. Giữ Space không làm checkbox nhấp nháy. Nhấn phím mũi tên trên slider không truyền một thao tác thứ hai xuống cảnh.",
      files: ["include/controls.hpp"],
      steps: [
        {
          title: "Dời focus theo danh sách control",
          explanation:
            "Xử lý trường hợp chưa có focus trước khi tính chỉ số vòng. Cộng kích thước danh sách trước phép modulo để đi ngược từ phần tử đầu vẫn tới được phần tử cuối.",
        },
        {
          title: "Giữ phím không biến thành nhiều lần click",
          explanation:
            "Enter hoặc Space chỉ kích hoạt button/checkbox ở lần key-down đầu. Arrow có thể lặp để tinh chỉnh slider; Home và End đưa về hai đầu. Giá trị đi qua cùng `setSlider` với chuột.",
        },
      ],
    },
    "p65-l06": {
      focus:
        "Bạn kéo cửa sổ cho rộng gấp rưỡi. Nút vẽ ở đúng chỗ nhưng lại nhận click lệch; có khi kéo slider còn vô tình chọn sang một con chim. Đây là hai lỗi khác nhau: một lỗi tọa độ và một lỗi chuyển tiếp sự kiện.",
      expected:
        "Border letterbox không nhận click. Blur giữa lúc kéo không để lại `active`. Quay lại cửa sổ và mở Resume, lần click tiếp theo chỉ gây một tác dụng.",
      files: ["src/main.cpp", "include/controls.hpp"],
      steps: [
        {
          title: "Đổi tọa độ trước khi hit-test",
          explanation:
            "Dùng logical presentation với letterbox. `SDL_ConvertEventToRenderCoordinates` biết cách SDL đã đặt hình trong cửa sổ; đừng nhân thêm DPR sau đó. Nếu mất focus hoặc resize trong lúc kéo, giải phóng capture và tạm dừng.",
        },
        {
          title: "Đưa click còn lại vào tọa độ của đàn",
          explanation:
            "Hãy để panel thử nhận sự kiện trước. Chỉ click vào khung bay mới trừ gốc khung rồi nhân tỷ lệ thế giới. `selectAt` dùng khoảng cách tuần hoàn như Project 28 để chọn đúng cá thể ở gần mép.",
        },
      ],
    },
    "p65-l07": {
      focus:
        "Đàn bay đẹp không chứng minh slider đang sửa đúng mô hình. Chẳng hạn, vòng tròn có thể to gấp đôi nhưng solver vẫn hỏi bán kính cũ. Bài cuối cần một cách phát hiện lỗi này mà không dựa vào cảm giác.",
      expected:
        "Debug và Release đều qua CTest. Kéo ra ngoài panel, dùng bàn phím, resize và đổi focus không làm lẫn input giữa hai vùng. Có thể dừng cùng một đàn và đọc lại cùng kết quả ở cùng seed.",
      files: ["include/audit.hpp", "tests/tests.cpp"],
      steps: [
        {
          title: "So hai cách trả lời độc lập",
          explanation:
            "Sắp xếp kết quả từ các bucket rồi đối chiếu với kết quả vét cạn. F1 ở bản hoàn chỉnh chạy audit chỉ đọc: thao tác kiểm không được chữa dữ liệu sai hay làm chim nhảy một bước.",
        },
        {
          title: "Thử một thay đổi có tác dụng lên quỹ đạo",
          explanation:
            "Hai model khởi đầu giống nhau; giữ nguyên bán kính, chỉ đổi Separation rồi tiến đúng một tick. Kiểm thêm hai lịch khung hình có cùng tổng thời gian. Đây là test của hành vi, không phải so hai ảnh đẹp.",
        },
      ],
    },
  },
  references: {
    "p65-l01": [
      {
        label: "SDL_GetTicksNS",
        href: "https://wiki.libsdl.org/SDL3/SDL_GetTicksNS",
        kind: "SDL API",
      },
      {
        label: "SDL_RenderFillRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderFillRect",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l02": [
      {
        label: "SDL_RenderDebugText",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderDebugText",
        kind: "SDL API",
      },
      {
        label: "SDL_RenderRect",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderRect",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l03": [
      {
        label: "SDL_CaptureMouse",
        href: "https://wiki.libsdl.org/SDL3/SDL_CaptureMouse",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l04": [
      {
        label: "SDL_Event",
        href: "https://wiki.libsdl.org/SDL3/SDL_Event",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l05": [
      {
        label: "SDL_KeyboardEvent",
        href: "https://wiki.libsdl.org/SDL3/SDL_KeyboardEvent",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l06": [
      {
        label: "SDL_SetRenderLogicalPresentation",
        href: "https://wiki.libsdl.org/SDL3/SDL_SetRenderLogicalPresentation",
        kind: "SDL API",
      },
      {
        label: "SDL_ConvertEventToRenderCoordinates",
        href: "https://wiki.libsdl.org/SDL3/SDL_ConvertEventToRenderCoordinates",
        kind: "SDL API",
      },
      {
        label: "Input và hệ tọa độ logic",
        href: "/glossary#ui-logical-space",
        kind: "Thuật ngữ",
      },
    ],
    "p65-l07": [
      {
        label: "SDL_RenderPresent",
        href: "https://wiki.libsdl.org/SDL3/SDL_RenderPresent",
        kind: "SDL API",
      },
      {
        label: "Hot, active và keyboard focus",
        href: "/glossary#ui-hot-active-focus",
        kind: "Thuật ngữ",
      },
    ],
  },
} satisfies ProjectLearningAssets;
export default data;
