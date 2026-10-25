#pragma once
// SDL event loop; smoke/benchmark có deadline riêng và không chờ input người dùng.
#include "presentation.hpp"
#include <iostream>

namespace survey {
struct Pointer {
    bool active{};
    SDL_MouseID owner{};
    std::uint8_t button{};
    Camera initialCamera{};
    double x{};
    double y{};
};

inline void releasePointer(Pointer& pointer) {
    pointer.active = false;
    SDL_CaptureMouse(false);
}

// [snippet:applyPointer]
inline void applyPointer(Scene& scene, const Pointer& pointer, double x, double y) {
    const double dx = x - pointer.x;
    const double dy = y - pointer.y;
    scene.camera = pointer.initialCamera;
    if (pointer.button == SDL_BUTTON_LEFT) {
        scene.camera.yaw -= dx * 0.006;
        scene.camera.pitch = std::clamp(scene.camera.pitch + dy * 0.006, -1.45, 1.45);
    } else {
        const Basis basis = cameraBasis(scene.camera);
        const double scale = scene.camera.distance * 0.0015;
        translateCamera(scene.camera, basis.right * (-dx * scale) + basis.up * (dy * scale));
    }
}

// [/snippet:applyPointer]

// [snippet:workflow]
inline bool workflow(Scene& scene) {
    scene.selectionEnabled = true;
    scene.region = Region{};
    scene.region.center = {0, 0, 0};
    scene.region.half = {12, 0.1, 9};
    scene.region.minimumHeight = 0;
    scene.region.maximumHeight = 0;
    refreshSelection(scene);
    if (scene.points.size() < 100000 || scene.selected.indices.empty()) {
        return false;
    }
    if (!sameIndices(scene.selected, brute(scene.points, scene.region))) {
        return false;
    }
    std::ostringstream output;
    writeCsv(output, selectedPoints(scene.points, scene.selected));
    std::istringstream input(output.str());
    const auto restored = readCsv(input);
    const auto expected = selectedPoints(scene.points, scene.selected);
    if (restored.size() != expected.size()) {
        return false;
    }
    for (std::size_t i = 0; i < restored.size(); ++i) {
        const Vec3 delta = restored[i].position - expected[i].position;
        if (restored[i].id != expected[i].id || dot(delta, delta) != 0) {
            return false;
        }
    }
    return true;
}

// [/snippet:workflow]

inline int benchmarkCommand(Scene& scene) {
    Job job = startBenchmark(scene);
    const auto start = Clock::now();
    std::size_t ticks = 0;
    while (job.active && ++ticks <= 10000 && elapsedMs(start) < 15000) {
        tickBenchmark(job, scene);
    }
    std::cout << "N=" << scene.points.size() << "; source=" << scene.origin << "; Q=16; warm-up=2; samples=5; point+tree backing bytes=" << scene.points.capacity() * sizeof(Point) + scene.tree.allocatedBytes() << '\n';
    std::cout << job.report;
    if (job.active || job.errors != 0) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}

inline int runApplication(int argc, char** argv) {
    bool smoke = false;
    bool fullWorkflow = false;
    bool benchmark = false;
    std::string inputPath;
    for (int i = 1; i < argc; ++i) {
        const std::string argument = argv[i];
        if (argument == "--smoke") {
            smoke = true;
        } else if (argument == "--smoke-workflow") {
            smoke = true;
            fullWorkflow = true;
        } else if (argument == "--benchmark") {
            benchmark = true;
        } else if (argument == "--input" && i + 1 < argc) {
            inputPath = argv[++i];
        } else if (argument == "--generate-room" && i + 1 < argc) {
            writeNewCloudFile(argv[++i], makeRoom(100000));
            return EXIT_SUCCESS;
        } else {
            throw std::runtime_error("Usage: [--input file.csv] [--smoke|--smoke-workflow|--benchmark|--generate-room output.csv]");
        }
    }
    std::vector<Point> points;
#if LAB_CHECKPOINT >= 1
    if (!inputPath.empty()) {
        points = readCloudFile(inputPath);
    } else if (smoke || benchmark) {
        points = defaultCloud();
    } else {
        points = openDefaultCloud();
    }
#endif
    Scene scene(std::move(points));
    scene.origin = "room seed=30";
    if (!inputPath.empty()) {
        scene.origin = "CSV " + inputPath;
    }
    if (benchmark) {
#if LAB_CHECKPOINT >= 10
        return benchmarkCommand(scene);
#else
        throw std::runtime_error("Benchmark is introduced in lesson 10");
#endif
    }
    if (fullWorkflow) {
#if LAB_CHECKPOINT >= 8
        if (!workflow(scene)) {
            return EXIT_FAILURE;
        }
#else
        return EXIT_FAILURE;
#endif
    }

    // Cấp phát CPU trước SDL để lỗi bad_alloc không bỏ lại window/texture.
    Framebuffer image(1100, 570);
    // [snippet:sdlSetup]
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        throw std::runtime_error(SDL_GetError());
    }
    SDL_Window* window = SDL_CreateWindow("Project 30 | Point Cloud Survey", 1100, 800, SDL_WINDOW_RESIZABLE);
    if (!window) {
        SDL_Quit();
        throw std::runtime_error(SDL_GetError());
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        SDL_DestroyWindow(window);
        SDL_Quit();
        throw std::runtime_error(SDL_GetError());
    }
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, 1100, 570);
    if (!texture) {
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        throw std::runtime_error(SDL_GetError());
    }
    SDL_SetRenderLogicalPresentation(renderer, 1100, 800, SDL_LOGICAL_PRESENTATION_LETTERBOX);
    SDL_SetRenderVSync(renderer, 1);
    // [/snippet:sdlSetup]

    Pointer pointer{};
    Job job{};
    bool running = true;
    bool uniform = false;
    bool dirty = true;
    bool failed = false;
    std::size_t frames = 0;
    const auto started = SDL_GetTicks();
