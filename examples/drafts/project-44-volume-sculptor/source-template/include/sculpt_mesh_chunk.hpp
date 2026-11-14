#pragma once

#include "sculpt_gpu_buffer.hpp"

namespace sculpt {

// Presentation consumes a vertex buffer; it does not need the field/count/scan implementation.
// snippet:sculpt-mesh-chunk-record
struct MeshChunk {
    std::shared_ptr<GpuBuffer> buffer;
    ChunkStats stats;
    // Reused chunks keep their real build generation and a separate dependency-valid generation.
    std::uint32_t validForGeneration{};
};

// end-snippet:sculpt-mesh-chunk-record

} // namespace sculpt
