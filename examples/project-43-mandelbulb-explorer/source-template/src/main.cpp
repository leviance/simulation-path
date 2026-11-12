#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "bulb_app.hpp"
#include "bulb_export.hpp"
#include "bulb_reference.hpp"
#include "bulb_trace.hpp"
#include "bulb_verify.hpp"
#include <charconv>

namespace {
using namespace bulb;

struct Options {
    Settings settings;
    Camera camera;
    bool hidden{}, verify{}, fieldOnly{};
    int frames{}, seconds{};
    std::filesystem::path capture, output;
};

int integer(std::string_view value, int minimum, int maximum) {
    int result{};
    const auto parsed = std::from_chars(value.data(), value.data() + value.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != value.data() + value.size() || result < minimum || result > maximum)
        throw std::invalid_argument("Integer option is out of range");
    return result;
}

double real(std::string_view value, double minimum, double maximum) {
    double result{};
    const auto parsed = std::from_chars(value.data(), value.data() + value.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != value.data() + value.size() || !std::isfinite(result) || result < minimum || result > maximum)
        throw std::invalid_argument("Real-valued option is non-finite or out of range");
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
        if (option == "--hidden")
            result.hidden = true;
        else if (option == "--verify")
            result.verify = true;
        else if (option == "--verify-field")
            result.fieldOnly = true;
        else if (option == "--frames")
            result.frames = integer(next(), 1, 1000);
        else if (option == "--seconds")
            result.seconds = integer(next(), 1, 180);
        else if (option == "--power")
            result.settings.power = integer(next(), 2, 12);
        else if (option == "--iterations")
            result.settings.iterations = integer(next(), 4, 24);
        else if (option == "--steps")
            result.settings.raySteps = integer(next(), 32, 256);
        else if (option == "--samples")
            result.settings.samples = integer(next(), 1, 4);
        else if (option == "--palette")
            result.settings.palette = integer(next(), 0, 2);
        else if (option == "--bailout")
            result.settings.bailout = real(next(), 2, 16);
        else if (option == "--epsilon")
            result.settings.epsilon = real(next(), 0.00001, 0.01);
        else if (option == "--normal-step")
            result.settings.normalStep = real(next(), 0.00002, 0.02);
        else if (option == "--safety")
            result.settings.safety = real(next(), 0.2, 1);
        else if (option == "--distance")
            result.camera.distance = real(next(), 0.04, 18);
        else if (option == "--capture")
            result.capture = pathFromUtf8(next());
        else if (option == "--export")
            result.output = pathFromUtf8(next());
        else if (option == "--detail") {
            result.camera.target = {0.4, 0.2, 0.45};
            result.camera.distance = 1.7;
        } else if (option == "--slice")
            result.settings.slice = true;
        else
            throw std::invalid_argument("Unknown option: " + std::string(option));
    }
    validate(result.settings);
    validateCamera(result.camera);
    if (result.fieldOnly && (result.verify || !result.output.empty() || !result.capture.empty() || result.frames > 0))
        throw std::invalid_argument("Use --verify-field separately from image verification/capture/export");
#if LAB_CHECKPOINT < 6
    if (result.verify || result.fieldOnly)
        throw std::invalid_argument("GPU field verification begins at checkpoint 06");
#endif
#if LAB_CHECKPOINT < 9
    if (!result.output.empty())
        throw std::invalid_argument("Full-image export begins at checkpoint 09");
#endif
    if (result.hidden && result.frames == 0 && result.seconds == 0 && result.output.empty() && result.capture.empty() && !result.verify && !result.fieldOnly)
        throw std::invalid_argument("Hidden runs require a finite frame/seconds/export/verify limit");
    return result;
}

