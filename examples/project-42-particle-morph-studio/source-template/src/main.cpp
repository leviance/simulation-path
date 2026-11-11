#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 10
#endif

#include "morph_app.hpp"
#include "morph_verify.hpp"
#include <SDL3/SDL_main.h>
#include <charconv>
#include <iostream>

namespace {

using namespace morph;

struct Options {
    Settings settings;
    View view;
    bool hidden{};
    bool verify{};
    bool events{};
    bool play{};
    bool help{};
    int frames{};
    int seconds{};
    double phase{};
    std::filesystem::path capture;
};

std::uint32_t integer(std::string_view value, std::uint32_t minimum, std::uint32_t maximum) {
    std::uint32_t parsed{};
    const auto result = std::from_chars(value.data(), value.data() + value.size(), parsed);
    if (result.ec != std::errc{} || result.ptr != value.data() + value.size() || parsed < minimum || parsed > maximum)
        throw std::invalid_argument("Integer option is outside its allowed range");
    return parsed;
}
Shape shape(std::string_view value) {
    if (value == "sphere")
        return Shape::sphere;
    if (value == "torus")
        return Shape::torus;
    if (value == "knot")
        return Shape::knot;
    throw std::invalid_argument("Shape must be sphere, torus or knot");
}
Options options(int argc, char **argv) {
    Options output;
    const auto next = [&](int &index) -> std::string_view {
        if (++index >= argc)
            throw std::invalid_argument("Missing option value");
        return argv[index];
    };
    for (int index = 1; index < argc; ++index) {
        const std::string_view option = argv[index];
        if (option == "--help")
            output.help = true;
        else if (option == "--hidden")
            output.hidden = true;
        else if (option == "--verify")
            output.verify = true;
        else if (option == "--exercise-events")
            output.events = true;
        else if (option == "--play")
            output.play = true;
        else if (option == "--heat")
            output.view.heatmap = true;
        else if (option == "--paths")
            output.view.paths = true;
        else if (option == "--count")
            output.settings.count = integer(next(index), 1, maximumCount);
        else if (option == "--seed")
            output.settings.seed = integer(next(index), 0, UINT32_MAX);
        else if (option == "--source")
            output.settings.source = shape(next(index));
        else if (option == "--target")
            output.settings.target = shape(next(index));
        else if (option == "--frames")
            output.frames = static_cast<int>(integer(next(index), 1, 10000));
        else if (option == "--seconds")
            output.seconds = static_cast<int>(integer(next(index), 1, 180));
        else if (option == "--capture")
            output.capture = pathFromUtf8(next(index));
        else if (option == "--phase") {
            const auto value = next(index);
            const auto parsed = std::from_chars(value.data(), value.data() + value.size(), output.phase);
            if (parsed.ec != std::errc{} || parsed.ptr != value.data() + value.size() || !std::isfinite(output.phase) || output.phase < 0.0 || output.phase > 1.0)
                throw std::invalid_argument("Phase must lie between zero and one");
        } else if (option == "--sampling") {
            const auto value = next(index);
            if (value == "area")
                output.settings.sampling = Sampling::area;
            else if (value == "triangle")
                output.settings.sampling = Sampling::triangleBiased;
            else
                throw std::invalid_argument("Sampling must be area or triangle");
        } else if (option == "--path") {
            const auto value = next(index);
            if (value == "straight")
                output.view.path = Path::straight;
            else if (value == "arc")
                output.view.path = Path::arc;
            else if (value == "flow")
                output.view.path = Path::flow;
            else
                throw std::invalid_argument("Path must be straight, arc or flow");
        } else if (option == "--matching") {
            const auto value = next(index);
            if (value == "random")
                output.view.matching = Matching::random;
            else if (value == "spatial")
                output.view.matching = Matching::spatial;
            else
                throw std::invalid_argument("Matching must be random or spatial");
        } else
            throw std::invalid_argument("Unknown option: " + std::string(option));
    }
    validateSettings(output.settings);
    if (output.hidden && !output.verify && output.frames == 0 && output.seconds == 0)
        throw std::invalid_argument("Hidden mode needs --frames, --seconds or --verify");
    if (!output.capture.empty() && output.frames == 0)
        throw std::invalid_argument("Capture needs a finite --frames count after ACTIVE is ready");
    return output;
}
void controls() {
    std::cout << "Project 42 - Particle Morph Studio\n"
              << "Space Play/Pause; R Reset; B Reverse; O Loop; Home/End exact endpoints.\n"
              << "M random/spatial correspondence; E linear/smooth; C straight/arc/flow; H heat; P subset paths.\n"
              << "1/2/3 staged target; Shift+1/2/3 staged source. Tab row, arrows edit, Enter apply; X cancel.\n"
              << "Left drag orbit; right/middle pan; wheel zoom; IJKL orbit, PgUp/PgDown zoom; F panel; Q/Esc quit.\n"
              << "--hidden --count N --source sphere|torus|knot --target ... --seed N --phase 0..1\n"
              << "--frames N counts READY frames; --seconds 1..180 bounds wall time; --verify checks every GPU ID.\n";
}

int run(const Options &options) {
    NativeWindow window(options.hidden);
    GlApi gl;
    gl.loadAll();
    const Capabilities caps = readCapabilities(gl);
    std::cout << "GPU=" << reinterpret_cast<const char *>(gl.GetString(GL_RENDERER))
              << " OpenGL=" << reinterpret_cast<const char *>(gl.GetString(GL_VERSION)) << '\n';
    App app(window, gl, caps);
    app.view = options.view;
    app.timeline.scrub(options.phase);
    app.timeline.paused = !options.play;
    app.start(options.settings);
    const auto begin = std::chrono::steady_clock::now();
    auto previous = begin;
    int readyFrames = 0;
    bool verified = false;
    bool exercised = false;
    while (app.running()) {
        const auto now = std::chrono::steady_clock::now();
        const double elapsed = std::chrono::duration<double>(now - begin).count();
        if (options.seconds > 0 && elapsed >= options.seconds)
            break;
        if (options.hidden && elapsed > 60.0)
            throw std::runtime_error("Hidden run reached its wall-time deadline");
        const double dt = std::chrono::duration<double>(now - previous).count();
        previous = now;
        SDL_Event event;
        while (SDL_PollEvent(&event))
            app.event(event);
        app.advance(dt);
        app.draw();
        if (app.ready()) {
            if (options.verify && !verified) {
                verifyGpu(app, gl);
                verified = true;
            }
            if (options.events && !exercised) {
                verifyControls(app);
                exercised = true;
            }
            ++readyFrames;
        }
        if (options.frames > 0 && readyFrames >= options.frames) {
            if (!options.capture.empty()) {
                int width{};
                int height{};
                SDL_GetWindowSizeInPixels(window.get(), &width, &height);
                captureFrame(gl, width, height, options.capture);
            }
            SDL_GL_SwapWindow(window.get());
            break;
        }
        SDL_GL_SwapWindow(window.get());
        app.frameMilliseconds(std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - now).count());
        if (options.verify && verified && readyFrames >= 6 && options.frames == 0)
            break;
        if (options.hidden || !window.vsync())
            SDL_Delay(1);
    }
    if (options.verify && !verified)
        throw std::runtime_error("GPU verification did not complete");
#if LAB_CHECKPOINT >= 1
    if (!app.session().active())
        throw std::runtime_error("No generation completed before the run ended: " + app.session().error());
    const auto &data = *app.session().active();
    const auto plan = planMemory(data.settings.count);
    std::cout << "ACTIVE N=" << data.settings.count << " GEN=" << data.generation
              << " source=" << shapeName(data.settings.source) << " target=" << shapeName(data.settings.target)
              << " drawn=" << app.status().drawn << " sourceBytes=" << plan.sourceBytes << " targetBytes=" << plan.targetBytes
              << " currentBytes=" << plan.currentBytes << " pathBytes=" << plan.pathBytes << " mappingBytes=" << plan.mappingBytes
              << " setupMs=" << data.setupMs << " preparationWallMs=" << data.preparationWallMs
              << " sampleMs=" << data.samplingMs << " matchMs=" << data.matchingMs
              << " uploadSubmitMs=" << app.status().uploadMs << " updateGpuMs=" << app.status().updateMs << " drawGpuMs=" << app.status().drawMs << '\n';
#endif
    return 0;
}
} // namespace

int main(int argc, char **argv) {
    try {
        const Options selected = options(argc, argv);
        controls();
        if (selected.help)
            return 0;
        return run(selected);
    } catch (const std::exception &error) {
        std::cerr << "Particle Morph Studio: " << error.what() << '\n';
        return 1;
    }
}
