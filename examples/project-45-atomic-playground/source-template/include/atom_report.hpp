#pragma once

#include "atom_config.hpp"
#include "atom_probe.hpp"
#include "atom_render.hpp"
#include <iomanip>
#include <locale>
#include <sstream>

namespace atom {

inline const char* samplingModeName(SamplingMode mode) {
    if (mode == SamplingMode::weighted)
        return "weighted";
    if (mode == SamplingMode::uniformRadius)
        return "sandbox_uniform_radius";
    if (mode == SamplingMode::uniformAngle)
        return "sandbox_uniform_angle";
    throw std::invalid_argument("Unknown sampling mode in workload report");
}

// The same exact description labels the report and detects workload changes.
// Log actual rendered cameras/clouds/uniforms, not only requested preset labels.
inline std::string renderWorkload(const PlaygroundConfig& config, const ViewStyle& display, const std::array<Camera, 2>& cameras, const std::array<const GpuCloud*, 2>& clouds, const std::array<std::uint64_t, 2>& generations, int width, int height, int pixelWidth, int pixelHeight, int sceneWidth) {
    std::ostringstream output;
    output.imbue(std::locale::classic());
    output << std::setprecision(std::numeric_limits<float>::max_digits10);
    output << "DRAW_WORKLOAD logical_window=" << width << 'x' << height
        << " drawable=" << pixelWidth << 'x' << pixelHeight << " logical_scene_width=" << sceneWidth
        << " comparison=" << config.comparison << " auto_fit=" << config.autoFit
        << " palette=" << display.palette << " opacity=" << display.opacity << " size=" << display.pointSize
        << " exposure=" << display.exposure << " boost=" << display.densityBoost
        << " clip_axis=" << display.clipAxis << " clip_offset=" << display.clipOffset
        << " probe_highlight=" << display.showProbe
        << " probe_center=" << display.probeCenter.x << ',' << display.probeCenter.y << ',' << display.probeCenter.z
        << " probe_radius=" << display.probeRadius;
    int paneCount = 1;
    if (config.comparison)
        paneCount = 2;
    for (int index = 0; index < paneCount; ++index) {
        const auto& camera = cameras[index];
        output << " | pane=" << index << " generation=" << generations[index]
            << " camera_target=" << camera.target.x << ',' << camera.target.y << ',' << camera.target.z
            << " yaw=" << camera.yaw << " pitch=" << camera.pitch << " distance=" << camera.distance
            << " tan_half_fov=" << camera.tanHalfFov;
        if (const auto* cloud = clouds[index]) {
            const auto& sampling = cloud->config();
            output << " orbital=" << preset(sampling.orbital).name << " mode=" << samplingModeName(cloud->mode())
                << " N=" << cloud->accepted() << " seed=" << sampling.seed << " rMax=" << sampling.radius
                << " table=" << sampling.radialBins << 'x' << sampling.muBins << 'x' << sampling.phiBins;
        } else {
            output << " cloud=preview_or_absent";
        }
    }
    return output.str();
}

// Pending values are deliberately not printed: GpuProbe::values can still hold
// the previous completed job while a new revision is being measured.
inline void writeProbeMetrics(std::ostream& output, const GpuProbe& probe, bool current) {
    if (current) {
        output << " probe_state=current probe_gpu_ms=" << probe.gpuMs()
            << " probe_examined=" << probe.values()[0] << " probe_invalid=" << probe.values()[21];
    } else if (probe.busy()) {
        output << " probe_state=pending";
    } else {
        output << " probe_state=not_current";
    }
}

} // namespace atom
