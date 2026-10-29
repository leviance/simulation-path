#pragma once

#include "compute_worker.hpp"
#include "dashboard_surface.hpp"

#include <cstdio>

namespace lab {

// Chỉ đọc immutable report; dashboard không tính lại hoặc sửa output của worker.

constexpr SDL_Color ink{218, 226, 240, 255};
constexpr SDL_Color muted{142, 157, 182, 255};
constexpr SDL_Color cyan{98, 201, 232, 255};
constexpr SDL_Color green{137, 216, 163, 255};
constexpr SDL_Color amber{238, 188, 112, 255};
constexpr SDL_Color red{241, 125, 139, 255};

inline std::string fixed(double value, int precision = 4) {
    char result[64]{};
    std::snprintf(result, sizeof(result), "%.*f", precision, value);
    return result;
}

inline std::string vectorText(const Vec4& value) {
    return fixed(value.x) + "  " + fixed(value.y) + "  " + fixed(value.z) + "  " + fixed(value.w);
}

#if LAB_CHECKPOINT >= 8
inline std::string timingNumber(double milliseconds) {
    // Giữ số đo trong cột 290 px ở font 14 px, không thu nhỏ chữ xuống 7 px.
    int precision = 3;
    if (milliseconds >= 1000.0) {
        precision = 2;
    }
    if (milliseconds >= 10000.0) {
        precision = 1;
    }
    return fixed(milliseconds, precision);
}

inline std::string timingSpread(const SampleSpread& spread) {
    return timingNumber(spread.minimum) + "/" + timingNumber(spread.median) + "/" + timingNumber(spread.maximum);
}
#endif

inline void drawComputeDashboard(DashboardSurface& draw, const WorkloadConfig& selected, const WorkerReport& report, bool busy, std::size_t inspectorIndex) {
    draw.rectangle(0, 0, draw.width, draw.height, {13, 19, 31, 255});
    draw.rectangle(18, 18, 1124, 98, {23, 34, 52, 255});
    draw.text(34, 32, "VECTOR COMPUTE WORKBENCH", ink, 3);
#ifdef NDEBUG
    draw.text(34, 68, "P37 | C++ / SDL3 / OPENGL COMPUTE | RELEASE", cyan);
#else
    draw.text(34, 68, "P37 | DEBUG - USE RELEASE TO COMPARE SPEED", amber);
#endif
    draw.text(34, 92, report.device, muted, 1);
#if LAB_CHECKPOINT >= 5
    const DispatchPlan selectedPlan = makeDispatchPlan(selected.elementCount, computeLocalSize);
    draw.text(34, 106, "LOCAL 256 | GROUPS " + std::to_string(selectedPlan.workgroupCount) + " | TAIL " + std::to_string(selectedPlan.unusedInvocations), muted, 1);
#endif

    draw.text(28, 136, "SELECTED: " + std::string(operationName(selected.operation)) + "  N " + std::to_string(selected.elementCount) + "  SCALAR " + fixed(selected.scalar, 2), ink);
    draw.text(28, 160, "SPACE RUN | B BENCHMARK | ESC CANCEL/QUIT | 1/2/3 OP | [/] N | -/= SCALE | R RESET", muted, 1);
    SDL_Color statusColor = green;
    if (busy) {
        statusColor = amber;
    } else if (report.failed) {
        statusColor = red;
    } else if (report.cancelled) {
        statusColor = muted;
    }
    draw.text(28, 186, report.status.substr(0, 90), statusColor);
    draw.text(28, 210, "JOB " + std::to_string(report.generation) + "  PROGRESS " + std::to_string(report.samplesCompleted) + "/" + std::to_string(report.samplesExpected) + " | CONFIG LOCKED WHILE RUNNING", muted, 1);

    draw.rectangle(18, 238, 1124, 256, {21, 30, 46, 255});
    draw.text(32, 252, "CPU VS GPU | MILLISECONDS (MIN / MEDIAN / MAX)", ink);
#if LAB_CHECKPOINT >= 8
    draw.text(32, 282, "N", muted);
    draw.text(180, 282, "CPU LOOP", cyan);
    draw.text(470, 282, "GPU KERNEL", green);
    draw.text(760, 282, "END-TO-END", amber);
    int rowY = 314;
    for (const BenchmarkRow& row : report.rows) {
        draw.text(32, rowY, std::to_string(row.config.elementCount), ink);
        draw.text(180, rowY, timingSpread(row.cpu), cyan);
        draw.text(470, rowY, timingSpread(row.kernel), green);
        draw.text(760, rowY, timingSpread(row.endToEnd), amber);
        const double maximum = std::max({row.cpu.median, row.kernel.median, row.endToEnd.median, 0.000001});
        draw.rectangle(180, rowY + 20, std::max(1, int(240.0 * row.cpu.median / maximum)), 6, cyan);
        draw.rectangle(470, rowY + 20, std::max(1, int(240.0 * row.kernel.median / maximum)), 6, green);
        draw.rectangle(760, rowY + 20, std::max(1, int(240.0 * row.endToEnd.median / maximum)), 6, amber);
        draw.text(32, rowY + 24, std::to_string(row.warmupsCompleted) + " WARMUP / " + std::to_string(row.samples.size()) + " SAMPLES", muted, 1);
        rowY += 52;
    }
    draw.text(32, 478, "BARS: SAME SCALE WITHIN EACH ROW. COMPARE NUMBERS ACROSS N. NO GUARANTEED GPU SPEEDUP.", muted, 1);
#else
    draw.text(32, 296, "TIMING STARTS IN CHECKPOINT 08.", muted);
    draw.text(32, 326, "CPU PREVIEW IS NOT A GPU RESULT OR A BENCHMARK.", amber);
#endif

    draw.rectangle(18, 510, 1124, 206, {21, 30, 46, 255});
    draw.text(32, 524, "DATA INSPECTOR | X / Y / Z / W", ink);
    if (report.data) {
        const CalculationData& data = *report.data;
        draw.text(32, 552, "MEASURED: " + std::string(operationName(data.config.operation)) + "  N " + std::to_string(data.config.elementCount) + "  SEED " + std::to_string(data.config.seed), muted, 1);
        const std::size_t index = std::min(inspectorIndex, data.inputs.a.size() - 1U);
        draw.text(32, 574, "INDEX " + std::to_string(index), cyan);
        draw.text(230, 574, "A: " + vectorText(data.inputs.a[index]), ink);
        draw.text(230, 600, "B: " + vectorText(data.inputs.b[index]), ink);
        draw.text(230, 626, "CPU: " + vectorText(data.cpu[index]), cyan);
#if LAB_CHECKPOINT >= 6
        draw.text(230, 652, "GPU: " + vectorText(data.gpu[index]), green);
#else
        draw.text(230, 652, "GPU OUTPUT NOT READ BACK AT THIS CHECKPOINT", amber, 1);
#endif
#if LAB_CHECKPOINT >= 7
        const auto& validation = data.validation;
        std::string result = "FAIL";
        if (validation.allPassed() && data.tailIntact) {
            result = "PASS";
        }
        draw.text(32, 690, result + " | MISMATCH " + std::to_string(validation.mismatchCount) + " | MAX ERROR " + fixed(validation.maximumAbsoluteError, 8) + " | ABS/REL TOL 0.000002", green, 1);
#endif
    } else {
        draw.text(32, 570, "NO COMPLETED DATA. RUN A CALCULATION FIRST.", muted);
    }
    draw.text(28, 734, "LEFT/RIGHT: INSPECT INDEX | PAGE UP/DOWN: +/-1024 | HOME/END: FIRST/LAST", muted, 1);
    draw.text(28, 756, "CPU: PREALLOCATED LOOP. KERNEL: TIMER QUERY AROUND DISPATCH ONLY.", cyan, 1);
    draw.text(28, 774, "E2E: A/B UPLOAD + OUTPUT RESET + DISPATCH + FENCE WAIT + N+256 READBACK.", amber, 1);
    draw.text(28, 792, "EXCLUDES GENERATION, ALLOCATION, CPU REFERENCE, VALIDATION, QUERY POLL AND UI. POLL GRANULARITY AFFECTS E2E.", muted, 1);
}

} // namespace lab
