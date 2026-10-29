#pragma once

#include "compute_dashboard.hpp"
#include "compute_verify.hpp"

#include <filesystem>
#include <iostream>

namespace lab {

inline std::filesystem::path computeShaderPath() {
#ifdef COURSE_SHADER_DIRECTORY
    const auto source = std::filesystem::path(COURSE_SHADER_DIRECTORY) / "vector_ops.comp";
    std::error_code error{};
    if (std::filesystem::is_regular_file(source, error) && !error) {
        return source;
    }
#endif
    const char* base = SDL_GetBasePath();
    if (!base) {
        throw std::runtime_error("Cannot find executable directory.");
    }
#ifdef COURSE_SHADER_FALLBACK_SUBDIRECTORY
    return std::filesystem::path(base) / COURSE_SHADER_FALLBACK_SUBDIRECTORY / "vector_ops.comp";
#else
    return std::filesystem::path(base) / "shaders" / "vector_ops.comp";
#endif
}

class ComputeApplication {
    public:
    ~ComputeApplication() {
        // run() sở hữu worker trong scope riêng: thread kết thúc trước context/window.
        if (context_) {
            SDL_GL_DestroyContext(context_);
        }
        SDL_DestroyWindow(computeWindow_);
        SDL_DestroyWindow(window_);
        SDL_Quit();
    }

    int run(bool verify, int smokeFrames, const std::string& snapshotPath) {
        if (!SDL_Init(SDL_INIT_VIDEO)) {
            throw std::runtime_error(std::string("SDL_Init: ") + SDL_GetError());
        }
        std::string shaderSource{};
#if LAB_CHECKPOINT >= 2
        if (!SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 4) ||
            !SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 3) ||
            !SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_CORE)) {
            throw std::runtime_error(std::string("OpenGL 4.3 request: ") + SDL_GetError());
        }
        computeWindow_ = SDL_CreateWindow("P37 compute context", 32, 32, SDL_WINDOW_OPENGL | SDL_WINDOW_HIDDEN);
        if (!computeWindow_) {
            throw std::runtime_error(std::string("Compute window: ") + SDL_GetError());
        }
        context_ = SDL_GL_CreateContext(computeWindow_);
        if (!context_ || !SDL_GL_MakeCurrent(computeWindow_, context_)) {
            throw std::runtime_error(std::string("OpenGL 4.3 context: ") + SDL_GetError());
        }
#endif
#if LAB_CHECKPOINT >= 4
        shaderSource = readComputeSource(computeShaderPath());
#endif
#if LAB_CHECKPOINT >= 11
        if (verify) {
            GlApi api{};
            if (!api.load()) {
                throw std::runtime_error("Missing GL function: " + api.missingFunction);
            }
            std::cout << "GPU: " << api.GetString(GL_RENDERER) << " | " << api.GetString(GL_VERSION) << '\n';
            if (!verifyCompute(api, shaderSource)) {
                return EXIT_FAILURE;
            }
            if (!verifyBenchmarkJobs(computeWindow_, context_, shaderSource)) {
                return EXIT_FAILURE;
            }
            return EXIT_SUCCESS;
        }
#else
        if (verify) {
            throw std::invalid_argument("--verify is available in checkpoint 11 and final.");
        }
#endif
#if LAB_CHECKPOINT >= 2
        if (!SDL_GL_MakeCurrent(computeWindow_, nullptr)) {
            throw std::runtime_error(std::string("Detach compute context: ") + SDL_GetError());
        }
