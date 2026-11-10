#include "workshop_app.hpp"
#if LAB_CHECKPOINT >= 9
#include "workshop_checks.hpp"
#endif

#include <SDL3/SDL_main.h>
#include <charconv>
#include <iostream>
#include <string_view>

namespace {

struct RunOptions {
    geometry::SurfaceSettings settings = geometry::presetSettings(geometry::lessonPreset());
    geometry::ViewOptions view;
    bool hidden{};
    bool help{};
#if LAB_CHECKPOINT >= 9
    bool exerciseView{};
#endif
    bool panelVisible{true};
    int frames{};
    int seconds{};
    std::string capturePath;
#if LAB_CHECKPOINT >= 8
    std::filesystem::path exportDirectory;
#endif
};

int parseInteger(std::string_view text, int minimum, int maximum) {
    int value{};
    const auto result = std::from_chars(text.data(), text.data() + text.size(), value);
    if (result.ec != std::errc{} || result.ptr != text.data() + text.size() || value < minimum || value > maximum) {
        throw std::invalid_argument("Integer argument is outside its allowed range");
    }
    return value;
}

geometry::SurfaceKind parsePreset(std::string_view name) {
    if (name == "patch")
        return geometry::SurfaceKind::patch;
    if (name == "torus")
        return geometry::SurfaceKind::torus;
    if (name == "shell")
        return geometry::SurfaceKind::shell;
    if (name == "mobius")
        return geometry::SurfaceKind::mobius;
    if (name == "knot")
        return geometry::SurfaceKind::knot;
    throw std::invalid_argument("Preset must be patch, torus, shell, mobius or knot");
}

std::string_view nextArgument(int& index, int argc, char** argv) {
    ++index;
    if (index >= argc)
        throw std::invalid_argument("An option is missing its value");
    return argv[index];
}

RunOptions parseOptions(int argc, char** argv) {
    RunOptions options;
#if LAB_CHECKPOINT >= 2
    int resolution = 0;
#endif
    for (int index = 1; index < argc; ++index) {
        const std::string_view argument = argv[index];
        if (argument == "--help")
            options.help = true;
        else if (argument == "--hidden")
            options.hidden = true;
#if LAB_CHECKPOINT >= 2
        else if (argument == "--wireframe")
            options.view.wireframe = true;
#endif
#if LAB_CHECKPOINT >= 3
        else if (argument == "--uv")
            options.view.uv = true;
        else if (argument == "--seams")
            options.view.seams = true;
#endif
#if LAB_CHECKPOINT >= 1
        else if (argument == "--normals")
            options.view.normals = true;
#endif
        else if (argument == "--no-grid")
            options.view.grid = false;
        else if (argument == "--no-panel")
            options.panelVisible = false;
#if LAB_CHECKPOINT >= 9
        else if (argument == "--exercise-view")
            options.exerciseView = true;
#endif
        else if (argument == "--frames")
            options.frames = parseInteger(nextArgument(index, argc, argv), 1, 360);
        else if (argument == "--seconds")
            options.seconds = parseInteger(nextArgument(index, argc, argv), 1, 180);
#if LAB_CHECKPOINT >= 2
        else if (argument == "--resolution")
            resolution = parseInteger(nextArgument(index, argc, argv), 8, geometry::maxSegments);
#endif
        else if (argument == "--preset")
            options.settings = geometry::presetSettings(parsePreset(nextArgument(index, argc, argv)));
        else if (argument == "--capture")
            options.capturePath = nextArgument(index, argc, argv);
#if LAB_CHECKPOINT >= 8
        else if (argument == "--export-dir")
            options.exportDirectory = geometry::pathFromUtf8(nextArgument(index, argc, argv));
#endif
        else
            throw std::invalid_argument("Unknown viewer option: " + std::string(argument));
    }
#if LAB_CHECKPOINT >= 2
    if (resolution > 0) {
        options.settings.uSegments = resolution;
        options.settings.vSegments = resolution;
    }
#endif
    if (options.hidden && options.frames == 0 && options.seconds == 0) {
        throw std::invalid_argument("Hidden verification requires --frames or --seconds");
    }
    if (!options.capturePath.empty() && options.frames == 0) {
        throw std::invalid_argument("--capture requires a finite --frames count");
    }
    geometry::validateSettings(options.settings);
    return options;
}

void printControls() {
    std::cout << "Project 41 - Geometry Workshop\n";
    for (std::size_t index = 0; index < geometry::panelPresets.size(); ++index) {
        std::cout << index + 1 << ": " << geometry::presetName(geometry::panelPresets[index]) << '\n';
    }
    std::cout << "Left drag orbit; middle/right drag pan; wheel zoom. Tab panel, B grid.\n";
#if LAB_CHECKPOINT >= 1
    std::cout << "A/D patch height or radius; N tangent/normal; R reset.\n";
#endif
#if LAB_CHECKPOINT >= 2
    std::cout << "[/] resolution; W wireframe.\n";
#endif
#if LAB_CHECKPOINT >= 3
    std::cout << "J/L thickness; U UV; S seams; comma/period twist where available.\n";
#endif
#if LAB_CHECKPOINT >= 5
    std::cout << "G/H shell growth; T/Y shell turns.\n";
#endif
#if LAB_CHECKPOINT >= 6
    std::cout << "K knot lobes.\n";
#endif
#if LAB_CHECKPOINT >= 7
    std::cout << "X cancel candidate.\n";
#endif
#if LAB_CHECKPOINT >= 8
    std::cout << "E export verified OBJ; CLI --export-dir NEW_DIRECTORY.\n";
#endif
    std::cout << "Esc exit; --seconds N; --hidden --frames N [--capture PATH].\n";
#if LAB_CHECKPOINT >= 9
    std::cout << "--exercise-view checks app events in a hidden context, not OS capture.\n";
#endif
}

int run(const RunOptions& options) {
    // Setup SDL and its current GL context before loading entry points or creating buffers.
    geometry::NativeWindow window(options.hidden);
    geometry::GlApi gl;
    gl.loadAll();
    geometry::validateGlContext(gl);
    const char* rendererName = reinterpret_cast<const char*>(gl.GetString(GL_RENDERER));
    const char* versionName = reinterpret_cast<const char*>(gl.GetString(GL_VERSION));
    std::cout << "GPU=" << rendererName << " OpenGL=" << versionName << '\n';
    geometry::GeometryRenderer renderer(gl);
    geometry::WorkshopApp app(window, renderer);
    app.view() = options.view;
    app.setPanelVisible(options.panelVisible);
    app.request(options.settings);

    int frames = 0;
#if LAB_CHECKPOINT >= 9
    bool exercised = false;
#endif
    bool captured = false;
    const Uint64 start = SDL_GetTicks();
    while (app.running()) {
        if (options.frames > 0 && frames >= options.frames)
            break;
        if (options.seconds > 0 && SDL_GetTicks() - start >= 1000ULL * options.seconds)
            break;
        SDL_Event event{};
        for (int count = 0; count < 128 && SDL_PollEvent(&event); ++count)
            app.handleEvent(event);
        if (!app.running())
            break;
        app.advanceMesh();
#if LAB_CHECKPOINT >= 9
        if (options.exerciseView && !exercised && app.session().lastGood() && !app.session().requested()) {
            app.exerciseViewWithoutRebuild();
            if (options.panelVisible)
                app.exercisePanelEvents();
            exercised = true;
        }
#endif
        int width{};
        int height{};
        if (!SDL_GetWindowSizeInPixels(window.window(), &width, &height))
            throw std::runtime_error(SDL_GetError());
        if (width > 0 && height > 0) {
            app.draw(width, height);
            if (!options.capturePath.empty() && frames + 1 == options.frames) {
                geometry::captureFrame(gl, width, height, options.capturePath);
                captured = true;
            }
            if (!SDL_GL_SwapWindow(window.window()))
                throw std::runtime_error(SDL_GetError());
        }
        ++frames;
        if (!options.hidden && !window.vsync())
            SDL_Delay(8);
    }

    const geometry::Mesh* mesh = app.session().lastGood();
    bool verifyFinal = options.hidden || !options.capturePath.empty();
#if LAB_CHECKPOINT >= 8
    verifyFinal = verifyFinal || !options.exportDirectory.empty();
#endif
#if LAB_CHECKPOINT >= 9
    verifyFinal = verifyFinal || options.exerciseView;
#endif
#if LAB_CHECKPOINT >= 1
    if (verifyFinal && (!mesh || app.session().requested() || mesh->settings != options.settings)) {
        throw std::runtime_error("The requested full mesh did not finish: " + app.session().message());
    }
#else
    if (verifyFinal && mesh)
        throw std::runtime_error("Starter must not publish a mesh yet");
    std::cout << "NATIVE STARTER: window, camera and grid; no mesh\n";
#endif
#if LAB_CHECKPOINT >= 9
    if (options.exerciseView && !exercised)
        throw std::runtime_error("View verification did not finish");
#endif
    if (!options.capturePath.empty() && !captured)
        throw std::runtime_error("Capture frame was not drawn");
#if LAB_CHECKPOINT >= 8
    if (!options.exportDirectory.empty()) {
        std::cout << "OBJ FILE ROUND-TRIP PASS: " << app.exportTo(options.exportDirectory) << '\n';
    }
#endif
    if (mesh) {
        std::cout << "NATIVE MESH: " << geometry::presetName(mesh->settings.kind);
        std::cout << " vertices=" << mesh->vertices.size() << " triangles=" << mesh->indices.size() / 3;
        std::cout << " payloadBytes=" << mesh->payloadBytes() << " builds=" << app.session().buildCount();
        std::cout << " publications=" << app.session().publicationCount() << '\n';
    }
#if LAB_CHECKPOINT >= 9
    if (exercised) {
        std::cout << "NATIVE VIEW CHECK PASS: camera/debug independent; in-flight, cancel, reset and invalid inputs keep last-good.\n";
        if (options.panelVisible) {
            std::cout << "NATIVE PANEL EVENT CHECK PASS: preset, live slider, release, focus-loss and display; OS capture unverified.\n";
        }
    }
#endif
    // Cleanup: the renderer releases GL resources before the window releases its context.
    return 0;
}

} // namespace

int main(int argc, char** argv) {
    try {
        const RunOptions options = parseOptions(argc, argv);
        if (options.help) {
            printControls();
            return 0;
        }
        return run(options);
    } catch (const std::exception& error) {
        std::cerr << "Geometry Workshop: " << error.what() << '\n';
        return 1;
    }
}
