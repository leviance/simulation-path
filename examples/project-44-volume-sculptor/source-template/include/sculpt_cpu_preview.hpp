#pragma once

#include "sculpt_cpu_controls.hpp"
#include "sculpt_guides.hpp"
#include "sculpt_renderer.hpp"
#include "sculpt_window.hpp"
#include <charconv>
#include <iostream>

namespace sculpt {

#if LAB_CHECKPOINT == 2
inline constexpr int cpuLessonStep = 2;
#elif LAB_CHECKPOINT == 3
inline constexpr int cpuLessonStep = 3;
#elif LAB_CHECKPOINT == 4
inline constexpr int cpuLessonStep = 4;
#else
inline constexpr int cpuLessonStep = 5;
#endif

struct CpuPreviewOptions {
    int samples{24}, seconds{};
    bool hidden{}, verify{}, wireframe{}, normalView{}, flat{}, customBrush{};
    Brush brush;
    float depth{};
    std::filesystem::path capture;
};

inline float cpuPreviewNumber(std::string_view text, float minimum, float maximum) {
    float result{};
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || !std::isfinite(result) || result < minimum || result > maximum)
        throw std::invalid_argument("Invalid finite CPU-preview number");
    return result;
}

inline CpuPreviewOptions cpuPreviewOptions(int argc, char** argv) {
    CpuPreviewOptions options;
    for (int index = 1; index < argc; ++index) {
        const std::string_view option = argv[index];
        const auto next = [&]() -> std::string_view {
            if (index + 1 >= argc)
                throw std::invalid_argument("Missing CPU-preview option value");
            return argv[++index];
        };
        if (option == "--hidden")
            options.hidden = true;
        else if (option == "--verify")
            options.verify = true;
        else if (option == "--wire")
            options.wireframe = true;
        else if (option == "--normal-view")
            options.normalView = true;
        else if (option == "--flat")
            options.flat = true;
        else if (option == "--capture")
            options.capture = pathFromUtf8(next());
        else if (option == "--seconds" || option == "--grid") {
            const auto text = next();
            int value{};
            const auto parsed = std::from_chars(text.data(), text.data() + text.size(), value);
            if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size())
                throw std::invalid_argument("CPU-preview integer is not exact");
            if (option == "--grid") {
                if (value != 12 && value != 24 && value != 32)
                    throw std::invalid_argument("CPU teaching presets are 12/24/32 samples; 128 belongs to the later GPU stage");
                options.samples = value;
            } else {
                if (value < 1 || value > 120)
                    throw std::invalid_argument("CPU-preview duration must be 1..120 seconds");
                options.seconds = value;
            }
        } else if (option == "--radius") {
            options.brush.radius = cpuPreviewNumber(next(), 0.03F, 0.6F);
            options.customBrush = true;
        } else if (option == "--strength") {
            options.brush.strength = cpuPreviewNumber(next(), 0.01F, 0.8F);
            options.customBrush = true;
        } else if (option == "--depth") {
            options.depth = cpuPreviewNumber(next(), -1, 1);
            options.customBrush = true;
        } else if (option == "--subtract") {
            options.brush.mode = BrushMode::subtract;
            options.customBrush = true;
        } else
            throw std::invalid_argument("Unknown CPU-preview option");
    }
#if LAB_CHECKPOINT <= 2
    if (options.normalView)
        throw std::invalid_argument("Normal view starts at checkpoint 03");
#endif
#if LAB_CHECKPOINT <= 3
    if (options.customBrush)
        throw std::invalid_argument("Brush parameters start at checkpoint 04");
#endif
    if (options.hidden && !options.verify && options.seconds == 0 && options.capture.empty())
        throw std::invalid_argument("A hidden CPU preview needs a finite end condition");
    return options;
}