int run(const Options& options) {
    NativeWindow window(options.hidden);
    GlApi gl;
    gl.loadAll();
    App app(window, gl);
    if (options.fieldOnly) {
#if LAB_CHECKPOINT >= 6
        verifyGpuField(gl);
        return 0;
#else
        throw std::invalid_argument("Field probes begin at checkpoint 06");
#endif
    }
    std::cout << "Project 43 - Mandelbulb Explorer\nGPU=" << reinterpret_cast<const char*>(gl.GetString(GL_RENDERER)) << " OpenGL=" << reinterpret_cast<const char*>(gl.GetString(GL_VERSION)) << '\n';
    std::cout << "Mouse left orbit / right pan / wheel dolly. IJKL, PgUp/Dn; Tab + arrows edit. Space refinement pause, X cancel, Enter restart. R reset, 1/2/3 presets, H views, F showcase, Q quit.\n";
#if LAB_CHECKPOINT >= 1
    app.start(options.settings, options.camera);
#endif
    const auto begin = std::chrono::steady_clock::now();
    int readyFrames = 0;
    bool checked = false;
    bool exported = false;
    bool captured = false;
    while (app.running()) {
        const double elapsed = std::chrono::duration<double>(std::chrono::steady_clock::now() - begin).count();
        if (options.seconds > 0 && elapsed >= options.seconds)
            break;
        if (options.hidden && elapsed > 120)
            throw std::runtime_error("Finite hidden run exceeded 120 seconds");
        SDL_Event event;
        while (SDL_PollEvent(&event))
            app.event(event);
        app.tick();
        app.draw();
        if (app.idle()) {
            ++readyFrames;
            if (options.verify && !checked) {
                if (!app.gpu().canariesIntact())
                    throw std::runtime_error("GPU wrote outside the image");
#if LAB_CHECKPOINT >= 6
                verifyGpuField(gl);
#endif
#if LAB_CHECKPOINT >= 9
                verifyCompleteImage(app);
#endif
                checked = true;
            }
            if ((options.frames > 0 && readyFrames >= options.frames) || (!options.output.empty()) || (!options.capture.empty()) || (options.verify && checked)) {
                if (!options.capture.empty()) {
                    int width{}, height{};
                    SDL_GetWindowSizeInPixels(window.get(), &width, &height);
                    captureFrame(gl, width, height, options.capture);
                    captured = true;
                }
#if LAB_CHECKPOINT >= 9
                if (!options.output.empty()) {
                    exportImage(app, options.output);
                    exported = true;
                }
#endif
                SDL_GL_SwapWindow(window.get());
                break;
            }
        }
        SDL_GL_SwapWindow(window.get());
        SDL_Delay(1);
    }
    if (app.failed())
        throw std::runtime_error(app.error());
    if (options.verify && !checked)
        throw std::runtime_error("Verification did not complete before the viewer stopped");
    if (!options.output.empty() && !exported)
        throw std::runtime_error("Export did not complete before the viewer stopped");
    if (!options.capture.empty() && !captured)
        throw std::runtime_error("Capture did not complete before the viewer stopped");
#if LAB_CHECKPOINT >= 1
    if (!app.plan().active())
        throw std::runtime_error("No preview completed");
#if LAB_CHECKPOINT >= 7
    const auto& counts = app.plan().finalCounters();
    const int reportedWidth = imageWidth, reportedHeight = imageHeight;
    const double reportedGpuMs = app.imageGpuMs();
    std::cout << "IMAGE ";
#else
    const auto& counts = app.plan().previewCounters();
    const int reportedWidth = previewWidth, reportedHeight = previewHeight;
    const double reportedGpuMs = app.lastKernelMs();
    std::cout << "PREVIEW ";
#endif
    std::cout << reportedWidth << 'x' << reportedHeight << " complete=" << app.plan().complete() << " generation=" << app.plan().active()->generation
              << " samples=" << counts.samples << " hits=" << counts.hits << " miss=" << counts.misses << " budget=" << counts.budget << " inside=" << counts.inside << " invalid=" << counts.invalid
              << " raySteps=" << counts.steps << " orbitIterations=" << counts.iterations << " gpuMs=" << reportedGpuMs << " bytes=" << app.gpu().bytes() << '\n';
#endif
    return 0;
}
} // namespace

int main(int argc, char** argv) {
    try {
        return run(parse(argc, argv));
    } catch (const std::exception& error) {
        std::cerr << "Mandelbulb Explorer: " << error.what() << '\n';
        return 1;
    }
}
