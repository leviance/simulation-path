#pragma once
#include "render/water.hpp"
#include <iomanip>
#include <sstream>

namespace water51 {
// Draw on a separate software surface, not an SDL_Renderer attached to the GL window.

struct Controls {
    bool paused = true;
    bool step = false;
    bool reset = false;
    bool apply = false;
    bool stir = false;
    bool benchmark = false;
    int requestedSide = 48;
    Preset preset = Preset::Dam;
    View view = View::Water;
    std::string error;
};

class Panel {
    Gl& gl_;
    Program program_;
    SDL_Surface* surface_ = nullptr;
    SDL_Renderer* renderer_ = nullptr;
    GLuint texture_ = 0;
    GLuint vao_ = 0;

    void text(int x, int y, const std::string& text, int r = 189, int g = 207, int b = 222) {
        SDL_SetRenderDrawColor(renderer_, static_cast<Uint8>(r), static_cast<Uint8>(g), static_cast<Uint8>(b), 255);
        SDL_RenderDebugText(renderer_, static_cast<float>(x), static_cast<float>(y), text.c_str());
    }

    void box(int x, int y, int w, int h, bool active = false) {
        SDL_SetRenderDrawColor(renderer_, 29, 46, 62, 255);
        if (active)
            SDL_SetRenderDrawColor(renderer_, 22, 91, 117, 255);
        const SDL_FRect rect{static_cast<float>(x), static_cast<float>(y), static_cast<float>(w), static_cast<float>(h)};
        SDL_RenderFillRect(renderer_, &rect);
    }

    static std::string number(double x, int precision = 2) {
        std::ostringstream out;
        out << std::fixed << std::setprecision(precision) << x;
        return out.str();
    }

    public:
    static constexpr int width = 320;
    static constexpr int height = 800;

    Panel(Gl& gl, const std::filesystem::path& root)
        : gl_(gl), program_(gl, root, {{GL_VERTEX_SHADER, "water/fullscreen.vert"}, {GL_FRAGMENT_SHADER, "water/panel.frag"}}) {
        surface_ = SDL_CreateSurface(width, height, SDL_PIXELFORMAT_RGBA32);
        if (!surface_)
            throw std::runtime_error(SDL_GetError());
        renderer_ = SDL_CreateSoftwareRenderer(surface_);
        if (!renderer_) {
            SDL_DestroySurface(surface_);
            throw std::runtime_error(SDL_GetError());
        }
        gl_.GenTextures(1, &texture_);
        gl_.BindTexture(GL_TEXTURE_2D, texture_);
        gl_.TexImage2D(GL_TEXTURE_2D, 0, GL_RGBA8, width, height, 0, GL_RGBA, GL_UNSIGNED_BYTE, nullptr);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
        gl_.TexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
        gl_.GenVertexArrays(1, &vao_);
    }

    ~Panel() {
        gl_.DeleteTextures(1, &texture_);
        gl_.DeleteVertexArrays(1, &vao_);
        SDL_DestroyRenderer(renderer_);
        SDL_DestroySurface(surface_);
    }

    void click(int x, int y, Controls& c, Parameters& p, const Model& model) {
        if (x < 12 || x > 308)
            return;
        if (y >= 72 && y < 106 && lessonStage >= 5) {
            if (x < 160)
                c.paused = !c.paused;
            else {
                c.paused = true;
                c.step = true;
            }
        }
        if (y >= 114 && y < 148) {
            c.reset = true;
            c.paused = true;
        }
        if (y >= 158 && y < 192) {
            int preset = static_cast<int>(c.preset) + 1;
            if (preset > 2)
                preset = 0;
            c.preset = static_cast<Preset>(preset);
        }
        if (y >= 202 && y < 236) {
            const int sides[]{8, 32, 48, 80, 100};
            int next = 8;
            for (int side : sides)
                if (side > c.requestedSide) {
                    next = side;
                    break;
                }
            c.requestedSide = next;
        }
        if (y >= 242 && y < 276) {
            c.apply = true;
            c.paused = true;
        }
        if (y >= 286 && y < 320) {
            int mode = static_cast<int>(c.view) + 1;
            if (mode > 3)
                mode = 0;
#if LAB_CHECKPOINT < 8
            if (mode == 0)
                mode = 1;
#endif
            c.view = static_cast<View>(mode);
        }
        if (y >= 330 && y < 364 && model.preset == Preset::Obstacle)
            c.stir = !c.stir;
        const float t = std::clamp((x - 16) / 288.0f, 0.0f, 1.0f);
        if (y >= 402 && y < 430)
            p.soundSpeed = 10 + 30 * t;
        if (y >= 448 && y < 476)
            p.alpha = t;
        if (y >= 494 && y < 522)
            p.gravity = 20 * t;
    }

