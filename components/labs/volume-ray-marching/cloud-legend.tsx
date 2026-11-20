import { cloudLandmarks } from "@/lib/labs/volume-ray-marching/cloud";
import { sampleDensity, type Volume } from "@/lib/labs/volume-ray-marching/volume";
import { transfer } from "@/lib/labs/volume-ray-marching/march";
import styles from "./volume-ray-marching.module.css";

export function CloudLegend({ volume, palette }: { volume: Volume; palette: number }) {
  const colors = Array.from({ length: 17 }, (_, i) => {
    const rgb = transfer(i / 16, palette).map((value) => Math.round(255 * value ** (1 / 2.2)));
    return `rgb(${rgb.join(",")})`;
  });
  return (
    <section className={styles.cloudLegend} aria-label="Hiểu khối mây đang hiển thị">
      <h4>Bạn đang nhìn thấy gì?</h4>
      <p>
        Một khối mây tổng hợp có vùng loãng, vùng đậm và một khe gần như rỗng. Mỗi vị trí giữ một số
        từ 0 đến 1; đây là mật độ tương đối, không phải nhiệt độ. Dữ liệu đứng yên, thao tác kéo chỉ
        đổi góc nhìn.
      </p>
      <ul data-cloud-landmarks>
        {cloudLandmarks.map((item) => (
          <li key={item.label}>
            <strong>{item.label}</strong>
            <output data-density={item.label}>
              {sampleDensity(volume, item.point).toFixed(3)}
            </output>
          </li>
        ))}
      </ul>
      <div
        className={styles.densityGradient}
        style={{ backgroundImage: `linear-gradient(to right, ${colors.join(",")})` }}
        aria-hidden="true"
      />
      <div className={styles.gradientLabels}>
        <span>0 · rỗng</span>
        <span>1 · đậm</span>
      </div>
      <p>
        Thanh màu gán màu cho một mẫu. Trong Alpha, một pixel trộn đóng góp của nhiều mẫu; không đọc
        ngược mật độ từ màu pixel. Các con số ở trên đọc trực tiếp dữ liệu 3D gốc.
      </p>
    </section>
  );
}