#endif
        window_ = SDL_CreateWindow("Project 37 - Vector Compute Workbench", DashboardSurface::width, DashboardSurface::height, SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
        if (!window_) {
            throw std::runtime_error(std::string("Dashboard window: ") + SDL_GetError());
        }
        SDL_SetWindowMinimumSize(window_, 870, 615);
        DashboardSurface dashboard{};
        ComputeWorker worker(computeWindow_, context_, std::move(shaderSource));
        WorkloadConfig selected{};
#if LAB_CHECKPOINT >= 5
        selected.elementCount = 1'000'003U;
#endif
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 8
        const bool startBenchmark = !snapshotPath.empty();
        worker.start(selected, startBenchmark);
#else
        worker.start(selected, false);
#endif
#endif
        bool running = true;
        bool sawFailure = false;
        std::size_t inspectorIndex = 0;
        int frames = 0;
        while (running) {
            SDL_Event event{};
            while (SDL_PollEvent(&event)) {
                if (event.type == SDL_EVENT_QUIT) {
                    worker.cancel();
                    running = false;
                } else if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                    const SDL_Keycode key = event.key.key;
                    if (key == SDLK_ESCAPE) {
                        if (worker.active()) {
                            worker.cancel();
                        } else {
                            running = false;
                        }
                    } else if (!worker.active()) {
#if LAB_CHECKPOINT >= 1
                        if (key == SDLK_SPACE) {
                            worker.start(selected, false);
                        }
#endif
#if LAB_CHECKPOINT >= 8
                        if (key == SDLK_B) {
                            worker.start(selected, true);
                        }
#endif
                        if (key == SDLK_1) {
                            selected.operation = VectorOperation::add;
                        } else if (key == SDLK_2) {
                            selected.operation = VectorOperation::axpy;
                        } else if (key == SDLK_3) {
                            selected.operation = VectorOperation::difference;
                        } else if (key == SDLK_MINUS) {
                            selected.scalar = std::max(-4.0F, selected.scalar - 0.25F);
                        } else if (key == SDLK_EQUALS) {
                            selected.scalar = std::min(4.0F, selected.scalar + 0.25F);
                        } else if (key == SDLK_R) {
                            selected = {};
#if LAB_CHECKPOINT >= 5
                            selected.elementCount = 1'000'003U;
#endif
                            inspectorIndex = 0;
                            worker.start(selected, false);
                        }
#if LAB_CHECKPOINT >= 5
                        if (key == SDLK_LEFTBRACKET) {
                            if (selected.elementCount > 65'537U) {
                                selected.elementCount = 65'537U;
                            } else {
                                selected.elementCount = 256U;
                            }
                        } else if (key == SDLK_RIGHTBRACKET) {
                            if (selected.elementCount < 65'537U) {
                                selected.elementCount = 65'537U;
                            } else {
                                selected.elementCount = 1'000'003U;
                            }
                        }
#endif
                    }
#if LAB_CHECKPOINT >= 10
                    const auto report = worker.snapshot();
                    if (report.data) {
                        const std::size_t last = report.data->config.elementCount - 1U;
                        inspectorIndex = std::min(inspectorIndex, last);
                        if (key == SDLK_LEFT && inspectorIndex > 0) {
                            --inspectorIndex;
                        } else if (key == SDLK_RIGHT) {
                            inspectorIndex = std::min(last, inspectorIndex + 1U);
                        } else if (key == SDLK_PAGEUP) {
                            inspectorIndex = std::min(last, inspectorIndex + 1024U);
                        } else if (key == SDLK_PAGEDOWN) {
                            if (inspectorIndex >= 1024U) {
                                inspectorIndex -= 1024U;
                            } else {
                                inspectorIndex = 0;
                            }
                        } else if (key == SDLK_HOME) {
                            inspectorIndex = 0;
                        } else if (key == SDLK_END) {
                            inspectorIndex = last;
                        }
                    }
#endif
                }
            }
            const WorkerReport report = worker.snapshot();
            if (report.data) {
                inspectorIndex = std::min(inspectorIndex, report.data->config.elementCount - 1U);
            }
            sawFailure = sawFailure || report.failed;
            drawComputeDashboard(dashboard, selected, report, worker.active(), inspectorIndex);
            dashboard.present(window_);
            ++frames;
            if (smokeFrames > 0 && frames >= smokeFrames && !worker.active()) {
                if (!snapshotPath.empty() && !SDL_SaveBMP(dashboard.surface(), snapshotPath.c_str())) {
                    throw std::runtime_error(std::string("Screenshot: ") + SDL_GetError());
                }
                running = false;
            }
            SDL_Delay(16);
        }
        worker.cancel();
        if (smokeFrames > 0 && sawFailure) {
            return EXIT_FAILURE;
        }
        return EXIT_SUCCESS;
    }

    private:
    SDL_Window* window_{};
    SDL_Window* computeWindow_{};
    SDL_GLContext context_{};
};

} // namespace lab
