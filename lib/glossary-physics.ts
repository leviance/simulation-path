export const physicsGlossaryTerms = [
  {
    id: "projectile-motion",
    term: "Projectile motion",
    definition:
      "Chuyển động của một vật sau khi được phóng và chỉ còn chịu acceleration đã biết. Project 22 dùng trọng lực đều hướng xuống, chưa có lực cản không khí; vì vậy X chuyển động đều còn Y biến đổi bậc hai theo thời gian.",
  },
  {
    id: "initial-velocity",
    term: "Initial velocity",
    definition:
      "Vận tốc tại thời điểm bắt đầu mô phỏng. Với speed s và góc θ tính từ trục +X, hai component là vx=s·cos(θ) và vy=s·sin(θ); chúng mang đơn vị mét trên giây trong Project 22.",
  },
  {
    id: "gravity-acceleration",
    term: "Gravity acceleration",
    definition:
      "Gia tốc trọng trường kéo velocity theo hướng xuống. Project 22 chọn world Y hướng lên nên gravity có dạng (0,−9.81) m/s²; dấu âm thuộc hệ trục, không phải độ lớn trọng lực âm.",
  },
  {
    id: "analytic-solution",
    term: "Analytic solution",
    definition:
      "Công thức cho trạng thái tại thời điểm bất kỳ mà không cần bước qua mọi thời điểm trước đó. Với acceleration không đổi, position là p0+v0·t+0.5·a·t²; nó được dùng làm đường tham chiếu cho integrator trong Project 22.",
  },
  {
    id: "numerical-integration",
    term: "Numerical integration",
    definition:
      "Cách xấp xỉ chuyển động bằng nhiều bước thời gian hữu hạn. Mỗi bước cập nhật state từ state trước; bước càng nhỏ thường càng chính xác nhưng cần nhiều phép tính hơn.",
  },
  {
    id: "explicit-euler",
    term: "Explicit Euler",
    definition:
      "Integrator bậc một dùng velocity ở đầu bước để cập nhật position, rồi dùng acceleration để cập nhật velocity. Nó đơn giản và dễ kiểm tra nhưng tạo sai số O(dt); Project 23 sẽ đặt nó cạnh Verlet và RK4.",
  },
  {
    id: "physics-accumulator",
    term: "Physics accumulator",
    definition:
      "Biến giữ lượng thời gian render đã trôi qua nhưng chưa được mô phỏng. Mỗi khi accumulator đủ một fixed dt, chương trình chạy một physics step rồi trừ dt, nhờ vậy tốc độ render không quyết định kích thước bước vật lý.",
  },
  {
    id: "time-of-flight",
    term: "Time of flight",
    definition:
      "Khoảng thời gian từ lúc phóng tới lúc projectile chạm mặt đất. Với trọng lực đều, nó là nghiệm dương của phương trình y0+vy·t+0.5·gy·t²=groundY.",
  },
  {
    id: "integration-error",
    term: "Integration error",
    definition:
      "Khoảng cách giữa state do integrator số tạo ra và state tham chiếu tại cùng thời điểm. Project 22 đo Euclidean position error; so ở hai elapsed time khác nhau sẽ không có ý nghĩa.",
  },
  {
    id: "impact-interpolation",
    term: "Impact interpolation",
    definition:
      "Tìm tỷ lệ nằm giữa position trước và sau một physics step nơi đường đi cắt ground. Nó đưa viên đạn về đúng bề mặt và điều chỉnh elapsed theo phần bước đã thực sự đi, thay vì đơn giản clamp Y sau khi xuyên đất.",
  },
  {
    id: "harmonic-oscillator",
    term: "Harmonic oscillator",
    definition:
      "Hệ có acceleration tỷ lệ với độ lệch khỏi equilibrium và hướng ngược lại: x''=−(k/m)x. Nó có nghiệm sin-cos, total energy không đổi và là bài thử tốt để nhìn phase lẫn energy error của integrator.",
  },
  {
    id: "angular-frequency",
    term: "Angular frequency",
    definition:
      "Tốc độ pha của dao động, ký hiệu ω và tính bằng radian trên giây. Với mass-spring lý tưởng, ω=sqrt(k/m), còn period T=2π/ω.",
  },
  {
    id: "phase-space",
    term: "Phase space",
    definition:
      "Không gian xem position và velocity như hai tọa độ của cùng một state. Harmonic oscillator chính xác đi theo một ellipse trong phase space; integrator mất hoặc thêm energy làm quỹ đạo co vào hay nở ra.",
  },
  {
    id: "velocity-verlet",
    term: "Velocity Verlet",
    definition:
      "Integrator bậc hai cập nhật position bằng velocity cùng acceleration đầu bước, tính acceleration mới tại position mới, rồi cập nhật velocity bằng trung bình hai acceleration. Mỗi step của Project 23 cần hai force evaluation.",
  },
  {
    id: "runge-kutta-4",
    term: "Runge–Kutta 4 (RK4)",
    definition:
      "Integrator bậc bốn lấy bốn derivative sample k1–k4 trong một bước và ghép bằng weights 1-2-2-1. Nó thường chính xác hơn ở cùng dt nhưng trả giá bằng bốn derivative evaluation.",
  },
  {
    id: "energy-drift",
    term: "Energy drift",
    definition:
      "Sự thay đổi không có thật của numerical total energy so với energy ban đầu. Relative drift (E−E0)/E0 giúp so các cấu hình có mức energy khác nhau; giá trị tăng không bị chặn là dấu hiệu mất ổn định.",
  },
  {
    id: "force-evaluation",
    term: "Force evaluation",
    definition:
      "Một lần tính acceleration từ state hiện tại. Trong Project 23, Euler dùng 1, Velocity Verlet dùng 2 và RK4 dùng 4 evaluation mỗi step; đây là thước đo chi phí thuật toán đơn giản nhưng minh bạch.",
  },
  {
    id: "convergence-order",
    term: "Convergence order",
    definition:
      "Tốc độ error giảm khi dt được thu nhỏ. Nếu global error tỷ lệ dt^p, chia dt đôi làm error giảm xấp xỉ 2^p lần trong miền hội tụ; Euler, Verlet và RK4 lần lượt có order 1, 2 và 4.",
  },
  {
    id: "collision-detection",
    term: "Collision detection",
    definition:
      "Bước trả lời hai shape có chồng lấn hay không và tạo dữ liệu contact. Với hai circle, Project 24 so squared center distance với bình phương tổng radius trước khi cần sqrt.",
  },
  {
    id: "deterministic-simulation",
    term: "Deterministic simulation",
    definition:
      "Mô phỏng cho cùng initial state và chuỗi input sẽ tạo cùng kết quả. Project 24 dùng lattice cùng seeded PRNG thay vì clock/random_device để một collision bug có thể chạy lại và đưa vào regression test.",
  },
  {
    id: "contact-normal",
    term: "Contact normal",
    definition:
      "Unit vector chỉ hướng mà hai body cần tách nhau. Project 24 quy ước normal đi từ tâm ball A sang ball B; dấu của relative velocity chiếu lên normal cho biết cặp đang tiến lại gần hay tách ra.",
  },
  {
    id: "penetration-depth",
    term: "Penetration depth",
    definition:
      "Độ dài phần hai shape đang chồng lên nhau. Với circle, penetration bằng radiusA+radiusB−centerDistance và không được âm trong một contact hợp lệ.",
  },
  {
    id: "coefficient-of-restitution",
    term: "Coefficient of restitution",
    definition:
      "Hệ số e trong [0,1] điều khiển độ nảy dọc contact normal. e=1 là va chạm đàn hồi lý tưởng; e=0 loại relative normal speed sau impact nhưng không xóa chuyển động tiếp tuyến.",
  },
  {
    id: "collision-impulse",
    term: "Collision impulse",
    definition:
      "Một thay đổi momentum tức thời dùng để sửa velocity khi hai body đang tiến vào nhau. Impulse của Project 24 nằm dọc contact normal, có độ lớn phụ thuộc relative normal speed, restitution và tổng inverse mass.",
  },
  {
    id: "inverse-mass",
    term: "Inverse mass",
    definition:
      "Nghịch đảo 1/mass được dùng trực tiếp trong impulse solver. Body nhẹ có inverse mass lớn nên nhận thay đổi velocity/position nhiều hơn; inverse mass bằng zero biểu diễn body không di chuyển.",
  },
  {
    id: "positional-correction",
    term: "Positional correction",
    definition:
      "Bước dịch position để giảm penetration còn sót lại sau collision detection. Nó dùng slop và correction percentage để tránh sửa nhiễu rất nhỏ, đồng thời phân phối dịch chuyển theo inverse mass; nó không thay velocity.",
  },
  {
    id: "pairwise-brute-force",
    term: "Pairwise brute force",
    definition:
      "Duyệt mọi unordered pair i<j. Với N body có N(N−1)/2 cặp cho mỗi iteration, nên chi phí tăng theo O(N²); Project 24 giữ cách này để ưu tiên correctness trước Spatial Grid ở Project 28.",
  },
  {
    id: "linear-momentum",
    term: "Linear momentum",
    definition:
      "Vector p=m·v. Trong một va chạm nội bộ không có ngoại lực, tổng momentum của hai body phải giữ nguyên; đây là invariant mạnh để kiểm collision impulse.",
  },
  {
    id: "kinetic-energy",
    term: "Kinetic energy",
    definition:
      "Năng lượng chuyển động K=0.5·m·|v|². Va chạm với restitution 1 phải bảo toàn tổng kinetic energy trong case lý tưởng; restitution nhỏ hơn 1 cố ý làm giảm thành phần năng lượng dọc normal.",
  },
  {
    id: "mass-spring-system",
    term: "Mass–spring system",
    definition:
      "Mô hình gồm các particle có mass nối với nhau bằng spring. Mỗi spring chỉ tạo lực từ state của hai endpoint; dao động quy mô lớn xuất hiện khi những tương tác cục bộ này được cộng và tích phân qua thời gian.",
  },
  {
    id: "hookes-law",
    term: "Hooke's law",
    definition:
      "Định luật lò xo tuyến tính: độ lớn elastic force tỷ lệ với stretch x=distance−restLength. Project 25 dùng force magnitude k·x cùng direction từ endpoint A sang B; stretch âm biểu diễn nén.",
  },
  {
    id: "spring-rest-length",
    term: "Spring rest length",
    definition:
      "Chiều dài mà spring không tạo elastic force. Nó là thuộc tính vật liệu/topology, không phải khoảng cách hiện tại; hiệu giữa distance hiện tại và rest length chính là stretch có dấu.",
  },
  {
    id: "force-accumulation",
    term: "Force accumulation",
    definition:
      "Quy trình xóa force của substep cũ rồi cộng mọi external/internal force vào từng particle trước integration. Mỗi spring cộng +F và −F lên hai endpoint nên tổng lực nội bộ của cặp bằng zero.",
  },
  {
    id: "semi-implicit-euler",
    term: "Semi-implicit Euler",
    definition:
      "Integrator cập nhật velocity từ acceleration trước, sau đó cập nhật position bằng velocity mới. Nó vẫn là phương pháp bậc một nhưng thường giữ dao động bounded tốt hơn explicit Euler ở cùng bước thời gian.",
  },
  {
    id: "axial-spring-damping",
    term: "Axial spring damping",
    definition:
      "Lực cản dựa trên relative velocity chiếu lên trục spring. Chỉ chuyển động làm spring dài hoặc ngắn mới bị giảm; tangent motion không bị xóa như khi nhân toàn bộ velocity bằng một hệ số.",
  },
  {
    id: "kinematic-drag",
    term: "Kinematic drag",
    definition:
      "Tạm thời đặt position của một dynamic particle theo pointer thay vì để integrator quyết định. Các spring vẫn phản ứng với vị trí đó; khi thả, particle trở lại dynamics với release velocity được ước lượng và giới hạn.",
  },
  {
    id: "spring-stability-index",
    term: "Spring stability index",
    definition:
      "Chỉ số không thứ nguyên q=dt·sqrt(k/m) so integration step với time scale của oscillator. q lớn lên khi spring cứng hơn, mass nhẹ hơn hoặc dt dài hơn; nó là cảnh báo so sánh, không phải ngưỡng ổn định phổ quát cho mọi chain.",
  },
  {
    id: "mechanical-energy",
    term: "Mechanical energy",
    definition:
      "Tổng kinetic energy và các potential energy đang được mô hình hóa. Project 25 cộng kinetic, spring elastic và gravitational potential; damping làm tổng này giảm có chủ đích, còn tăng không bị chặn thường báo numerical instability.",
  },
  {
    id: "double-pendulum",
    term: "Double pendulum",
    definition:
      "Hệ gồm hai con lắc nối tiếp: pivot giữ rod thứ nhất, còn rod thứ hai gắn vào bob thứ nhất. Hai góc tạo một hệ coupled nonlinear; chuyển động của mỗi rod ảnh hưởng angular acceleration của rod còn lại.",
  },
  {
    id: "sensitive-dependence",
    term: "Sensitive dependence on initial conditions",
    definition:
      "Tính chất trong đó hai trajectory bắt đầu rất gần nhau có thể tách ra mạnh theo thời gian dù dùng cùng phương trình và tham số. Đây là dấu hiệu quan trọng của chaos, nhưng phải được phân biệt với sai số do integrator hoặc step size.",
  },
  {
    id: "wrapped-angle",
    term: "Wrapped angle difference",
    definition:
      "Hiệu hai góc được đưa về một khoảng đại diện như [-π,π]. Nhờ vậy +179° và -179° được hiểu là cách nhau 2° quanh đường tròn, thay vì bị đo nhầm thành 358°.",
  },
  {
    id: "numerical-shadow",
    term: "Numerical shadow trajectory",
    definition:
      "Trajectory tham chiếu bắt đầu từ đúng cùng initial state nhưng dùng discretization mịn hơn. Project 26 chạy hai bước dt/2 cho mỗi bước dt rồi so tại cùng elapsed time để ước lượng ảnh hưởng của numerical integration.",
  },
  {
    id: "finite-time-exponent",
    term: "Finite-time divergence exponent",
    definition:
      "Đại lượng log(d(t)/d0)/t đo tốc độ tăng trung bình của separation trên một khoảng thời gian hữu hạn. Nó giúp so các preset của Project 26 nhưng không tự động là Lyapunov exponent hội tụ của toàn hệ.",
  },
  {
    id: "lennard-jones-potential",
    term: "Lennard–Jones potential",
    definition:
      "Mô hình thế năng cặp U(r)=4ε[(σ/r)^12−(σ/r)^6]. Nhánh r^-12 tăng rất nhanh khi hai hạt ở gần, còn nhánh r^-6 tạo vùng hút ở xa hơn. Điểm thấp nhất nằm tại r=2^(1/6)σ với U=−ε.",
  },
  {
    id: "reduced-units",
    term: "Reduced units",
    definition:
      "Cách chọn các đại lượng chuẩn làm đơn vị để công thức gọn hơn. Project 41 mặc định lấy σ=1 cho chiều dài, ε=1 cho năng lượng và m=1 cho khối lượng; kết quả vì vậy mô tả hành vi của mô hình trước khi gắn với một chất cụ thể.",
  },
  {
    id: "pair-potential",
    term: "Pair potential",
    definition:
      "Hàm thế năng chỉ phụ thuộc trạng thái của một cặp hạt, thường là khoảng cách giữa chúng. Khi cộng lực cho hệ nhiều hạt, mỗi unordered pair i<j phải được xét một lần rồi đóng góp hai lực bằng nhau và ngược chiều.",
  },
  {
    id: "equilibrium-separation",
    term: "Equilibrium separation",
    definition:
      "Khoảng cách nơi đạo hàm của thế năng bằng zero nên lực cặp tức thời bằng zero. Với Lennard–Jones, r₀=2^(1/6)σ; đây là đáy giếng thế, không phải khoảng cách σ nơi thế năng đi qua zero.",
  },
  {
    id: "number-density",
    term: "Number density",
    definition:
      "Số hạt trên một đơn vị diện tích trong mô phỏng 2D hoặc một đơn vị thể tích trong 3D. Project 42 dùng density=N/(width·height), nhờ vậy tăng số hạt cũng làm hộp lớn lên thay vì vô tình ép các hạt chồng lên nhau.",
  },
  {
    id: "kinetic-temperature",
    term: "Kinetic temperature",
    definition:
      "Nhiệt độ suy từ chuyển động tương đối với tâm khối lượng. Project 42 dùng K_thermal=Σm|v−vCOM|²/2 và T=2K_thermal/(2N−2), đo lại vCOM ở mỗi trạng thái. Động năng toàn phần K trong E=K+U không bị trừ phần chuyển động khối. Đây là đại lượng trong reduced units của mô hình 2D, không phải kelvin.",
  },
  {
    id: "force-shifted-cutoff",
    term: "Force-shifted cutoff",
    definition:
      "Cách cắt pair potential tại rc bằng việc trừ cả giá trị và tiếp tuyến ở rc. Công thức làm U(rc)=0 và dU/dr(rc)=0, tránh bước nhảy lực khi một cặp vừa đi qua cutoff.",
  },
  {
    id: "unordered-pair",
    term: "Unordered pair",
    definition:
      "Một cặp phần tử không phân biệt thứ tự, nên cặp (i,j) và (j,i) là một. Vòng lặp j=i+1 xét đúng N(N−1)/2 unordered pair, bỏ self-pair và tránh cộng lực hai lần.",
  },
  {
    id: "reflective-boundary",
    term: "Reflective boundary",
    definition:
      "Biên cứng làm hạt bật lại khi vượt thành hộp. Vị trí được mirror theo phần overshoot và thành phần vận tốc vuông góc với tường đổi dấu; thành phần song song được giữ lại.",
  },
  {
    id: "quadratic-work",
    term: "Quadratic work",
    definition:
      "Khối lượng công việc tăng theo bình phương kích thước đầu vào. Với quét mọi cặp, N hạt tạo N(N−1)/2 lượt xét; tăng N khoảng bốn lần có thể làm workload tăng gần mười sáu lần.",
  },
  {
    id: "molecular-dynamics",
    term: "Molecular dynamics",
    definition:
      "Phương pháp mô phỏng chuyển động của nhiều hạt bằng cách tính lực từ trạng thái hiện tại rồi tích phân phương trình chuyển động qua các bước thời gian nhỏ. Kết quả đáng tin cậy cần kiểm tra timestep, năng lượng, biên và tính hữu hạn thay vì chỉ nhìn chuyển động trên màn hình.",
  },
  {
    id: "periodic-boundary",
    term: "Periodic boundary",
    definition:
      "Điều kiện biên coi ô mô phỏng được lặp lại theo các trục. Hạt đi qua một mép được biểu diễn ở mép đối diện mà không đảo vận tốc. Cả tọa độ lẫn phép đo khoảng cách dùng trong tương tác đều phải tuân theo sự lặp lại này.",
  },
  {
    id: "minimum-image",
    term: "Minimum image convention",
    definition:
      "Quy ước tính tương tác giữa hai hạt bằng vector tới ảnh tuần hoàn gần nhất. Với hộp chữ nhật, mỗi thành phần delta được đưa về [-L/2,L/2). Project 43 dùng cutoff nhỏ hơn nửa cạnh ngắn nhất để cặp có lực không nằm ở trường hợp hai ảnh gần ngang nhau.",
  },
  {
    id: "periodic-image",
    term: "Periodic image",
    definition:
      "Ảnh của một hạt tại vị trí p+(ix·Lx,iy·Ly), với ix và iy nguyên. Ảnh dùng để giải thích các ô lặp; bản sao được vẽ không có mass, velocity hoặc bước tích phân riêng và không được thêm vào danh sách hạt thật.",
  },
  {
    id: "unwrapped-coordinates",
    term: "Unwrapped coordinates",
    definition:
      "Tọa độ tích lũy displacement thực của hạt mà không đưa về ô gốc, nên giữ được hành trình qua nhiều ô tuần hoàn. Khi khởi tạo cùng mốc, wrap(unwrapped) gần bằng position. Không suy ra hành trình nhiều vòng từ hiệu hai position đã wrap.",
  },
  {
    id: "neighbor-list",
    term: "Neighbor list",
    definition:
      "Danh sách lưu chỉ số các cặp hạt có khả năng tương tác để không phải tìm lại mọi cặp ở mỗi lần tính lực. Danh sách chỉ lưu quan hệ cặp, không giữ một lực cố định. Khi dùng lại phải biết điều kiện nào bảo đảm nó chưa bỏ sót cặp đang có lực.",
  },
  {
    id: "neighbor-skin",
    term: "Neighbor skin",
    definition:
      "Phần bán kính thêm vào force cutoff khi dựng neighbor list: listRadius = cutoff + skin. Các cặp trong lớp đệm được lưu dự phòng nhưng chỉ có lực khi khoảng cách hiện tại nhỏ hơn cutoff. Skin lớn giữ danh sách được lâu hơn nhưng thường làm mỗi lần duyệt lực tốn hơn.",
  },
  {
    id: "half-skin-rule",
    term: "Half-skin rebuild rule",
    definition:
      "Nếu mỗi hạt dời chưa tới skin/2 so với mốc dựng danh sách, một cặp bị loại ở ngoài cutoff+skin chưa thể tiến vào cutoff: tổng độ dời của hai đầu còn nhỏ hơn skin. Phải kiểm trước mỗi lần tính lực, dùng unwrapped trong hộp tuần hoàn và dựng lại khi cấu hình hoặc danh tính hạt đổi.",
  },
] as const;