#if LAB_CHECKPOINT >= 2
    auto previous = started;
#endif
    try {
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                SDL_ConvertEventToRenderCoordinates(renderer, &event);
                if (event.type == SDL_EVENT_QUIT) {
                    running = false;
                } else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                    releasePointer(pointer);
                    job.active = false;
                    job.report.clear();
                    dirty = true;
                }
#if LAB_CHECKPOINT >= 2
                else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && !pointer.active && event.button.y < 570 && (event.button.button == SDL_BUTTON_LEFT || event.button.button == SDL_BUTTON_RIGHT)) {
                    if (SDL_CaptureMouse(true)) {
                        pointer = {true, event.button.which, event.button.button, scene.camera, event.button.x, event.button.y};
                        job.active = false;
                        job.report.clear();
                    }
                } else if (event.type == SDL_EVENT_MOUSE_MOTION && pointer.active && event.motion.which == pointer.owner) {
                    if (!(event.motion.state & SDL_BUTTON_MASK(pointer.button))) {
                        releasePointer(pointer);
                    } else {
                        applyPointer(scene, pointer, event.motion.x, event.motion.y);
                        dirty = true;
                    }
                } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && pointer.active && event.button.which == pointer.owner && event.button.button == pointer.button) {
                    applyPointer(scene, pointer, event.button.x, event.button.y);
                    releasePointer(pointer);
                    dirty = true;
                } else if (event.type == SDL_EVENT_MOUSE_WHEEL) {
                    releasePointer(pointer);
                    job.active = false;
                    job.report.clear();
                    if (scene.camera.freeFly) {
                        translateCamera(scene.camera, cameraBasis(scene.camera).forward * event.wheel.y);
                    } else {
                        scene.camera.distance = std::clamp(scene.camera.distance * std::exp(-double(event.wheel.y) * 0.1), 0.1, std::max(500.0, scene.camera.farPlane * 0.8));
                    }
                    dirty = true;
                }
