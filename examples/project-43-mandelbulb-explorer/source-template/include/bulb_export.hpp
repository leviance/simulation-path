#pragma once
#include "bulb_app.hpp"
#include <filesystem>

namespace bulb {

#if LAB_CHECKPOINT >= 9
inline void exportImage(App& app, const std::filesystem::path& path) {
    if (!app.idle() || !app.plan().active() || app.plan().active()->settings.slice || std::filesystem::exists(path))
        throw std::invalid_argument("Export needs a complete 3D image and a new output path");
    const auto generation = app.plan().active()->generation;
    const int samples = app.plan().active()->settings.samples;
    std::vector<std::uint8_t> rgba(static_cast<std::size_t>(imageWidth) * imageHeight * 4);
    const auto deadline = std::chrono::steady_clock::now() + std::chrono::seconds(5);
    for (std::size_t first = 0; first < static_cast<std::size_t>(imageWidth) * imageHeight; first += 4096) {
        if (std::chrono::steady_clock::now() > deadline)
            throw std::runtime_error("Image export deadline");
        const auto count = std::min<std::size_t>(4096, static_cast<std::size_t>(imageWidth) * imageHeight - first);
        const auto pixels = app.gpu().readPixels(first, count);
        for (std::size_t index = 0; index < count; ++index) {
            const auto& pixel = pixels[index];
            if (pixel.work.w != generation || pixel.color.w != static_cast<float>(samples))
                throw std::runtime_error("Cannot export incomplete or mixed-generation image");
            const std::array<float, 3> channels{pixel.color.x, pixel.color.y, pixel.color.z};
            for (int channel = 0; channel < 3; ++channel) {
                const float linear = channels[channel] / pixel.color.w;
                if (!std::isfinite(linear) || linear < 0)
                    throw std::runtime_error("Non-finite output color");
                const double encoded = std::pow(linear / (1 + linear), 1.0 / 2.2);
                rgba[(first + index) * 4 + channel] = static_cast<std::uint8_t>(std::clamp(encoded * 255.0, 0.0, 255.0));
            }
            rgba[(first + index) * 4 + 3] = 255;
        }
    }
    SDL_Surface* surface = SDL_CreateSurfaceFrom(imageWidth, imageHeight, SDL_PIXELFORMAT_RGBA32, rgba.data(), imageWidth * 4);
    if (!surface)
        throw std::runtime_error(SDL_GetError());
    const auto encoded = path.u8string();
    const std::string name(encoded.begin(), encoded.end());
    const bool saved = SDL_SaveBMP(surface, name.c_str());
    SDL_DestroySurface(surface);
    if (!saved)
        throw std::runtime_error(SDL_GetError());
}
#endif

} // namespace bulb
