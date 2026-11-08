#pragma once

#include "cloth_overlay.hpp"

#include <cstdio>
#include <string>
#include <vector>

namespace cloth {

enum class Tool { Camera,
                Drag,
                Pin };
enum class Command {
    Pause,
    Step,
    Reset,
    Hanging,
    Drape,
    Drop,
    Small,
    Medium,
    Large,
    Million,
    CameraTool,
    DragTool,
    PinTool,
    Wire,
    Strain,
    Cells,
    GravityDown,
    GravityUp,
    WindDown,
    WindUp,
    ComplianceDown,
    ComplianceUp,
    DampingDown,
    DampingUp,
    FrictionDown,
    FrictionUp,
    ThicknessDown,
    ThicknessUp,
    SphereLeft,
    SphereRight,
    SphereUp,
    SphereDown,
    SphereForward,
    SphereBack,
    CapsuleLeft,
    CapsuleRight,
    Validate,
    Benchmark,
    Cancel
};

struct UiState {
    Settings settings{};
    Settings requested{};
    Camera camera{};
    Tool tool{Tool::Drag};
    Vec3 desiredSphere{settings.sphereCenter};
    Vec3 desiredCapsuleA{settings.capsuleA}, desiredCapsuleB{settings.capsuleB};
    bool paused{}, singleStep{}, resetRequested{}, cancelRequested{};
    bool validateRequested{}, benchmarkRequested{}, wire{}, strain{}, cells{};
    std::uint32_t selected{noVertex};
    std::string message{"Right drag: camera. Left drag: cloth. Tab: tool. Space: Pause."};
};

inline void queueReset(UiState& ui, Settings request) {
    ui.requested = request;
    ui.resetRequested = true;
    ui.message = "Preparing a new topology; X cancels before commit";
}

inline void applyCommand(UiState& ui, Command command) {
    Settings request = ui.settings;
    switch (command) {
    case Command::Pause:
        ui.paused = !ui.paused;
        break;
    case Command::Step:
        ui.singleStep = true;
        ui.paused = true;
        break;
    case Command::Reset:
        queueReset(ui, request);
        break;
    case Command::Hanging:
        request = presetSettings(request, Preset::Hanging);
        queueReset(ui, request);
        break;
    case Command::Drape:
        request = presetSettings(request, Preset::SphereDrape);
        queueReset(ui, request);
        break;
    case Command::Drop:
        request = presetSettings(request, Preset::DropTable);
        queueReset(ui, request);
        break;
    case Command::Small:
        request.side = 17U;
        queueReset(ui, request);
        break;
    case Command::Medium:
        request.side = 65U;
        queueReset(ui, request);
        break;
    case Command::Large:
        request.side = 321U;
        queueReset(ui, request);
        break;
    case Command::Million:
        request.side = 1001U;
        queueReset(ui, request);
        break;
    case Command::CameraTool:
        ui.tool = Tool::Camera;
        break;
    case Command::DragTool:
        ui.tool = Tool::Drag;
        break;
    case Command::PinTool:
        ui.tool = Tool::Pin;
        break;
    case Command::Wire:
        ui.wire = !ui.wire;
        break;
    case Command::Strain:
        ui.strain = !ui.strain;
        break;
    case Command::Cells:
        ui.cells = !ui.cells;
        break;
    case Command::GravityDown:
        ui.settings.gravity = std::max(0.0F, ui.settings.gravity - 0.5F);
        break;
    case Command::GravityUp:
        ui.settings.gravity = std::min(20.0F, ui.settings.gravity + 0.5F);
        break;
    case Command::WindDown:
        ui.settings.wind = std::max(-10.0F, ui.settings.wind - 0.5F);
        break;
    case Command::WindUp:
        ui.settings.wind = std::min(10.0F, ui.settings.wind + 0.5F);
        break;
    case Command::ComplianceDown:
        ui.settings.compliance = std::max(1.0e-10F, ui.settings.compliance * 0.5F);
        break;
    case Command::ComplianceUp:
        ui.settings.compliance = std::min(0.01F, std::max(1.0e-10F, ui.settings.compliance * 2.0F));
        break;
    case Command::DampingDown:
        ui.settings.damping = std::max(0.0F, ui.settings.damping - 0.25F);
        break;
    case Command::DampingUp:
        ui.settings.damping = std::min(20.0F, ui.settings.damping + 0.25F);
        break;
    case Command::FrictionDown:
        ui.settings.friction = std::max(0.0F, ui.settings.friction - 0.05F);
        break;
    case Command::FrictionUp:
        ui.settings.friction = std::min(1.0F, ui.settings.friction + 0.05F);
        break;
    case Command::ThicknessDown:
        request.thickness = std::max(0.002F, request.thickness - 0.0025F);
        queueReset(ui, request);
        break;
    case Command::ThicknessUp:
        request.thickness = std::min(0.04F, request.thickness + 0.0025F);
        queueReset(ui, request);
        break;
    case Command::SphereLeft:
        ui.desiredSphere.x = std::max(-2.0F, ui.desiredSphere.x - 0.1F);
        break;
    case Command::SphereRight:
        ui.desiredSphere.x = std::min(2.0F, ui.desiredSphere.x + 0.1F);
        break;
    case Command::SphereUp:
        ui.desiredSphere.y = std::min(3.0F, ui.desiredSphere.y + 0.1F);
        break;
    case Command::SphereDown:
        ui.desiredSphere.y = std::max(0.5F, ui.desiredSphere.y - 0.1F);
        break;
    case Command::SphereForward:
        ui.desiredSphere.z = std::max(-2.0F, ui.desiredSphere.z - 0.1F);
        break;
    case Command::SphereBack:
        ui.desiredSphere.z = std::min(2.0F, ui.desiredSphere.z + 0.1F);
        break;
    case Command::CapsuleLeft:
        ui.desiredCapsuleA.x = std::max(-3.0F, ui.desiredCapsuleA.x - 0.1F);
        ui.desiredCapsuleB.x = std::max(-3.0F, ui.desiredCapsuleB.x - 0.1F);
        break;
    case Command::CapsuleRight:
        ui.desiredCapsuleA.x = std::min(3.0F, ui.desiredCapsuleA.x + 0.1F);
        ui.desiredCapsuleB.x = std::min(3.0F, ui.desiredCapsuleB.x + 0.1F);
        break;
    case Command::Validate:
        ui.validateRequested = true;
        break;
    case Command::Benchmark:
        ui.benchmarkRequested = true;
        break;
    case Command::Cancel:
        ui.cancelRequested = true;
        ui.resetRequested = false;
        break;
    }
}

struct PanelButton {
    Command command{};
    float x{}, y{}, width{}, height{};
    std::string label{};
};

class ControlPanel {
    std::vector<PanelButton> buttons_{};

