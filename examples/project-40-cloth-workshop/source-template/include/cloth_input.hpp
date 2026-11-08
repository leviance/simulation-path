#pragma once

// Member definitions are included after the Application declaration.
namespace cloth {

inline void Application::releaseInput() {
    leftHeld_ = rightHeld_ = middleHeld_ = false;
    input_.dragging = false;
    input_.dragId = noVertex;
    input_.pinId = noVertex;
    input_.pinAction = -1;
    pickKind_ = PickKind::None;
    if (loaded_) {
        picker_.cancel(gl_);
    }
    if (window_ != nullptr) {
        SDL_CaptureMouse(false);
    }
}

inline void Application::key(SDL_Scancode code, bool shift) {
    const auto command = [&](Command positive, Command negative) {
        if (shift) {
            applyCommand(ui_, negative);
        } else {
            applyCommand(ui_, positive);
        }
    };
    if (code == SDL_SCANCODE_ESCAPE) {
        running_ = false;
    }
    if (benchmark_.active() && code != SDL_SCANCODE_X && code != SDL_SCANCODE_ESCAPE) {
        ui_.message = "Benchmark uses a fixed camera/configuration. X cancels without changing the original cloth.";
        return;
    }
    if (code == SDL_SCANCODE_SPACE) {
        applyCommand(ui_, Command::Pause);
    }
    if (code == SDL_SCANCODE_N) {
        applyCommand(ui_, Command::Step);
    }
    if (code == SDL_SCANCODE_R) {
        applyCommand(ui_, Command::Reset);
    }
    if (code == SDL_SCANCODE_1) {
        applyCommand(ui_, Command::Hanging);
    }
    if (code == SDL_SCANCODE_2) {
        applyCommand(ui_, Command::Drape);
    }
    if (code == SDL_SCANCODE_3) {
        applyCommand(ui_, Command::Drop);
    }
    if (code == SDL_SCANCODE_4) {
        applyCommand(ui_, Command::Small);
    }
    if (code == SDL_SCANCODE_5) {
        applyCommand(ui_, Command::Medium);
    }
    if (code == SDL_SCANCODE_6) {
        applyCommand(ui_, Command::Large);
    }
    if (code == SDL_SCANCODE_7) {
        applyCommand(ui_, Command::Million);
    }
    if (code == SDL_SCANCODE_TAB) {
        ui_.tool = static_cast<Tool>((static_cast<int>(ui_.tool) + 1) % 3);
        releaseInput();
    }
    if (code == SDL_SCANCODE_W) {
        applyCommand(ui_, Command::Wire);
    }
    if (code == SDL_SCANCODE_S) {
        applyCommand(ui_, Command::Strain);
    }
    if (code == SDL_SCANCODE_C) {
        applyCommand(ui_, Command::Cells);
    }
    if (code == SDL_SCANCODE_G) {
        command(Command::GravityUp, Command::GravityDown);
    }
    if (code == SDL_SCANCODE_F) {
        command(Command::WindUp, Command::WindDown);
    }
    if (code == SDL_SCANCODE_K) {
        command(Command::ComplianceUp, Command::ComplianceDown);
    }
    if (code == SDL_SCANCODE_D) {
        command(Command::DampingUp, Command::DampingDown);
    }
    if (code == SDL_SCANCODE_J) {
        command(Command::FrictionUp, Command::FrictionDown);
    }
    if (code == SDL_SCANCODE_T) {
        command(Command::ThicknessUp, Command::ThicknessDown);
    }
    if (code == SDL_SCANCODE_LEFTBRACKET) {
        applyCommand(ui_, Command::SphereLeft);
    }
    if (code == SDL_SCANCODE_RIGHTBRACKET) {
        applyCommand(ui_, Command::SphereRight);
    }
    if (code == SDL_SCANCODE_PAGEUP) {
        applyCommand(ui_, Command::SphereUp);
    }
    if (code == SDL_SCANCODE_PAGEDOWN) {
        applyCommand(ui_, Command::SphereDown);
    }
    if (code == SDL_SCANCODE_HOME) {
        applyCommand(ui_, Command::SphereForward);
    }
    if (code == SDL_SCANCODE_END) {
        applyCommand(ui_, Command::SphereBack);
    }
    if (code == SDL_SCANCODE_COMMA) {
        applyCommand(ui_, Command::CapsuleLeft);
    }
    if (code == SDL_SCANCODE_PERIOD) {
        applyCommand(ui_, Command::CapsuleRight);
    }
    if (code == SDL_SCANCODE_V) {
        applyCommand(ui_, Command::Validate);
    }
    if (code == SDL_SCANCODE_B) {
        applyCommand(ui_, Command::Benchmark);
    }
    if (code == SDL_SCANCODE_X) {
        applyCommand(ui_, Command::Cancel);
    }
    if (code == SDL_SCANCODE_P && probe_.valid() && !probeDirty_ && !gpu_->busy() && !picker_.busy()) {
        input_.pinId = probe_.key[0];
        input_.pinAction = 1;
        if (probe_.position.w == 0.0F) {
            input_.pinAction = 0;
        }
        ui_.message = "Pin edit staged for the next simulation step";
    } else if (code == SDL_SCANCODE_P && (probeDirty_ || gpu_->busy() || picker_.busy())) {
        ui_.message = "Wait for the selected vertex probe before toggling pin again";
    }
    if (code == SDL_SCANCODE_LEFT) {
        ui_.camera.orbit(-10, 0);
    }
    if (code == SDL_SCANCODE_RIGHT) {
        ui_.camera.orbit(10, 0);
    }
    if (code == SDL_SCANCODE_UP) {
        ui_.camera.orbit(0, -10);
    }
    if (code == SDL_SCANCODE_DOWN) {
        ui_.camera.orbit(0, 10);
    }
    if (code == SDL_SCANCODE_Q) {
        ui_.camera.zoom(-1);
    }
    if (code == SDL_SCANCODE_E) {
        ui_.camera.zoom(1);
    }
}

inline void Application::events() {
    SDL_Event event{};
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_EVENT_QUIT) {
            running_ = false;
        }
        if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
            releaseInput();
            ui_.paused = true;
        }
        if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat) {
            key(event.key.scancode, (event.key.mod & SDL_KMOD_SHIFT) != 0);
        }
        if (event.type == SDL_EVENT_MOUSE_WHEEL && !benchmark_.active()) {
            ui_.camera.zoom(event.wheel.y);
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
            float x{}, y{};
            coordinates(event.button.x, event.button.y, x, y);
            if (x >= sceneWidth_) {
                panel_.hit(x, y, ui_, benchmark_.active());
                continue;
            }
            if (benchmark_.active()) {
                continue;
            }
            if (!SDL_CaptureMouse(true)) {
                const std::string reason = SDL_GetError();
                releaseInput();
                ui_.paused = true;
                ui_.message = "Mouse capture failed; input was canceled safely: " + reason;
                continue;
            }
            if (event.button.button == SDL_BUTTON_RIGHT) {
                rightHeld_ = true;
            }
            if (event.button.button == SDL_BUTTON_MIDDLE) {
                middleHeld_ = true;
            }
            if (event.button.button == SDL_BUTTON_LEFT) {
                leftHeld_ = true;
                if (ui_.tool != Tool::Camera) {
                    pickCamera_ = ui_.camera;
                    pickKind_ = PickKind::Drag;
                    if (ui_.tool == Tool::Pin) {
                        pickKind_ = PickKind::Pin;
                    }
                    requestedProbeStep_ = gpu_->stats().steps;
                    picker_.request(gl_, gpu_->positionBuffer(), ui_.settings.side * ui_.settings.side, ui_.camera, sceneWidth_, height_, 2.0F * x / sceneWidth_ - 1.0F, 1.0F - 2.0F * y / height_);
                }
            }
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
            if (event.button.button == SDL_BUTTON_LEFT) {
                leftHeld_ = false;
                input_.dragging = false;
            }
            if (event.button.button == SDL_BUTTON_RIGHT) {
                rightHeld_ = false;
            }
            if (event.button.button == SDL_BUTTON_MIDDLE) {
                middleHeld_ = false;
            }
            if (!leftHeld_ && !rightHeld_ && !middleHeld_) {
                SDL_CaptureMouse(false);
            }
        }
        if (event.type == SDL_EVENT_MOUSE_MOTION) {
            if (rightHeld_ || (leftHeld_ && ui_.tool == Tool::Camera)) {
                ui_.camera.orbit(event.motion.xrel, event.motion.yrel);
            }
            if (middleHeld_) {
                ui_.camera.pan(event.motion.xrel, event.motion.yrel);
            }
            if (input_.dragging && leftHeld_) {
                float x{}, y{};
                coordinates(event.motion.x, event.motion.y, x, y);
                const Vec3 ray = ui_.camera.ray(2.0F * x / sceneWidth_ - 1.0F, 1.0F - 2.0F * y / height_, static_cast<float>(sceneWidth_) / height_);
                const float denominator = dot(ray, dragPlaneNormal_);
                if (std::abs(denominator) > 0.001F) {
                    const float t = dot(dragPlanePoint_ - ui_.camera.eye(), dragPlaneNormal_) / denominator;
                    if (t > 0.0F) {
                        input_.dragTarget = ui_.camera.eye() + ray * t;
                    }
                }
            }
        }
    }
    if ((leftHeld_ || rightHeld_ || middleHeld_) && (SDL_GetWindowFlags(window_) & SDL_WINDOW_MOUSE_CAPTURE) == 0U) {
        // SDL clears this flag automatically on capture loss. Do not retain a ghost drag.
        releaseInput();
        ui_.paused = true;
        ui_.message = "Mouse capture was lost; staged input and dragging were canceled";
    }
}

