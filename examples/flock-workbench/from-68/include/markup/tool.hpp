#pragma once
#include "paint.hpp"

namespace tiny {
inline lab::Key navKey(SDL_Keycode k) {
    if (k == SDLK_TAB)
        return lab::Key::Tab;
    if (k == SDLK_RETURN)
        return lab::Key::Enter;
    if (k == SDLK_SPACE)
        return lab::Key::Space;
    if (k == SDLK_LEFT)
        return lab::Key::Left;
    if (k == SDLK_RIGHT)
        return lab::Key::Right;
    if (k == SDLK_HOME)
        return lab::Key::Home;
    if (k == SDLK_END)
        return lab::Key::End;
    if (k == SDLK_ESCAPE)
        return lab::Key::Escape;
    return lab::Key::Other;
}

struct HtmlTool : Desk {
    std::filesystem::path assets;
    std::string file = "panel.html";
    std::string chapter = "04   /   The panel comes from a file";

    void load() {
        lab::cancel(ui);
        tiny::reload(*this, assets / file);
    }

    void start() {
#if LAB_CHECKPOINT >= 6801
        load();
#else
        status = "Original hand-built panel. Next: read panel.html.";
#endif
    }

    void render(SDL_Renderer* r) {
        drawDesk(r, *this, chapter);
        bench::text(r, 24, 69, "F5 reload   1/2 layouts   3 error   I inspector   [ ] node   Tab focus", {183, 203, 198, 255});
    }

    void down(lab::Point p) {
        if (!tiny::press(*this, p) && lab::contains({bench::mapX, bench::mapY, bench::mapW, bench::mapH}, p)) {
            model.colony.selectAt(bench::world(float(p.x), float(p.y)));
            ++model.scenePresses;
        }
    }

    void motion(lab::Point p) {
        tiny::move(*this, p);
    }

    void up(lab::Point p) {
        tiny::release(*this, p);
    }

    void resize(int w) {
        lab::setWidth(page.layout, ui, std::clamp(w / 3.0, 220.0, 420.0));
    }

    void keyboard(SDL_Keycode k, bool shift, bool repeat) {
#if LAB_CHECKPOINT >= 6801
        if (k == SDLK_F5 && !repeat) {
            load();
            return;
        }
#endif
#if LAB_CHECKPOINT >= 6805
        if (!repeat && (k == SDLK_1 || k == SDLK_2)) {
            file = "panel.html";
            if (k == SDLK_2)
                file = "survey.html";
            load();
            return;
        }
        if (k == SDLK_I && !repeat) {
            inspect = !inspect;
            return;
        }
        if (k == SDLK_RIGHTBRACKET) {
            ++observed;
            return;
        }
        if (k == SDLK_LEFTBRACKET && !page.handles.empty()) {
            observed = (observed + page.handles.size() - 1) % page.handles.size();
            return;
        }
#endif
#if LAB_CHECKPOINT >= 6806
        if (k == SDLK_3 && !repeat) {
            file = "broken.html";
            load();
            return;
        }
#endif
        if (tiny::key(*this, navKey(k), shift, repeat))
            return;
        if (k == SDLK_SPACE && !repeat)
            lab::setPaused(model, !model.paused);
        if (k == SDLK_N && !repeat && model.paused)
            lab::stepPhysics(model);
    }

    void choose(std::string_view take) {
        if (take == "survey")
            keyboard(SDLK_2, false, false);
        if (take == "bad")
            keyboard(SDLK_3, false, false);
        if (take == "inspector") {
            inspect = true;
            observed = 3;
        }
    }
};
} // namespace tiny
