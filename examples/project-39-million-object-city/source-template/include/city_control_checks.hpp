#pragma once

#include "city_application.hpp"

namespace city {

inline void Application::verifyControls() {
#if LAB_CHECKPOINT >= 12
    // Integration checks go through the same SDL event queue as normal input.
    // They do not claim that an operator has manually assessed mouse feel or layout.
    const auto require = [](bool condition, const char* description) {
        if (!condition) {
            throw std::runtime_error(description);
        }
    };
    const auto press = [&](SDL_Scancode code) {
        SDL_Event event{};
        event.type = SDL_EVENT_KEY_DOWN;
        event.key.scancode = code;
        event.key.repeat = false;
        require(SDL_PushEvent(&event), "Could not enqueue keyboard fixture");
        pumpEvents();
    };
    const Camera originalCamera = camera_;
    const std::size_t originalCount = objects_.size();
    const GLuint originalBuffer = gpu_.objectsBuffer();
    const bool originalCulling = culling_;

    press(SDL_SCANCODE_C);
    require(culling_ != originalCulling, "C did not toggle culling");
    press(SDL_SCANCODE_C);
    require(culling_ == originalCulling, "C did not restore culling");
    const float originalFov = camera_.fov;
    press(SDL_SCANCODE_LEFTBRACKET);
    require(camera_.fov < originalFov, "FOV keyboard input failed");
    press(SDL_SCANCODE_G);
    require(camera_.position.y == 2.5F, "Street preset failed");
    press(SDL_SCANCODE_H);
    require(camera_.position.y == Camera{}.position.y, "Overview preset failed");
    press(SDL_SCANCODE_P);
    require(tour_, "Auto-tour did not start");
    press(SDL_SCANCODE_SPACE);
    require(paused_, "Pause did not stop the auto-tour clock");
    press(SDL_SCANCODE_P);
    press(SDL_SCANCODE_SPACE);
    require(!tour_ && !paused_, "Tour controls did not restore stopped state");

    press(SDL_SCANCODE_TAB);
    require(debug_, "Debug did not enable its observer viewport");
    int logicalWidth{}, logicalHeight{};
    SDL_GetWindowSize(window_, &logicalWidth, &logicalHeight);
    SDL_Event click{};
    click.type = SDL_EVENT_MOUSE_BUTTON_DOWN;
    click.button.button = SDL_BUTTON_LEFT;
    click.button.x = (width_ - width_ / 6.0F - 12.0F) * logicalWidth / width_;
    click.button.y = (height_ / 6.0F + 12.0F) * logicalHeight / height_;
    require(SDL_PushEvent(&click), "Could not enqueue observer click fixture");
    pumpEvents();
    const Camera observer = observerCamera();
    require(length(pickOrigin_ - observer.position) < 0.001F, "Inset picking used the main camera origin");
    require(dot(pickRay_, observer.forward()) > 0.9999F, "Inset picking used the wrong local aspect/NDC");
    picking_ = false;
    renderFrame();
    std::string debugError{};
    if (!waitCityVerification(gl_, debugError)) {
        throw std::runtime_error(debugError);
    }
    require(gl_.GetError() == GL_NO_ERROR, "Debug inset/bounds rendering raised an OpenGL error");
    press(SDL_SCANCODE_TAB);

    press(SDL_SCANCODE_V);
    require(validation_.active(), "V did not begin the dedicated validation job");
    validation_.poll(gl_);
    press(SDL_SCANCODE_X);
    require(!validation_.active() && !validation_.passed(), "X converted a cancelled validation into PASS");
    press(SDL_SCANCODE_B);
    require(benchmark_.active, "B did not begin the bounded benchmark");
    press(SDL_SCANCODE_X);
    require(!benchmark_.active, "X did not cancel benchmark");

    press(SDL_SCANCODE_N);
    require(builder_.active && builder_.seed == seed_ + 1U, "N did not stage the next seed");
    updateScene();
    press(SDL_SCANCODE_X);
    require(gpu_.objectsBuffer() == originalBuffer && objects_.size() == originalCount, "Cancelling generation replaced the live scene");

    // Reproduce R/N during initial generation: no resident CPU records yet.
    std::vector<Object> resident{};
    resident.swap(objects_);
    builder_.begin(65'537U, 123U);
    press(SDL_SCANCODE_R);
    require(builder_.requested == 65'537U && builder_.seed == 123U, "R lost the pending initial count/seed");
    press(SDL_SCANCODE_N);
    require(builder_.requested == 65'537U && builder_.seed == 124U, "N replaced the initial scene with zero records");
    press(SDL_SCANCODE_X);
    objects_.swap(resident);

    std::string error{};
    Object invalid = objects_.front();
    invalid.centerRadius.w = std::numeric_limits<float>::quiet_NaN();
    const bool replaced = gpu_.rebuild(gl_, std::span<const Object>(&invalid, 1), error);
    require(!replaced && gpu_.objectsBuffer() == originalBuffer && gpu_.count() == originalCount, "Invalid candidate destroyed the last-good scene");
    camera_ = originalCamera;
    culling_ = originalCulling;
    selected_ = std::numeric_limits<std::uint32_t>::max();
    message_ = "Automated SDL event checks passed; manual mouse/layout review remains separate";
    std::cout << "SDL CONTROLS PASS toggle/FOV/street/overview/tour/pause/inset/validation/benchmark/cancel/initial-reset/last-good\n";
#endif
}

} // namespace city