inline void Application::coordinates(float logicalX, float logicalY, float& x, float& y) const {
    int logicalWidth{}, logicalHeight{};
    SDL_GetWindowSize(window_, &logicalWidth, &logicalHeight);
    x = logicalX * width_ / std::max(logicalWidth, 1);
    y = logicalY * height_ / std::max(logicalHeight, 1);
}

inline void Application::pollPick() {
    std::string error{};
    if (picker_.poll(gl_, probe_, error) && probe_.valid()) {
        ui_.selected = probe_.key[0];
        probeStep_ = requestedProbeStep_;
        probeDirty_ = false;
        debugStep_ = noVertex;
        if (pickKind_ == PickKind::Pin) {
            input_.pinId = ui_.selected;
            input_.pinAction = 1;
            if (probe_.position.w == 0.0F) {
                input_.pinAction = 0;
            }
            ui_.message = "Pin edit staged; Pause leaves positions unchanged until Step";
        } else if (pickKind_ == PickKind::Drag && leftHeld_) {
            input_.dragId = ui_.selected;
            input_.dragTarget = xyz(probe_.position);
            input_.dragging = true;
            dragPlanePoint_ = input_.dragTarget;
            dragPlaneNormal_ = pickCamera_.forward();
            ui_.message = "Dragging a 5x5 vertex region; target displacement is bounded per substep";
        }
        pickKind_ = PickKind::None;
    }
    if (!error.empty()) {
        ui_.message = error;
    }
    if (!gpu_->busy() && !picker_.busy() && input_.pinId == noVertex && ui_.selected != noVertex && !jobActive() && (probeDirty_ || gpu_->stats().steps >= probeStep_ + 10U)) {
        pickKind_ = PickKind::Probe;
        requestedProbeStep_ = gpu_->stats().steps;
        picker_.request(gl_, gpu_->positionBuffer(), ui_.settings.side * ui_.settings.side, ui_.camera, sceneWidth_, height_, 0.0F, 0.0F, ui_.selected);
    }
}

} // namespace cloth