#endif
                else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && !(event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                    if (event.key.key == SDLK_ESCAPE) {
                        if (pointer.active) {
                            scene.camera = pointer.initialCamera;
                            releasePointer(pointer);
                        } else if (job.active) {
                            job.active = false;
                            job.report = "Cancelled";
                        } else {
                            running = false;
                        }
                    } else if (event.key.key == SDLK_R || event.key.key == SDLK_N) {
                        releasePointer(pointer);
                        job = Job{};
                        if (event.key.key == SDLK_N) {
                            uniform = !uniform;
                        }
                        if (!inputPath.empty() && event.key.key == SDLK_R) {
                            scene = Scene(readCloudFile(inputPath));
                        } else {
                            scene = Scene(defaultCloud(uniform));
                        }
                        scene.origin = "room seed=30";
                        if (uniform) {
                            scene.origin = "uniform seed=30";
                        }
                        if (!inputPath.empty() && event.key.key == SDLK_R) {
                            scene.origin = "CSV " + inputPath;
                        }
                    } else {
                        releasePointer(pointer);
                        handleKey(scene, job, event.key.key, event.key.mod);
                    }
                    dirty = true;
                }
            }
#if LAB_CHECKPOINT >= 2
            const auto now = SDL_GetTicks();
            const double dt = std::min(0.05, double(now - previous) / 1000.0);
            previous = now;
            if (scene.camera.freeFly && (SDL_GetWindowFlags(window) & SDL_WINDOW_INPUT_FOCUS) && !(SDL_GetModState() & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI))) {
                const bool* keys = SDL_GetKeyboardState(nullptr);
                const Basis basis = cameraBasis(scene.camera);
                const Vec3 delta = basis.forward * double(keys[SDL_SCANCODE_W] - keys[SDL_SCANCODE_S]) + basis.right * double(keys[SDL_SCANCODE_D] - keys[SDL_SCANCODE_A]) + Vec3{0, double(keys[SDL_SCANCODE_E] - keys[SDL_SCANCODE_Q]), 0};
                if (dot(delta, delta) > 0) {
                    translateCamera(scene.camera, unit(delta) * (5 * dt));
                    job.active = false;
                    job.report.clear();
                    dirty = true;
                }
            }
#endif
            if (job.active && !job.paused) {
                if (job.benchmark) {
                    tickBenchmark(job, scene);
                } else {
                    tickValidation(job, scene);
                }
                dirty = true;
            }
            if (dirty || smoke) {
                refreshVisible(scene, image.width, image.height);
                renderPoints(scene, image);
                if (scene.drawn != scene.visible.indices.size()) {
                    throw std::runtime_error("Renderer dropped visible points");
                }
                renderOverlay(scene, image);
                if (!SDL_UpdateTexture(texture, nullptr, image.pixels.data(), image.width * int(sizeof(std::uint32_t)))) {
                    throw std::runtime_error(SDL_GetError());
                }
                SDL_SetRenderDrawColor(renderer, 15, 23, 32, 255);
                SDL_RenderClear(renderer);
                const SDL_FRect destination{0, 0, 1100, 570};
                SDL_RenderTexture(renderer, texture, nullptr, &destination);
                hud(renderer, scene, job);
                SDL_RenderPresent(renderer);
                dirty = false;
                ++frames;
            }
            if (smoke && frames >= 4) {
                running = false;
            }
            if (smoke && SDL_GetTicks() - started > 10000) {
                throw std::runtime_error("Smoke deadline exhausted");
            }
            SDL_Delay(8);
        }
        std::cout << "P30 stage=" << stage << " N=" << scene.points.size() << " selected=" << scene.selected.indices.size() << " visible=" << scene.visible.indices.size() << " drawn=" << scene.drawn << '\n';
    } catch (const std::exception& error) {
        std::cerr << error.what() << '\n';
        failed = true;
    }

    // Một đường cleanup cho cả lỗi và đóng window; không giữ mouse capture khi thoát.
    releasePointer(pointer);
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
} // namespace survey
