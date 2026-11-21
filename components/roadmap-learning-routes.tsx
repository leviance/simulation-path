/** Anchors lead to the canonical roadmap entry, even for an unpublished project. */
export function RoadmapLearningRoutes() {
  return (
    <details className="callout">
      <summary>
        <strong>Chọn đường học theo thứ bạn muốn tự xây</strong>
      </summary>
      <p>
        Nếu đã dùng được C++ và biết toán phổ thông, hãy bắt đầu bằng một hình ảnh bạn muốn làm
        được. Các số bên dưới là mốc để quay lại trên bản đồ, không phải cách đánh số mới. Mỗi dự án
        vẫn ghi rõ phần nào cần biết trước.
      </p>
      <h3>Tôi muốn hiểu một cảnh 3D được vẽ thế nào</h3>
      <p>
        Tự đặt pixel và vẽ cạnh ở <a href="#project-01">01–05</a>. Dùng vector, góc và phép biến đổi
        ở <a href="#project-06">06–10</a> để dựng một la bàn 3D. La bàn dùng sẵn một bộ chiếu; đến{" "}
        <a href="#project-11">11</a>, bạn tự viết phần ấy cho một đốm sáng.{" "}
        <a href="#project-12">12</a> dùng nó cho cả ba đỉnh của tam giác xoay. Đi tiếp đến{" "}
        <a href="#project-21">viewer OBJ ở 21</a>, rồi mở cùng mô hình bằng hai renderer ở{" "}
        <a href="#project-34">33–34</a>.
      </p>
      <h3>Tôi muốn đi lại trong thế giới do mình tạo</h3>
      <p>
        Hãy đi thử trong <a href="#project-14">căn phòng ở 14</a> trước. Khi đã quen camera, mesh và
        texture, dùng <a href="#project-52">52</a> để biết một tia nhìn trúng mặt nào.{" "}
        <a href="#project-58">58–64</a> đưa bạn từ một chunk tới chuyến đi qua sông, rừng và bờ
        biển. Đây là nền cho game góc nhìn thứ nhất: chưa cần xây kho đồ, đào block hay học hết
        nhánh CT để bước vào cảnh.
      </p>
      <h3>Tôi muốn cảnh đông hơn mà vẫn chạy mượt</h3>
      <p>
        Chạy <a href="#project-27">đàn chim ở 27</a>, giữ nguyên cảnh rồi so với
        <a href="#project-28"> cách tìm hàng xóm ở 28</a>. Hãy đối chiếu số cặp phải xét và hành vi
        của đàn, không nhìn riêng FPS. Khi đã quen OpenGL, dùng
        <a href="#project-37"> 37</a> để đưa phép tính lên GPU rồi thử nó trong
        <a href="#project-39"> thành phố đông vật thể ở 39</a>.
      </p>
    </details>
  );
}
