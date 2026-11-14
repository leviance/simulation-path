#pragma once

#include "sculpt_guides.hpp"
#include "sculpt_renderer.hpp"
#include "sculpt_tetra.hpp"
#include "sculpt_window.hpp"
#include <charconv>
#include <iostream>

namespace sculpt {

#if LAB_CHECKPOINT == 0
inline constexpr bool tetraExtractionEnabled = false;
#else
inline constexpr bool tetraExtractionEnabled = true;
#endif

struct TetraPreviewOptions {
    bool hidden{};
    int seconds{};
    std::filesystem::path capture;
};

inline TetraPreviewOptions tetraPreviewOptions(int argc, char** argv) {
    TetraPreviewOptions result;
    for (int index = 1; index < argc; ++index) {
        const std::string_view option = argv[index];
        if (option == "--hidden")
            result.hidden = true;
        else if (option == "--seconds" || option == "--capture") {
            if (index + 1 >= argc)
                throw std::invalid_argument("Missing teaching-preview option value");
            const std::string_view value = argv[++index];
            if (option == "--capture")
                result.capture = pathFromUtf8(value);
            else {
                const auto parsed = std::from_chars(value.data(), value.data() + value.size(), result.seconds);
                if (parsed.ec != std::errc{} || parsed.ptr != value.data() + value.size() || result.seconds < 1 || result.seconds > 120)
                    throw std::invalid_argument("Teaching-preview duration must be 1..120 seconds");
            }
        } else
            throw std::invalid_argument("Unknown teaching-preview option");
    }
    if (result.hidden && result.seconds == 0 && result.capture.empty())
        throw std::invalid_argument("A hidden preview needs a finite duration or capture");
    return result;
}

inline std::vector<LineVertex> tetraGuideLines(const std::array<Corner, 4>& corners) {
    std::vector<LineVertex> lines;
    const auto color = [](const Corner& corner) {
        if (corner.value < 0)
            return Vec3{1, 0.4F, 0.25F};
        return Vec3{0.3F, 0.65F, 1};
    };
    for (int first = 0; first < 4; ++first) {
        for (int second = first + 1; second < 4; ++second) {
            lines.push_back(lineVertex(corners[first].point, color(corners[first])));
            lines.push_back(lineVertex(corners[second].point, color(corners[second])));
        }
        for (const auto axis : {Vec3{0.04F, 0, 0}, Vec3{0, 0.04F, 0}, Vec3{0, 0, 0.04F}}) {
            lines.push_back(lineVertex(corners[first].point - axis, color(corners[first])));
            lines.push_back(lineVertex(corners[first].point + axis, color(corners[first])));
        }
    }
    return lines;
}

// Supplied SDL/OpenGL presentation. Lesson 01 changes tetraSurface(), not the window/GL loader.
inline int runTetraPreview(int argc, char** argv) {
    const auto options = tetraPreviewOptions(argc, argv);
    NativeWindow window(options.hidden);
    SDL_SetWindowTitle(window.get(), "Project 44 - One Tetra");
    GlApi gl;
    gl.loadAll();
    GpuBudget budget;
    MeshRenderer renderer(gl);
    GuideRenderer guides(gl);
    OverlayRenderer ui(gl);
    auto corners = teachingTetra();
    float isovalue = 0;
    Camera camera;
    std::vector<MeshChunk> mesh;
    std::uint32_t meshRevision = 0;
    bool dirty = true, running = true, orbiting = false, wireframe = false, captured = false;
    std::uint32_t owner{};
    float previousX{}, previousY{};
    const auto releasePointer = [&]() {
        if (orbiting)
            SDL_CaptureMouse(false);
        orbiting = false;
    };
    const auto begin = std::chrono::steady_clock::now();
    auto nextFrame = begin;
    while (running) {
        const auto now = std::chrono::steady_clock::now();
        if (options.seconds > 0 && now - begin >= std::chrono::seconds(options.seconds))
            break;
        SDL_Event event;
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT)
                running = false;
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED)
                releasePointer();
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && !orbiting && event.button.button == SDL_BUTTON_LEFT && SDL_CaptureMouse(true)) {
                owner = event.button.which;
                previousX = event.button.x;
                previousY = event.button.y;
                orbiting = true;
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.which == owner && event.button.button == SDL_BUTTON_LEFT)
                releasePointer();
            if (event.type == SDL_EVENT_MOUSE_MOTION && orbiting && event.motion.which == owner) {
                if ((event.motion.state & SDL_BUTTON_LMASK) == 0)
                    releasePointer();
                else {
                    camera.orbit(event.motion.x - previousX, event.motion.y - previousY);
                    previousX = event.motion.x;
                    previousY = event.motion.y;
                }
            }
            if (event.type == SDL_EVENT_MOUSE_WHEEL && !orbiting)
                camera.zoom(event.wheel.y);
            if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
                const auto key = event.key.key;
                if (key == SDLK_Q)
                    running = false;
                if (key == SDLK_ESCAPE)
                    releasePointer();
                if (key >= SDLK_1 && key <= SDLK_4) {
                    const auto index = static_cast<std::size_t>(key - SDLK_1);
                    corners[index].value = -corners[index].value;
                    dirty = true;
                }
                if (key == SDLK_LEFT || key == SDLK_RIGHT) {
                    float change = 0.1F;
                    if (key == SDLK_LEFT)
                        change = -change;
                    isovalue = std::clamp(isovalue + change, -0.9F, 0.9F);
                    dirty = true;
                }
                if (key == SDLK_F11)
                    wireframe = !wireframe;
                if (key == SDLK_R) {
                    corners = teachingTetra();
                    isovalue = 0;
                    camera = {};
                    dirty = true;
                    releasePointer();
                }
            }
        }
        if (!running)
            break;
        if (dirty) {
            std::vector<SurfaceVertex> vertices;
            // snippet:sculpt-first-call
#if LAB_CHECKPOINT >= 1
            vertices = tetraSurface(corners, isovalue);
#endif
            // end-snippet:sculpt-first-call
            mesh.clear();
            if (!vertices.empty()) {
                MeshChunk chunk;
                const auto payload = vertices.size() * sizeof(SurfaceVertex);
                chunk.buffer = std::make_shared<GpuBuffer>(gl, budget, payload + guardBytes);
                chunk.buffer->setGuard(payload);
                chunk.buffer->write(0, std::as_bytes(std::span(vertices)));
                chunk.stats.vertices = static_cast<std::uint32_t>(vertices.size());
                mesh.push_back(std::move(chunk));
            }
            ++meshRevision;
            dirty = false;
        }
        if (now >= nextFrame) {
            int width{}, height{}, logicalWidth{}, logicalHeight{};
            SDL_GetWindowSizeInPixels(window.get(), &width, &height);
            SDL_GetWindowSize(window.get(), &logicalWidth, &logicalHeight);
            if (width <= 0 || height <= 0 || logicalWidth <= 0 || logicalHeight <= 0) {
                SDL_Delay(5);
                continue;
            }
            gl.Viewport(0, 0, width, height);
            gl.ClearColor(0.045F, 0.065F, 0.09F, 1);
            gl.Clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
            renderer.draw(mesh, camera, 0, 0, width, height, wireframe, false);
            const auto lines = tetraGuideLines(corners);
            guides.draw(camera, width, height, {}, GridSpec{16}, SliceState{}, lines, true);
            Overlay overlay;
            overlay.reset(logicalWidth, logicalHeight);
            std::string title = "STARTER / FOUR SCALARS, NO SURFACE YET";
            if (tetraExtractionEnabled)
                title = "CHECKPOINT 01 / ONE TETRA MAKES A SURFACE";
            overlay.text(24, 24, title, {0.55F, 0.95F, 0.85F}, 2, 1000);
            overlay.text(24, 50, "1..4 FLIP SAMPLE SIGN / LEFT-RIGHT CHANGE ISOVALUE", {0.7F, 0.83F, 0.9F}, 1.8F, 1050);
            overlay.text(24, 74, "DRAG ORBIT / WHEEL ZOOM / R RESET / F11 WIRE / Q EXIT", {0.7F, 0.83F, 0.9F}, 1.8F, 1100);
            std::size_t triangles = 0;
            if (!mesh.empty())
                triangles = mesh.front().stats.vertices / 3;
            overlay.text(24, 110, "TRIANGLES " + std::to_string(triangles) + " / MESH REVISION " + std::to_string(meshRevision), {0.8F, 0.9F, 0.9F}, 2, 1000);
            overlay.text(24, 132, "ISOVALUE " + std::to_string(isovalue), {0.8F, 0.9F, 0.9F}, 1.6F, 1000);
            for (std::size_t index = 0; index < corners.size(); ++index) {
                std::string value = "+1";
                Vec3 tint{0.3F, 0.65F, 1};
                if (corners[index].value < 0) {
                    value = "-1";
                    tint = {1, 0.4F, 0.25F};
                }
                overlay.text(24, 148 + static_cast<float>(index) * 22, "SAMPLE " + std::to_string(index + 1) + " = " + value, tint, 2, 300);
            }
            overlay.text(24, 246, "TETRA GUIDES ARE SEE-THROUGH", {0.55F, 0.7F, 0.78F}, 1.5F, 500);
            ui.draw(overlay, width, height);
            if (!options.capture.empty()) {
                captureFrame(gl, width, height, options.capture);
                captured = true;
                break;
            }
            SDL_GL_SwapWindow(window.get());
            nextFrame = now + std::chrono::milliseconds(16);
        }
        SDL_Delay(1);
    }
    releasePointer();
    if (!options.capture.empty() && !captured)
        throw std::runtime_error("Teaching preview stopped before its requested capture");
    std::cout << "P44 TETRA PREVIEW FINISHED extraction=" << tetraExtractionEnabled << " meshRevision=" << meshRevision << " triangles=";
    std::size_t triangles = 0;
    if (!mesh.empty())
        triangles = mesh.front().stats.vertices / 3;
    std::cout << triangles << " CPU topology; GPU presentation only\n";
    return 0;
}

} // namespace sculpt
