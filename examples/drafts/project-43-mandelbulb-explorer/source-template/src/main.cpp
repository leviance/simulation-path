#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include "bulb_app.hpp"
#include "bulb_export.hpp"
#include "bulb_trace.hpp"
#include "bulb_reference.hpp"
#include <charconv>

namespace {
using namespace bulb;
struct Options {
    Settings settings;
    Camera camera;
    bool hidden{}, verify{};
    int frames{}, seconds{}, preset{};
    std::filesystem::path capture, output;
};
int integer(std::string_view value, int minimum, int maximum) {
    int result{};
    const auto parsed = std::from_chars(value.data(), value.data() + value.size(), result);
    if (parsed.ec != std::errc{} || parsed.ptr != value.data() + value.size() || result < minimum || result > maximum)
        throw std::invalid_argument("Integer option is out of range");
    return result;
}
Options parse(int argc, char **argv) {
    Options result;
    for (int index = 1; index < argc; ++index) {
        const std::string_view option = argv[index];
        const auto next = [&]() -> std::string_view {if(index+1>=argc) throw std::invalid_argument("Missing option value");return argv[++index]; };
        if (option == "--hidden")
            result.hidden = true;
        else if (option == "--verify")
            result.verify = true;
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
    if (result.hidden && result.frames == 0 && result.seconds == 0 && result.output.empty() && !result.verify)
        throw std::invalid_argument("Hidden runs require a finite frame/seconds/export/verify limit");
    return result;
}
int run(const Options &options) {
    NativeWindow window(options.hidden);
    GlApi gl;
    gl.loadAll();
    App app(window, gl);
    std::cout << "Project 43 - Mandelbulb Explorer\nGPU=" << reinterpret_cast<const char *>(gl.GetString(GL_RENDERER)) << " OpenGL=" << reinterpret_cast<const char *>(gl.GetString(GL_VERSION)) << '\n';
    std::cout << "Mouse left orbit / right pan / wheel dolly. IJKL, PgUp/Dn; Tab + arrows edit. Space refinement pause, X cancel, Enter restart. R reset, 1/2/3 presets, H views, F showcase, Q quit.\n";
#if LAB_CHECKPOINT >= 1
    app.start(options.settings, options.camera);
#endif
    const auto begin = std::chrono::steady_clock::now();
    int readyFrames = 0;
    bool checked = false;
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
                checked = true;
            }
            if ((options.frames > 0 && readyFrames >= options.frames) || (!options.output.empty()) || (options.verify && checked)) {
                if (!options.capture.empty()) {
                    int width{}, height{};
                    SDL_GetWindowSizeInPixels(window.get(), &width, &height);
                    captureFrame(gl, width, height, options.capture);
                }
#if LAB_CHECKPOINT >= 9
                if (!options.output.empty())
                    exportImage(app, options.output);
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
#if LAB_CHECKPOINT >= 1
    if (!app.plan().active())
        throw std::runtime_error("No preview completed");
    const auto &counts = app.plan().finalCounters();
    std::cout << "IMAGE " << imageWidth << 'x' << imageHeight << " complete=" << app.plan().complete() << " generation=" << app.plan().active()->generation
              << " samples=" << counts.samples << " hits=" << counts.hits << " miss=" << counts.misses << " budget=" << counts.budget << " inside=" << counts.inside << " invalid=" << counts.invalid
              << " raySteps=" << counts.steps << " orbitIterations=" << counts.iterations << " gpuMs=" << app.imageGpuMs() << " bytes=" << app.gpu().bytes() << '\n';
#endif
    return 0;
}
} // namespace

int main(int argc, char **argv) {
    try {
        return run(parse(argc, argv));
    } catch (const std::exception &error) {
        std::cerr << "Mandelbulb Explorer: " << error.what() << '\n';
        return 1;
    }
}