    // [snippet controls-panel]
    void draw(const Engine& engine, const Controls& c, int x, int outputHeight, double renderMs) {
        SDL_SetRenderDrawColor(renderer_, 13, 24, 37, 255);
        SDL_RenderClear(renderer_);
        text(16, 18, "SPH / WATER 3D", 224, 244, 255);
        text(16, 42, "Project 51 - GPU compute", 83, 173, 202);
        box(12, 72, 140, 34, !c.paused);
        box(164, 72, 144, 34);
        text(24, 85, "SPACE Play/Pause");
        text(178, 85, "ENTER Step");
        box(12, 114, 296, 34);
        text(24, 127, "R Reset current scene");
        const char* presets[]{"Dam break", "Pool", "Moving obstacle"};
        box(12, 158, 296, 34);
        text(24, 171, std::string("Preset: ") + presets[static_cast<int>(c.preset)]);
        box(12, 202, 296, 34);
        text(24, 215, "Requested N: " + std::to_string(c.requestedSide * c.requestedSide * c.requestedSide));
        box(12, 242, 296, 34);
        text(24, 255, "A Apply preset / N (paused)");
        const char* views[]{"WATER SURFACE", "PARTICLES", "DENSITY", "SPEED"};
        box(12, 286, 296, 34);
        text(24, 299, std::string("M View: ") + views[static_cast<int>(c.view)]);
        box(12, 330, 296, 34, c.stir);
        std::string tool = "O Tool: Orbit";
        if (c.stir)
            tool = "T Tool: Move obstacle";
        text(24, 343, tool);
        text(16, 382, "Click each parameter bar:");
        text(16, 402, "c = " + number(engine.parameters.soundSpeed, 1) + " m/s");
        box(16, 420, static_cast<int>(288 * (engine.parameters.soundSpeed - 10) / 30), 6, true);
        text(16, 448, "alpha = " + number(engine.parameters.alpha));
        box(16, 466, static_cast<int>(288 * engine.parameters.alpha), 6, true);
        text(16, 494, "g = " + number(engine.parameters.gravity) + " m/s2");
        box(16, 512, static_cast<int>(288 * engine.parameters.gravity / 20), 6, true);
        text(16, 542, "Allocated / alive / drawn:");
        text(16, 560, std::to_string(engine.model().count) + " / " + std::to_string(engine.model().count) + " / " + std::to_string(engine.model().count));
        text(16, 582, "Updated: " + std::to_string(engine.meta().updated) + " | leaks: " + std::to_string(engine.meta().leakage));
        text(16, 604, "Model t: " + number(engine.modelTime, 3) + " s  dt: " + number(engine.meta().dt * 1000, 3) + " ms");
        text(16, 624, "GPU batch: " + number(engine.timing.total) + " | draw: " + number(renderMs) + " ms");
        int row = 646;
        for (std::size_t i = 0; i < 5; ++i) {
            text(16, row, std::string(phaseNames[i]) + ": " + number(engine.timing.milliseconds[i]) + " ms");
            row += 16;
        }
        text(16, 724, "rho min/max: " + number(engine.meta().minimumDensity, 0) + " / " + number(engine.meta().maximumDensity, 0) + " kg/m3");
        text(16, 736, "Drag tool | wheel zoom | B bench");
        text(16, 754, "Arrows orbit | +/- zoom | ESC stop");
        if (engine.pending())
            text(16, 778, "GPU batch pending", 240, 192, 87);
        if (!c.error.empty())
            text(16, 778, c.error.substr(0, 36), 255, 108, 104);
        SDL_RenderPresent(renderer_);
        gl_.ActiveTexture(GL_TEXTURE0);
        gl_.BindTexture(GL_TEXTURE_2D, texture_);
        gl_.PixelStorei(GL_UNPACK_ALIGNMENT, 4);
        gl_.TexSubImage2D(GL_TEXTURE_2D, 0, 0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, surface_->pixels);
        gl_.Viewport(x, 0, width, outputHeight);
        gl_.BindVertexArray(vao_);
        program_.use();
        program_.setInt("image", 0);
        program_.setVec2("viewport", width, static_cast<float>(outputHeight));
        program_.setFloat("originX", static_cast<float>(x));
        gl_.DrawArrays(GL_TRIANGLES, 0, 3);
    }

    // [/snippet controls-panel]
};
} // namespace water51
