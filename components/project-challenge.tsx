import type { ProjectMeta } from "@/lib/course";

export function ProjectChallenge({ project }: { project: ProjectMeta }) {
  const challenge = project.challenge;
  if (!challenge) return null;

  return (
    <section className="project-challenge" aria-labelledby={`challenge-${project.id}`}>
      <header>
        <div>
          <span className="section-index">THỬ SỨC TRƯỚC KHI XEM LỜI GIẢI</span>
          <h2 id={`challenge-${project.id}`}>Nếu tự làm từ đầu, bạn sẽ bắt đầu thế nào?</h2>
          <p>
            Hãy dành khoảng <b>{challenge.timebox}</b> để tự làm. Không cần hoàn thành toàn bộ; chỉ
            cần ghi lại phần bạn đã giải quyết được, quyết định đã đưa ra và chỗ đang mắc trước khi
            đọc bài hướng dẫn.
          </p>
        </div>
        <strong>CHƯA CẦN MỞ MÃ NGUỒN MẪU</strong>
      </header>

      <div className="challenge-brief">
        <article>
          <span>01 / ĐỀ BÀI</span>
          <p>{challenge.mission}</p>
        </article>
        <article>
          <span>02 / SẢN PHẨM MONG ĐỢI</span>
          <p>{challenge.outcome}</p>
        </article>
      </div>

      <div className="challenge-requirements">
        <section>
          <h3>Chương trình cần làm được gì?</h3>
          <ol>
            {challenge.requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ol>
        </section>
        <aside>
          <div>
            <h3>Giới hạn kỹ thuật</h3>
            <ul>
              {challenge.constraints.map((constraint) => (
                <li key={constraint}>{constraint}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Tự chấm bài</h3>
            <ul className="done-list">
              {challenge.definitionOfDone.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <footer>
        <div>
          <b>Chưa biết bắt đầu từ đâu?</b>
          <p>
            Chọn yêu cầu đầu tiên và thu nhỏ nó thành việc có thể chạy thử, chẳng hạn mở được
            window, vẽ được một hình hoặc đọc được một input. Khi hết thời gian, giữ nguyên bài làm
            để đối chiếu từng quyết định; đừng thay toàn bộ bằng code mẫu.
          </p>
        </div>
        <a className="button button-secondary" href="#lessons">
          Xem hướng dẫn từng bước ↓
        </a>
      </footer>
    </section>
  );
}
