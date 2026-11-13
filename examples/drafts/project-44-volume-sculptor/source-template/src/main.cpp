#include "sculpt_gpu_verify.hpp"
#include "sculpt_renderer.hpp"
#include "sculpt_window.hpp"
#include <charconv>
#include <iomanip>
#include <sstream>

namespace {
using namespace sculpt;

struct Options {
    int samples{128};
    int seconds{};
    bool hidden{}, verify{}, plane{};
    std::filesystem::path capture;
};

int integer(std::string_view text, int minimum, int maximum) {
    int result{};
    const auto parsed = std::from_chars(text.data(), text.data() + text.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != text.data() + text.size() || result < minimum || result > maximum)
        throw std::invalid_argument("Invalid integer option");
    return result;
}

Options parse(int argc, char** argv) {
    Options result;
    for (int index = 1; index < argc; ++index) {
        const std::string_view option = argv[index];
        const auto next = [&]() -> std::string_view {
            if (index + 1 >= argc)
                throw std::invalid_argument("Missing option value");
            return argv[++index];
        };
        if (option == "--grid")
            result.samples = integer(next(), 32, 192);
        else if (option == "--seconds")
            result.seconds = integer(next(), 1, 120);
        else if (option == "--hidden")
            result.hidden = true;
        else if (option == "--verify")
            result.verify = true;
        else if (option == "--plane")
            result.plane = true;
        else if (option == "--capture")
            result.capture = pathFromUtf8(next());
        else
            throw std::invalid_argument("Unknown sculpt option");
    }
    if (result.hidden && !result.verify && result.capture.empty() && result.seconds == 0)
        throw std::invalid_argument("Hidden run needs a finite verify/capture/seconds condition");
    return result;
}

std::string number(double value, int precision = 2) {
    std::ostringstream text;
    text << std::fixed << std::setprecision(precision) << value;
    return text.str();
}

void drawPanel(Overlay& overlay, const GpuMeshBuilder& model, const GpuBudget& budget, int width, int height, float requestedIso) {
    const float left = static_cast<float>(width - 310);
    overlay.rect({left, 0, 310, static_cast<float>(height)}, {0.035F, 0.055F, 0.08F});
    float y = 18;
    const auto line = [&](std::string text, Vec3 color = Vec3{0.79F, 0.87F, 0.91F}) mutable {
        overlay.text(left + 14, y, text, color, 1.35F, 282);
        y += 23;
    };
    auto write = line;
    write("PROJECT 44 / SCALAR MESH", {0.3F, 0.9F, 0.8F});
    write("DRAFT / EDIT TOOLS PENDING");
    write("GPU SAMPLES " + std::to_string(model.settings().grid.sampleCount()));
    write("REAL CELLS " + std::to_string(model.settings().grid.cellCount()));
    write("ACTIVE " + std::to_string(model.activeGeneration()) + " REQUEST " + std::to_string(model.requestedGeneration()));
    write("REQUEST ISO " + number(requestedIso, 3));
    if (model.ready())
        write("COMPLETE GPU MESH", {0.3F, 0.9F, 0.8F});
    else if (model.state() == MeshJobState::cancelled)
        write("CANCELLED / KEEP ACTIVE");
    else if (model.state() == MeshJobState::initializing)
        write("GPU FIELD INITIALIZING");
    else
        write("MESH JOB CHUNK " + std::to_string(model.completedChunks()) + "/" + std::to_string(chunkCount(model.settings().grid)));
    std::uint64_t vertices = 0, active = 0;
    for (const auto& chunk : model.active()) {
        vertices += chunk.stats.vertices;
        active += chunk.stats.activeCells;
    }
    write("ACTIVE CELLS " + std::to_string(active));
    write("VERTICES " + std::to_string(vertices));
    write("TRIANGLES " + std::to_string(vertices / 3));
    write("ALLOCATED " + number(budget.used / 1048576.0) + " MIB");
    write("CAPACITY 4194304 VERTICES");
    y += 12;
    const auto& times = model.times();
    write("GPU FIELD " + number(times.field) + " MS");
    write("COUNT " + number(times.count) + " MS");
    write("SCAN " + number(times.scan) + " MS");
    write("EMIT " + number(times.emit) + " MS");
    write("NORMALS " + number(times.normals) + " MS");
    y += 12;
    write("L DRAG ORBIT / R DRAG PAN");
    write("WHEEL ZOOM / HOME CAMERA");
    write("W WIREFRAME / N NORMALS");
    write("LEFT RIGHT ISOVALUE");
    write("C CANCEL / ENTER RESTART");
    write("SPACE JOB PAUSE / Q QUIT");
    write("STORED FIELD / NOT RAY SDF");
}

int run(const Options& options) {
    ModelSettings settings;
    settings.grid.samples = options.samples;
    settings.validate();
    NativeWindow window(options.hidden);
    GlApi gl;
    gl.loadAll();
    preflightSculpt(gl, settings);
    SDL_GL_SetSwapInterval(0);
    GpuBudget budget;
    GpuMeshBuilder model(gl, budget, settings, options.plane);
    MeshRenderer renderer(gl);
    OverlayRenderer ui(gl);
    Camera camera;
    bool running = true, dragging = false, panning = false, wireframe = false, normals = false;
    float previousX = 0, previousY = 0, requestedIso = 0;
    bool verified = false, captured = false;
    const auto begin = std::chrono::steady_clock::now();
    auto nextFrame = begin;
    std::cout << "P44 DRAFT GPU mesh pipeline; sculpt/history/IO tools are not integrated yet\nGPU=" << reinterpret_cast<const char*>(gl.GetString(GL_RENDERER)) << " GL=" << reinterpret_cast<const char*>(gl.GetString(GL_VERSION)) << '\n';
    const auto releasePointer = [&]() {
        dragging = false;
        SDL_CaptureMouse(false);
    };
    const auto draw = [&]() {
        int width{}, height{}, logicalWidth{}, logicalHeight{};
        SDL_GetWindowSizeInPixels(window.get(), &width, &height);
        SDL_GetWindowSize(window.get(), &logicalWidth, &logicalHeight);
        if (width <= 0 || height <= 0 || logicalWidth <= 310 || logicalHeight <= 0)
            return;
        gl.Viewport(0, 0, width, height);
        gl.ClearColor(0.045F, 0.065F, 0.09F, 1);
        gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        const int sceneWidth = static_cast<int>(static_cast<double>(width) * (logicalWidth - 310) / logicalWidth);
        renderer.draw(model.active(), camera, 0, 0, sceneWidth, height, wireframe, normals);
        Overlay overlay;
        overlay.reset(logicalWidth, logicalHeight);
        drawPanel(overlay, model, budget, logicalWidth, logicalHeight, requestedIso);
        ui.draw(overlay, width, height);
    };
    while (running) {
        const auto now = std::chrono::steady_clock::now();
        const auto elapsed = std::chrono::duration<double>(now - begin).count();
        if ((options.seconds > 0 && elapsed >= options.seconds) || (options.hidden && elapsed > 90))
            break;
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
                releasePointer();
                if (!options.hidden)
                    model.pause(true);
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
                int width{}, height{};
                SDL_GetWindowSize(window.get(), &width, &height);
                if (event.button.x < width - 310) {
                    dragging = true;
                    panning = event.button.button != SDL_BUTTON_LEFT;
                    previousX = event.button.x;
                    previousY = event.button.y;
                    SDL_CaptureMouse(true);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP)
                releasePointer();
            if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
                if (event.motion.state == 0)
                    releasePointer();
                else {
                    const float dx = event.motion.x - previousX, dy = event.motion.y - previousY;
                    previousX = event.motion.x;
                    previousY = event.motion.y;
                    if (panning)
                        camera.pan(dx, dy);
                    else
                        camera.orbit(dx, dy);
                }
            }
            if (event.type == SDL_EVENT_MOUSE_WHEEL)
                camera.zoom(event.wheel.y);
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                const auto key = event.key.key;
                if (key == SDLK_ESCAPE || key == SDLK_Q)
                    running = false;
                if (key == SDLK_W)
                    wireframe = !wireframe;
                if (key == SDLK_N)
                    normals = !normals;
                if (key == SDLK_HOME)
                    camera = {};
                if (key == SDLK_SPACE)
                    model.pause(!model.paused());
                if (key == SDLK_C)
                    model.cancel();
                if (key == SDLK_LEFT || key == SDLK_RIGHT) {
                    float change = 0.025F;
                    if (key == SDLK_LEFT)
                        change = -change;
                    requestedIso = std::clamp(requestedIso + change, -0.25F, 0.25F);
                    model.requestIsovalue(requestedIso);
                }
                if (key == SDLK_RETURN)
                    model.requestIsovalue(requestedIso);
            }
        }
        if (!running)
            break;
        model.tick();
        if (now >= nextFrame) {
            draw();
            SDL_GL_SwapWindow(window.get());
            nextFrame = now + std::chrono::milliseconds(16);
        }
        if (model.ready() && (options.verify || !options.capture.empty())) {
            if (options.verify) {
                verifyGpuShape(model, options.plane);
                verified = true;
            }
            if (!options.capture.empty()) {
                draw();
                int width{}, height{};
                SDL_GetWindowSizeInPixels(window.get(), &width, &height);
                captureFrame(gl, width, height, options.capture);
                captured = true;
            }
            break;
        }
        SDL_Delay(1);
    }
    releasePointer();
    if ((options.verify && !verified) || (!options.capture.empty() && !captured))
        throw std::runtime_error("Finite run stopped before the requested verification/capture completed");
    return 0;
}

} // namespace

int main(int argc, char** argv) {
    try {
        return run(parse(argc, argv));
    } catch (const std::exception& error) {
        std::cerr << "Volume Sculptor: " << error.what() << '\n';
        return 1;
    }
}