    public:
    int width(int windowWidth) const {
        return std::clamp(windowWidth / 4, 300, 390);
    }

    bool hit(float x, float y, UiState& ui, bool benchmarkLocked = false) const {
        for (const auto& button : buttons_) {
            if (x >= button.x && x <= button.x + button.width && y >= button.y && y <= button.y + button.height) {
                if (benchmarkLocked && button.command != Command::Cancel) {
                    ui.message = "Benchmark uses a frozen configuration. Cancel before editing.";
                    return true;
                }
                applyCommand(ui, button.command);
                return true;
            }
        }
        return false;
    }

    void draw(GlApi& gl, SceneRenderer& renderer, UiState& ui, const Stats& stats,
        std::uint64_t bytes, int width, int height, double drawMs, double frameMs,
        bool jobActive, const std::string& message, const InteractionPreview* interaction = nullptr) {
        Overlay overlay{};
        overlay.width = width;
        overlay.height = height;
        buttons_.clear();
        const float panelWidth = static_cast<float>(this->width(width));
        const float x = width - panelWidth;
        const float scale = std::clamp(static_cast<float>(height) / 700.0F, 1.0F, 2.0F);
        overlay.rectangle(x, 0, panelWidth, static_cast<float>(height), {0.035F, 0.065F, 0.09F});
        float y = 16.0F;
        const auto text = [&](std::string value, Vec3 color = {0.74F, 0.84F, 0.9F}) {
            overlay.text(x + 14, y, value, color, scale);
            y += 12.0F * scale;
        };
        const auto row = [&](std::initializer_list<std::pair<Command, const char*>> items) {
            const float gap = 6.0F;
            const float buttonWidth = (panelWidth - 28.0F - gap * (items.size() - 1U)) / items.size();
            float bx = x + 14.0F;
            for (const auto& [command, label] : items) {
                buttons_.push_back({command, bx, y, buttonWidth, 20.0F * scale, label});
                overlay.rectangle(bx, y, buttonWidth, 20.0F * scale, {0.12F, 0.22F, 0.28F});
                overlay.text(bx + 5, y + 6 * scale, label, {0.85F, 0.93F, 0.96F}, scale);
                bx += buttonWidth + gap;
            }
            y += 25.0F * scale;
        };
        text("40 / CLOTH WORKSHOP", {0.45F, 0.9F, 0.86F});
        row({{Command::Pause, "PAUSE"}, {Command::Step, "STEP"}, {Command::Reset, "RESET"}});
        row({{Command::Hanging, "HANG"}, {Command::Drape, "SPHERE"}, {Command::Drop, "DROP"}});
        row({{Command::Small, "17"}, {Command::Medium, "65"}, {Command::Large, "321"}, {Command::Million, "1001"}});
        row({{Command::CameraTool, "CAMERA"}, {Command::DragTool, "DRAG"}, {Command::PinTool, "PIN"}});
        char line[220]{};
        std::snprintf(line, sizeof(line), "DYNAMIC %u PIN %u", stats.dynamic, stats.pinned);
        text(line);
        std::snprintf(line, sizeof(line), "UPDATED %u NORMALS %u", stats.updated, stats.normals);
        text(line);
        std::snprintf(line, sizeof(line), "DRAWN %u TRI %u", ui.settings.side * ui.settings.side, 2U * (ui.settings.side - 1U) * (ui.settings.side - 1U));
        text(line);
        std::snprintf(line, sizeof(line), "VISITS %u SUB %u ITER %u", stats.constraints, ui.settings.substeps, ui.settings.iterations);
        text(line);
        const auto side = ui.settings.side;
        std::snprintf(line, sizeof(line), "EDGES %u  H %.5f S", 6U * side * side - 10U * side + 2U, ui.settings.dt / ui.settings.substeps);
        text(line);
        std::snprintf(line, sizeof(line), "CAND %llu CONTACT %u", static_cast<unsigned long long>(stats.candidates), stats.contacts);
        text(line);
        std::snprintf(line, sizeof(line), "MAX STRETCH %.3f RES %.5f", stats.maxStretch, stats.maxResidual);
        text(line);
        std::snprintf(line, sizeof(line), "PEN %.5f M  VRAM %.1f MIB", stats.maxPenetration, bytes / 1048576.0);
        text(line);
        if (drawMs < 0.0) {
            std::snprintf(line, sizeof(line), "GPU %.2f DRAW PENDING MS", stats.totalMs);
        } else {
            std::snprintf(line, sizeof(line), "GPU %.2f DRAW %.2f MS", stats.totalMs, drawMs);
        }
        text(line);
        std::snprintf(line, sizeof(line), "SOLVE %.2f GRID %.2f", stats.solverMs, stats.gridMs);
        text(line);
        std::snprintf(line, sizeof(line), "CONTACT %.2f NORMAL %.2f", stats.contactMs, stats.normalsMs);
        text(line);
        std::snprintf(line, sizeof(line), "PRED %.2f VEL %.2f DIAG %.2f", stats.predictionMs, stats.velocityMs, stats.diagnosticsMs);
        text(line);
        std::snprintf(line, sizeof(line), "CPU FRAME %.2f MS STEP %llu", frameMs, static_cast<unsigned long long>(stats.steps));
        text(line);
        row({{Command::Wire, "WIRE"}, {Command::Strain, "STRAIN"}, {Command::Cells, "CELLS"}});
        std::snprintf(line, sizeof(line), "G %.1f WIND %.1f M/S2", ui.settings.gravity, ui.settings.wind);
        text(line);
        row({{Command::GravityDown, "G -"}, {Command::GravityUp, "G +"}, {Command::WindDown, "WIND -"}, {Command::WindUp, "WIND +"}});
        std::snprintf(line, sizeof(line), "COMPLIANCE %.1E M/N", ui.settings.compliance);
        text(line);
        row({{Command::ComplianceDown, "ALPHA /2"}, {Command::ComplianceUp, "ALPHA X2"}});
        std::snprintf(line, sizeof(line), "DAMP %.2f FRICTION %.2f", ui.settings.damping, ui.settings.friction);
        text(line);
        row({{Command::DampingDown, "D -"}, {Command::DampingUp, "D +"}, {Command::FrictionDown, "F -"}, {Command::FrictionUp, "F +"}});
        std::snprintf(line, sizeof(line), "THICKNESS %.4f M + RESET", ui.settings.thickness);
        text(line);
        row({{Command::ThicknessDown, "THIN -"}, {Command::ThicknessUp, "THICK +"}});
        row({{Command::SphereLeft, "BALL X-"}, {Command::SphereRight, "X+"}, {Command::SphereUp, "Y+"}, {Command::SphereDown, "Y-"}});
        row({{Command::SphereForward, "BALL Z-"}, {Command::SphereBack, "Z+"}, {Command::CapsuleLeft, "CAP X-"}, {Command::CapsuleRight, "X+"}});
        row({{Command::Validate, "VALIDATE"}, {Command::Benchmark, "BENCH"}, {Command::Cancel, "CANCEL"}});
        // Keep a readable status in the viewport; the complete diagnostic also appears in the title/log.
        std::string status = message;
        if (jobActive) {
            status = "JOB ACTIVE / X CANCEL / original cloth paused. " + status;
        }
        const std::size_t columns = std::max<std::size_t>(24U, static_cast<std::size_t>((x - 28.0F) / (6.0F * scale)));
        for (std::size_t statusRow = 0U; statusRow < 3U && statusRow * columns < status.size(); ++statusRow) {
            overlay.text(14, 14 + statusRow * 13 * scale, status.substr(statusRow * columns, columns), {0.7F, 0.93F, 0.85F}, scale);
        }
        std::vector<std::string> inspector{};
        const char* tool = "CAMERA";
        if (ui.tool == Tool::Drag) {
            tool = "DRAG";
        }
        if (ui.tool == Tool::Pin) {
            tool = "PIN";
        }
        std::string playback = "RUNNING";
        if (ui.paused) {
            playback = "PAUSED";
        }
        inspector.push_back("TOOL " + std::string(tool) + " - " + playback);
        if (interaction != nullptr && interaction->valid()) {
            std::snprintf(line, sizeof(line), "SELECTED ID %u - LAST GPU PROBE", interaction->selected);
            inspector.push_back(line);
            std::snprintf(line, sizeof(line), "XYZ %.4F %.4F %.4F M", interaction->lastProbe.x,
                interaction->lastProbe.y, interaction->lastProbe.z);
            inspector.push_back(line);
            std::snprintf(line, sizeof(line), "INVERSE MASS %.3F 1/KG", interaction->lastProbe.w);
            if (interaction->lastProbe.w == 0.0F) {
                inspector.push_back(std::string(line) + " - PINNED SAMPLE");
            } else {
                inspector.push_back(std::string(line) + " - DYNAMIC SAMPLE");
            }
            std::snprintf(line, sizeof(line), "PROBE AGE %llu COMPLETED STEPS",
                static_cast<unsigned long long>(interaction->ageSteps()));
            if (interaction->stale()) {
                inspector.push_back(std::string(line) + " - STALE/PENDING");
            } else {
                inspector.push_back(std::string(line) + " - MATCHED");
            }
            if (interaction->pinId != noVertex) {
                const char* action = "UNPIN";
                if (interaction->pinAction != 0) {
                    action = "PIN";
                }
                std::snprintf(line, sizeof(line), "%s ID %u STAGED - NEXT STEP", action, interaction->pinId);
                inspector.push_back(line);
            } else {
                inspector.push_back("PIN EDIT NONE");
            }
            if (interaction->dragging) {
                std::snprintf(line, sizeof(line), "DRAG ID %u - TARGET / LAST PROBE", interaction->dragId);
                inspector.push_back(line);
                std::snprintf(line, sizeof(line), "TARGET XYZ %.3F %.3F %.3F M", interaction->dragTarget.x,
                    interaction->dragTarget.y, interaction->dragTarget.z);
                inspector.push_back(line);
                inspector.push_back("PINK VECTOR IS TARGET ERROR - NOT NEWTON FORCE");
            } else {
                inspector.push_back("DRAG INACTIVE");
            }
            if (interaction->contactRings) {
                std::snprintf(line, sizeof(line), "AMBER RINGS R=2T=%.4F M - LAST CSR PROBE", 2.0F * ui.settings.thickness);
                inspector.push_back(line);
                inspector.push_back("WORLD SCALE - ZOOM TO SEE SMALL THICKNESS");
            }
        } else {
            if (interaction != nullptr && interaction->selected != noVertex) {
                std::snprintf(line, sizeof(line), "SELECTED ID %u - PROBE PENDING", interaction->selected);
                inspector.push_back(line);
                inspector.push_back("XYZ / INVERSE MASS UNAVAILABLE");
            } else {
                inspector.push_back("NO MATCHING SELECTED-ID GPU PROBE");
            }
        }
        const float inspectorHeight = (inspector.size() * 11.0F + 8.0F) * scale;
        const float inspectorY = height - 43.0F * scale - inspectorHeight;
        const float inspectorWidth = std::min(x - 28.0F, 225.0F * scale);
        overlay.rectangle(9, inspectorY - 5.0F * scale, inspectorWidth, inspectorHeight,
            {0.035F, 0.065F, 0.09F});
        float inspectorLine = inspectorY;
        for (const auto& value : inspector) {
            overlay.text(14, inspectorLine, value, {0.92F, 0.86F, 0.69F}, scale);
            inspectorLine += 11.0F * scale;
        }
        overlay.text(14, height - 32 * scale, "RIGHT DRAG OR ARROWS: ORBIT - MIDDLE DRAG: PAN - Q/E OR WHEEL: ZOOM - TAB: TOOL", {0.8F, 0.88F, 0.93F}, scale);
        overlay.text(14, height - 19 * scale, "SPACE PAUSE - N STEP - R RESET - 1/2/3 PRESET - 4/5/6/7 SIZE - P PIN - V CHECK - B BENCH - X CANCEL", {0.8F, 0.88F, 0.93F}, scale);
        overlay.draw(gl, renderer);
    }
};

} // namespace cloth
