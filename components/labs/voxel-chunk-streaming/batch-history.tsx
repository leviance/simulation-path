import type { World } from "@/lib/labs/voxel-chunk-streaming";

export function BatchHistory({ world }: { world: World }) {
  return (
    <details>
      <summary>Lịch sử 8 batch gần nhất và job bị hủy khi đổi mục tiêu</summary>
      <p>
        Priority là khoảng cách bình phương tới chunk trung tâm tại lúc lập kế hoạch. Unload được xử
        lý trước load; unload xa trước, load gần trước.
      </p>
      <table>
        <thead>
          <tr>
            <th>Tick</th>
            <th>Loại job</th>
            <th>Key (X,Z)</th>
            <th>Priority</th>
          </tr>
        </thead>
        <tbody>
          {world.batches.flatMap((batch) =>
            batch.jobs.length
              ? batch.jobs.map((job, i) => (
                  <tr key={`${batch.tick}-${i}`}>
                    <td>{batch.tick}</td>
                    <td>{job.kind}</td>
                    <td>
                      ({job.key.x},{job.key.z})
                    </td>
                    <td>{job.priority}</td>
                  </tr>
                ))
              : [
                  <tr key={batch.tick}>
                    <td>{batch.tick}</td>
                    <td colSpan={3}>Không có job</td>
                  </tr>,
                ],
          )}
        </tbody>
      </table>
      <p>Retarget gần nhất hủy {world.cancelledJobs.length} job (không phải job đã thực thi):</p>
      <ul>
        {world.cancelledJobs.map((job) => (
          <li key={`${job.kind}-${job.key.x}-${job.key.z}`}>
            {job.kind} ({job.key.x},{job.key.z}), priority cũ {job.priority}
          </li>
        ))}
      </ul>
      <p>
        Đây là bản ghi chẩn đoán của Canvas, chỉ giữ Key và số liệu, không giữ buffer chunk. Đặt lại
        xóa lịch sử; đổi vị trí hoặc preset không xóa các batch đã chạy.
      </p>
    </details>
  );
}
