export const photonGlossaryTerms = [
  {
    id: "photon-free-path",
    term: "Quãng đường tự do",
    definition:
      "Trong môi trường đồng nhất, muT=muA+muS là hệ số tương tác tổng, có đơn vị nghịch đảo chiều dài. Lấy U trong (0,1), S=-log1p(-U)/muT có phân bố mũ. Photon chỉ đi min(S,khoảng cách tới biên); muT=0 là chân không, không chia cho 0. S không phải tốc độ hoặc khoảng cách cố định mỗi frame.",
  },
  {
    id: "photon-analog-transport",
    term: "Analog photon transport",
    definition:
      "Mỗi photon mang một đơn vị và có lịch sử sống/mất rõ ràng. Tại tương tác, hấp thụ với xác suất muA/muT, còn lại tán xạ. Không đồng thời nhân thêm Beer–Lambert để giảm trọng số, vì như vậy đếm suy giảm hai lần. Project 57 dùng hướng tán xạ đều trên đường tròn 2D, không mô phỏng photon vật lý đầy đủ.",
  },
  {
    id: "photon-censoring",
    term: "Photon bị dừng bởi ngân sách",
    definition:
      "Photon chạm eventLimit khi chưa absorbed/escaped được ghi Censored: chương trình chưa biết kết cục thật. Nó vẫn ở mẫu số N, không được tính hấp thụ hoặc bỏ khỏi thống kê. [escaped/N,(escaped+censored)/N] là khoảng bất định kết cục của những lịch sử đang bị dừng, không phải confidence interval do lấy mẫu.",
  },
  {
    id: "photon-ballistic",
    term: "Ballistic và tổng thoát",
    definition:
      "Ballistic là photon thoát mà chưa từng tương tác/tán xạ. Với chùm ban đầu đi đoạn L trong môi trường đồng nhất, xác suất không tương tác là exp(-(muA+muS)*L). Tổng photon thoát còn gồm các photon đã tán xạ rồi thoát ở bất kỳ cạnh nào; hai đại lượng chỉ trùng nhau trong môi trường chỉ hấp thụ của project.",
  },
  {
    id: "photon-monte-carlo-uncertainty",
    term: "Bất định Monte Carlo",
    definition:
      "Tỷ lệ k/N là ước lượng từ mẫu ngẫu nhiên; sai số chuẩn Bernoulli lý tưởng cỡ sqrt(p*(1-p)/N). Wilson interval mô tả bất định của tỷ lệ, kể cả k=0 hoặc k=N, nhưng không bảo đảm mọi seed chứa đúng tham số trong khoảng95%. Tăng N không khắc phục sai mô hình hoặc việc gán sai kết cục photon Censored.",
  },
];