// Supplied CPU-to-OpenGL presentation, not a compute extraction implementation.
inline std::vector<MeshChunk> uploadCpuPreview(GlApi& gl, GpuBudget& budget, const CpuMesh& mesh) {
    std::vector<MeshChunk> result;
    if (mesh.vertices.empty())
        return result;
    const auto payload = checkedProduct(mesh.vertices.size(), sizeof(SurfaceVertex));
    MeshChunk chunk;
    chunk.buffer = std::make_shared<GpuBuffer>(gl, budget, payload + guardBytes);
    chunk.buffer->setGuard(payload);
    chunk.buffer->write(0, std::as_bytes(std::span(mesh.vertices)));
    if (!chunk.buffer->guardIntact(payload) || gl.GetError() != GL_NO_ERROR)
        throw std::runtime_error("CPU-preview upload failed its bounds/GL check");
    chunk.stats.vertices = static_cast<std::uint32_t>(mesh.vertices.size());
    chunk.stats.activeCells = static_cast<std::uint32_t>(mesh.activeCells);
    result.push_back(std::move(chunk));
    return result;
}

inline void cpuPreviewOverlay(Overlay& overlay, const CpuDocument& document, const CpuMesh& mesh, const CpuLessonControls& controls, std::uint64_t meshField, std::uint64_t revision, float isovalue, CpuNormalMode mode, bool current, std::string_view error, int width, int height, bool compact) {
    int panelWidth = 350;
    if (compact)
        panelWidth = 48;
    const float left = static_cast<float>(width - panelWidth);
    overlay.rect({left, 0, static_cast<float>(panelWidth), static_cast<float>(height)}, {0.028F, 0.045F, 0.065F});
    if (compact) {
        overlay.text(left + 6, 20, "F10", {0.6F, 0.95F, 0.85F}, 2, 38);
        overlay.text(left + 5, 45, "MENU", {0.6F, 0.8F, 0.85F}, 1.4F, 38);
        return;
    }
    float y = 20;
    const auto row = [&](const std::string& text, Vec3 tint = {0.7F, 0.84F, 0.88F}) {
        overlay.text(left + 16, y, text, tint, 1.8F, 320);
        y += 22;
    };
    row("PROJECT 44 / CHECKPOINT " + std::to_string(cpuLessonStep), {0.5F, 0.95F, 0.83F});
    row("CPU MESH / GPU DRAW ONLY");
    std::string state = "CURRENT FIELD AND MESH";
    if (!current)
        state = "LAST-GOOD / WAIT FOR MESH";
    if (document.strokeActive())
        state = "STROKE / RELEASE TO REMESH";
    if (controls.paused())
        state = "PAUSED / CAMERA STILL LIVE";
    row(state, {0.65F, 0.95F, 0.85F});
    row("FIELD " + std::to_string(document.generation()) + " / MESH FIELD " + std::to_string(meshField));
    row("MESH REVISION " + std::to_string(revision));
    row("N " + std::to_string(document.field().spec().samples) + " / H " + std::to_string(document.field().spec().spacing()).substr(0, 6));
    row("SAMPLES " + std::to_string(document.field().spec().sampleCount()));
    row("CELLS " + std::to_string(document.field().spec().cellCount()));
    row("ACTIVE CELLS " + std::to_string(mesh.activeCells));
    row("VERTICES " + std::to_string(mesh.vertices.size()));
    row("TRIANGLES " + std::to_string(mesh.vertices.size() / 3));
    std::string normals = "FACE";
    if (mode == CpuNormalMode::gradient)
        normals = "GRADIENT";
    row("NORMALS " + normals);
#if LAB_CHECKPOINT >= 3
    row("F8 FACE/GRADIENT / F12 RGB");
    row("NORMAL FALLBACKS " + std::to_string(mesh.normalFallbacks));
#endif
#if LAB_CHECKPOINT >= 4
    std::string pointer = "CAMERA";
    if (controls.sculptMode())
        pointer = "SCULPT";
    row("TAB LMB MODE: " + pointer);
    std::string brush = "ADD";
    if (controls.brush().mode == BrushMode::subtract)
        brush = "SUBTRACT";
    row("A/D " + brush);
    row("F2 RADIUS " + std::to_string(controls.brush().radius).substr(0, 5));
    row("F3 STRENGTH " + std::to_string(controls.brush().strength).substr(0, 5));
    row("F4 DEPTH " + std::to_string(controls.depth()).substr(0, 5));
    row("SHIFT LESS / CTRL LARGE");
#endif
#if LAB_CHECKPOINT >= 5
    row("Z UNDO " + std::to_string(document.undoCount()) + " / Y REDO " + std::to_string(document.redoCount()));
#endif
    row("R RESET / 1 2 3 PRESETS");
    row("F5/F6/F7 N=12/24/32");
    row("LEFT/RIGHT ISOVALUE " + std::to_string(isovalue).substr(0, 6));
    row("F11 WIRE / F10 FOCUS VIEW");
    row("SPACE PAUSE / ESC ABORT / Q");
    if (!error.empty() || !controls.notice().empty()) {
        std::string notice(error);
        if (notice.empty())
            notice = controls.notice();
        const float toastWidth = static_cast<float>(std::max(180, width - panelWidth - 32));
        overlay.rect({16, 16, toastWidth, 30}, {0.1F, 0.12F, 0.14F});
        overlay.text(24, 24, notice, {1, 0.75F, 0.45F}, 1.4F, toastWidth - 16);
    }
}

