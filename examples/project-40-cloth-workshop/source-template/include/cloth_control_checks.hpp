#pragma once

namespace cloth {

// Exercise the real SDL event path and asynchronous GL state. This is distinct from human usability QA.
inline int Application::exerciseControls() {
#if LAB_CHECKPOINT >= 13
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(35);
    std::uint32_t checks{};
    const auto check = [&](bool condition, const std::string& label) {
        if (!condition) {
            throw std::runtime_error("Native controls: " + label);
        }
        ++checks;
    };
    const auto pushKey = [&](SDL_Scancode code) {
        SDL_Event event{};
        event.type = SDL_EVENT_KEY_DOWN;
        event.key.scancode = code;
        if (!SDL_PushEvent(&event)) {
            throw std::runtime_error(SDL_GetError());
        }
    };
    const auto pump = [&]() {
        if (std::chrono::steady_clock::now() >= deadline) {
            throw std::runtime_error("Native controls exceeded the 35-second deadline");
        }
        events();
        std::string error{};
        if (!gpu_->poll(error)) {
            throw std::runtime_error(error);
        }
        pollPick();
        processRequests();
        pollJobs();
        pollDebug();
        if (ui_.singleStep && !gpu_->busy() && !ui_.resetRequested && !jobActive()) {
            advance();
            ui_.singleStep = false;
        }
        render();
        SDL_GL_SwapWindow(window_);
        SDL_Delay(1U);
    };
    const auto until = [&](const auto& predicate) {
        do {
            pump();
        } while (!predicate());
    };

    releaseInput();
    SDL_FlushEvents(SDL_EVENT_FIRST, SDL_EVENT_LAST);
    ui_.settings = {};
    ui_.settings.side = 17U;
    ui_.settings.preset = Preset::SphereDrape;
    ui_.requested = ui_.settings;
    ui_.paused = true;
    std::string error{};
    check(gpu_->reset(ui_.settings, error), "small scene reset: " + error);
    framePreset();
    const auto initialSteps = gpu_->stats().steps;
    const float originalYaw = ui_.camera.yaw;
    pushKey(SDL_SCANCODE_LEFT);
    pump();
    check(ui_.camera.yaw != originalYaw && gpu_->stats().steps == initialSteps, "camera remains usable while paused");
    const float originalDistance = ui_.camera.distance;
    pushKey(SDL_SCANCODE_Q);
    pump();
    check(ui_.camera.distance != originalDistance, "keyboard zoom changes the camera");

    const std::uint32_t selected = 8U * 17U + 8U;
    pickKind_ = PickKind::Probe;
    picker_.request(gl_, gpu_->positionBuffer(), 289U, ui_.camera, sceneWidth_, height_, 0.0F, 0.0F, selected);
    until([&]() {
        return ui_.selected == selected && !picker_.busy();
    });
    check(probe_.position.w > 0.0F, "exact GPU ID probe reads a dynamic vertex");
    pickKind_ = PickKind::Probe;
    requestedProbeStep_ = gpu_->stats().steps;
    picker_.request(gl_, gpu_->positionBuffer(), 289U, ui_.camera, sceneWidth_, height_, 0.0F, 0.0F, selected);
    check(picker_.busy(), "pending-probe fixture has an unconsumed GPU fence");
    pushKey(SDL_SCANCODE_P);
    events();
    check(input_.pinId == noVertex && input_.pinAction == -1 && picker_.busy(), "P cannot stage a pin while an older mass probe is still pending");
    until([&]() {
        return !picker_.busy() && !probeDirty_;
    });
    pushKey(SDL_SCANCODE_P);
    events();
    check(input_.pinId == selected && input_.pinAction == 1 && gpu_->stats().steps == initialSteps, "pin edit is staged, not applied while paused");
    SDL_Event focus{};
    focus.type = SDL_EVENT_WINDOW_FOCUS_LOST;
    SDL_PushEvent(&focus);
    pump();
    check(input_.pinId == noVertex && !input_.dragging, "focus loss clears staged pin and drag");

    pushKey(SDL_SCANCODE_P);
    pushKey(SDL_SCANCODE_N);
    until([&]() {
        return gpu_->stats().steps == initialSteps + 1U && !probeDirty_ && !picker_.busy();
    });
    check(probe_.position.w == 0.0F && ui_.paused, "Step applies the pin once and refreshes its GPU mass probe");
    pushKey(SDL_SCANCODE_P);
    pushKey(SDL_SCANCODE_N);
    until([&]() {
        return gpu_->stats().steps == initialSteps + 2U && !probeDirty_ && !picker_.busy();
    });
    check(probe_.position.w > 0.0F, "a second P uses the refreshed mass and unpins");
    pump();
    check(gpu_->stats().steps == initialSteps + 2U, "single-step does not schedule an extra hidden step");

    ui_.tool = Tool::Drag;
    const auto point = projectPoint(xyz(probe_.position), ui_.camera.viewProjection(static_cast<float>(sceneWidth_) / height_), sceneWidth_, height_);
    check(point.visible, "drag target projects inside the scene viewport");
    int logicalWidth{}, logicalHeight{};
    SDL_GetWindowSize(window_, &logicalWidth, &logicalHeight);
    SDL_Event down{};
    down.type = SDL_EVENT_MOUSE_BUTTON_DOWN;
    down.button.button = SDL_BUTTON_LEFT;
    down.button.x = point.x * logicalWidth / width_;
    down.button.y = point.y * logicalHeight / height_;
    SDL_PushEvent(&down);
    events();
    if (!leftHeld_) {
        // Hidden windows are not foreground windows. Do not pretend their pushed events
        // proved OS capture or bypass the production failure handling to force this test green.
        check(!input_.dragging && !picker_.busy() && input_.pinId == noVertex, "unavailable OS mouse capture cancels picking/drag input safely");
        std::cout << "OS MOUSE CAPTURE UNVERIFIED: hidden fixture could not capture. "
                << "Visible-window drag, leave-window release, focus/capture loss need manual QA.\n";
    } else {
        until([&]() {
            return input_.dragging;
        });
        check(input_.dragId != noVertex, "mouse screen-picking begins a bounded region drag");
        SDL_Event motion{};
        motion.type = SDL_EVENT_MOUSE_MOTION;
        motion.motion.x = down.button.x + 80.0F;
        motion.motion.y = down.button.y;
        motion.motion.xrel = 80.0F;
        SDL_PushEvent(&motion);
        pump();
        check(length(input_.dragTarget - dragPlanePoint_) > 0.01F, "mouse movement changes the world-space drag target");
        SDL_Event up{};
        up.type = SDL_EVENT_MOUSE_BUTTON_UP;
        up.button.button = SDL_BUTTON_LEFT;
        SDL_PushEvent(&up);
        pump();
        check(!input_.dragging && !leftHeld_, "mouse release ends scripted drag input");
        std::cout << "SDL capture call succeeded in the fixture; pushed events still do not prove "
                << "real pointer capture outside a visible window. Manual QA remains separate.\n";
    }

    if (!ui_.cells) {
        pushKey(SDL_SCANCODE_C);
    }
    until([&]() {
        return debug_.getSnapshot().valid && !debug_.busy();
    });
    const auto oldDebugEpoch = debug_.getSnapshot().epoch;
    const auto pausedStep = gpu_->stats().steps;
    pushKey(SDL_SCANCODE_X);
    until([&]() {
        return debug_.getSnapshot().valid && debug_.getSnapshot().epoch > oldDebugEpoch && !debug_.busy();
    });
    check(ui_.paused && gpu_->stats().steps == pausedStep, "canceling while paused does not advance the simulation");
    check(debug_.getSnapshot().selected == ui_.selected, "enabled cell/contact debug revives from a new selected-ID epoch after cancel while paused");

    const GLuint retainedBuffer = gpu_->positionBuffer();
    const auto beforeRefusalEpoch = debug_.getSnapshot().epoch;
    ui_.requested = ui_.settings;
    ui_.requested.side = 1001U;
    ui_.resetRequested = true;
    until([&]() { return !ui_.resetRequested; });
    const auto refreshDeadline = std::chrono::steady_clock::now() + std::chrono::seconds(3);
    while ((!debug_.getSnapshot().valid || debug_.busy()) && std::chrono::steady_clock::now() < refreshDeadline) {
        pump();
    }
    check(gpu_->positionBuffer() == retainedBuffer && gpu_->stats().steps == pausedStep && ui_.settings.side == 17U,
        "refused resolution retains the same paused cloth without advancing a step");
    check(debug_.getSnapshot().valid && !debug_.busy() && debug_.getSnapshot().epoch > beforeRefusalEpoch,
        "cell/contact debug refreshes after a refused resolution while paused");

    pushKey(SDL_SCANCODE_V);
    pump();
    check(validation_.active(), "V starts a finite asynchronous validation job");
    pushKey(SDL_SCANCODE_X);
    pump();
    check(!validation_.active() && !validation_.passed(), "X cancels validation without reporting PASS");
    const GLuint originalBuffer = gpu_->positionBuffer();
    const auto originalStep = gpu_->stats().steps;
    pushKey(SDL_SCANCODE_B);
    pump();
    check(benchmark_.active(), "B starts a separate snapshot benchmark");
    pushKey(SDL_SCANCODE_X);
    pump();
    check(!benchmark_.active() && !benchmark_.passed() && gpu_->positionBuffer() == originalBuffer, "benchmark cancellation retains the original scene");
    pushKey(SDL_SCANCODE_B);
    until([&]() {
        return !benchmark_.active() && !ui_.benchmarkRequested;
    });
    check(benchmark_.passed() && gpu_->positionBuffer() == originalBuffer && gpu_->stats().steps == originalStep, "completed benchmark measured its shadow scene without advancing the original cloth");
    std::cout << benchmark_.message() << '\n';

    pushKey(SDL_SCANCODE_R);
    until([&]() {
        return !ui_.resetRequested && gpu_->stats().steps == 0U;
    });
    check(ui_.selected == noVertex && !input_.dragging && input_.pinId == noVertex && !debug_.getSnapshot().valid, "Reset clears input, selection, diagnostic epoch and old scene references");
    std::cout << "NATIVE SDL EVENT CHECKS PASS: " << checks
            << " assertions; real GPU picks/pin mass, pending-probe guard, paused input, camera, focus/reset, finite jobs.\n"
            << "This scripted event-path check does not replace visible-window OS capture or mouse-usability QA.\n";
    return EXIT_SUCCESS;
#else
    throw std::runtime_error("Native control checks require checkpoint 13 or final");
#endif
}

} // namespace cloth