inline int runCpuPreview(int argc, char** argv) {
    const auto options = cpuPreviewOptions(argc, argv);
    NativeWindow window(options.hidden);
    SDL_SetWindowTitle(window.get(), "Project 44 - CPU Sculpting Steps");
    GlApi gl;
    gl.loadAll();
    GpuBudget budget;
    MeshRenderer renderer(gl);
    GuideRenderer guides(gl);
    OverlayRenderer ui(gl);
    CpuDocument document(GridSpec{options.samples});
    CpuLessonControls controls(options.brush, options.depth);
    Camera camera;
    Shape shape = Shape::sphere;
    CpuNormalMode mode = defaultCpuNormalMode;
    if (options.flat)
        mode = CpuNormalMode::face;
    CpuNormalMode publishedMode = mode;
    float isovalue = 0, publishedIso = 0;
    CpuMesh cpuMesh;
    std::vector<MeshChunk> published;
    std::uint64_t meshField = 0, meshRevision = 0;
    bool running = true, wireframe = options.wireframe, normalView = options.normalView, compact = false, retry = true, rendered = false, captured = false;
    std::string error;
    const auto begin = std::chrono::steady_clock::now();
    auto nextFrame = begin;
    while (running) {
        const auto now = std::chrono::steady_clock::now();
        if (options.seconds > 0 && now - begin >= std::chrono::seconds(options.seconds))
            break;
        SDL_Event event;
        int eventBudget = 0;
        while (eventBudget++ < 32 && SDL_PollEvent(&event)) {
            int width{}, height{};
            SDL_GetWindowSize(window.get(), &width, &height);
            int panelWidth = 350;
            if (compact)
                panelWidth = 48;
            const auto beforeInput = document.generation();
            if (!options.hidden)
                controls.event(event, document, camera, isovalue, width - panelWidth, height);
            if (document.generation() != beforeInput)
                retry = true;
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                const auto key = event.key.key;
                if (key == SDLK_Q)
                    running = false;
                if (key == SDLK_F10 && !controls.captured()) {
                    compact = !compact;
                    controls.cameraChanged();
                }
                if (key == SDLK_F11)
                    wireframe = !wireframe;
#if LAB_CHECKPOINT >= 3
                if (key == SDLK_F12)
                    normalView = !normalView;
                if (key == SDLK_F8) {
                    if (mode == CpuNormalMode::gradient)
                        mode = CpuNormalMode::face;
                    else
                        mode = CpuNormalMode::gradient;
                    retry = true;
                }
#endif
                if (key == SDLK_LEFT || key == SDLK_RIGHT) {
                    controls.cancel(document);
                    float change = 0.025F;
                    if (key == SDLK_LEFT)
                        change = -change;
                    isovalue = std::clamp(isovalue + change, -0.25F, 0.25F);
                    retry = true;
                }
                if (key == SDLK_RETURN)
                    retry = true;
                if (key == SDLK_R || key == SDLK_1 || key == SDLK_2 || key == SDLK_3 || key == SDLK_F5 || key == SDLK_F6 || key == SDLK_F7) {
                    controls.reset(document);
                    int samples = document.field().spec().samples;
                    if (key == SDLK_1)
                        shape = Shape::sphere;
                    if (key == SDLK_2)
                        shape = Shape::separatedSpheres;
                    if (key == SDLK_3)
                        shape = Shape::torus;
                    if (key == SDLK_F5)
                        samples = 12;
                    if (key == SDLK_F6)
                        samples = 24;
                    if (key == SDLK_F7)
                        samples = 32;
                    document.reset(GridSpec{samples}, shape);
                    camera = {};
                    if (shape == Shape::separatedSpheres)
                        camera.yaw = 1.57079632679F;
                    isovalue = 0;
                    retry = true;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT && compact && event.button.x >= width - panelWidth && event.button.y < 80 && !controls.captured()) {
                compact = false;
                controls.cameraChanged();
            }
        }
        if (!running)
            break;
        const bool changed = meshField != document.generation() || publishedIso != isovalue || publishedMode != mode;
        if (changed && !document.strokeActive() && !controls.paused() && (error.empty() || retry)) {
            try {
                // snippet:sculpt-cpu-remesh-call
                CpuMesh candidate = extractCpu(document.field(), isovalue, 300000, mode);
                auto buffers = uploadCpuPreview(gl, budget, candidate);
                cpuMesh = std::move(candidate);
                published = std::move(buffers);
                meshField = document.generation();
                publishedIso = isovalue;
                publishedMode = mode;
                ++meshRevision;
                // end-snippet:sculpt-cpu-remesh-call
                document.clearDirty();
                error.clear();
            } catch (const std::exception& failure) {
                error = failure.what();
            }
            retry = false;
        }
        int width{}, height{}, logicalWidth{}, logicalHeight{};
        SDL_GetWindowSizeInPixels(window.get(), &width, &height);
        SDL_GetWindowSize(window.get(), &logicalWidth, &logicalHeight);
        int panelWidth = 350;
        if (compact)
            panelWidth = 48;
        controls.tick(document, camera, isovalue, logicalWidth - panelWidth, logicalHeight);
        if (now >= nextFrame && width > 0 && height > 0 && logicalWidth > panelWidth && logicalHeight > 0) {
            const int sceneWidth = static_cast<int>(static_cast<double>(width) * (logicalWidth - panelWidth) / logicalWidth);
            gl.Viewport(0, 0, width, height);
            gl.ClearColor(0.045F, 0.065F, 0.09F, 1);
            gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            renderer.draw(published, camera, 0, 0, sceneWidth, height, wireframe, normalView);
            guides.draw(camera, sceneWidth, height, controls.preview(camera), document.field().spec(), SliceState{});
            Overlay overlay;
            overlay.reset(logicalWidth, logicalHeight);
            const bool current = meshField == document.generation() && publishedIso == isovalue && publishedMode == mode;
            cpuPreviewOverlay(overlay, document, cpuMesh, controls, meshField, meshRevision, isovalue, publishedMode, current, error, logicalWidth, logicalHeight, compact);
            ui.draw(overlay, width, height);
            if (gl.GetError() != GL_NO_ERROR)
                throw std::runtime_error("CPU-preview rendering returned a GL error");
            rendered = true;
            if (!options.capture.empty()) {
                captureFrame(gl, width, height, options.capture);
                captured = true;
            }
            SDL_GL_SwapWindow(window.get());
            nextFrame = now + std::chrono::milliseconds(16);
            if (options.verify || captured)
                break;
        }
        SDL_Delay(1);
    }
    controls.cancel(document);
    if ((!options.capture.empty() && !captured) || (options.verify && (!rendered || meshField != document.generation() || !error.empty() || cpuMesh.vertices.empty())))
        throw std::runtime_error("CPU preview stopped before its requested initial presentation check");
    std::cout << "P44 CPU CHECKPOINT FINISHED step=" << cpuLessonStep << " samples=" << document.field().spec().sampleCount() << " cells=" << document.field().spec().cellCount() << " vertices=" << cpuMesh.vertices.size() << " triangles=" << cpuMesh.vertices.size() / 3 << " field=" << document.generation() << " meshField=" << meshField << " meshRevision=" << meshRevision << " cpuExtraction=1 gpuPresentationOnly=1\n";
    return 0;
}

} // namespace sculpt
