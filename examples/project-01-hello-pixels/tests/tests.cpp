#include "lab.hpp"
#include <algorithm>
#include <array>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}

void testMemoryAndBounds() {
    lab::Framebuffer framebuffer;
    check(framebuffer.resize(4, 3), "create 4 by 3");
    check(framebuffer.pixels.size() == 12, "4 by 3 owns 12 pixels");
    check(framebuffer.index(0, 0) == 0, "top-left index");
    check(framebuffer.index(3, 0) == 3, "last column in first row");
    check(framebuffer.index(0, 1) == 4, "next row advances by width");
    check(framebuffer.index(3, 2) == 11, "bottom-right index");

    const auto background = lab::rgba(11, 16, 32);
    const auto marker = lab::rgba(1, 2, 3, 4);
    framebuffer.clear(background);
    const auto before = framebuffer.pixels;
    framebuffer.putPixel(-1, 0, marker);
    framebuffer.putPixel(0, -1, marker);
    framebuffer.putPixel(4, 0, marker);
    framebuffer.putPixel(0, 3, marker);
    framebuffer.putPixel(INT_MIN, INT_MAX, marker);
    check(framebuffer.pixels == before, "outside writes do not change any element");

    framebuffer.putPixel(3, 2, marker);
    check(framebuffer.pixels[11] == marker, "last valid pixel receives all four channels");
    check(std::count(framebuffer.pixels.begin(), framebuffer.pixels.end(), marker) == 1, "one putPixel changes one element");

    const auto saved = framebuffer.pixels;
    check(!framebuffer.resize(0, 3), "reject zero width");
    check(!framebuffer.resize(4, -1), "reject negative height");
    check(!framebuffer.resize(INT_MAX, INT_MAX), "reject huge product before allocation");
    check(!framebuffer.resize(INT_MAX, 1), "reject width above memory budget");
    check(framebuffer.width == 4 && framebuffer.height == 3, "failed resize preserves dimensions");
    check(framebuffer.pixels == saved, "failed resize preserves pixels");

    for (int step = 1; step <= 100; ++step) {
        check(framebuffer.resize(step, 101 - step), "repeated resize succeeds");
        check(framebuffer.pixels.size() == static_cast<std::size_t>(step) * static_cast<std::size_t>(101 - step), "resize keeps exact storage size");
        framebuffer.putPixel(step - 1, 100 - step, marker);
        check(framebuffer.pixels.back() == marker, "last pixel remains addressable after resize");
    }
}

void testScenes() {
    lab::Framebuffer image;
    check(image.resize(3, 3), "create gradient image");
    image.clear(lab::rgba(83, 240, 174));
    check(std::all_of(image.pixels.begin(), image.pixels.end(), [](std::uint32_t color) {
        return color == lab::rgba(83, 240, 174);
    }), "solid covers every pixel");

    image.gradient();
    check(image.pixels[0] == lab::rgba(0, 0, 180), "gradient top-left");
    check(image.pixels[2] == lab::rgba(255, 0, 180), "gradient top-right");
    check(image.pixels[6] == lab::rgba(0, 255, 180), "gradient bottom-left");
    check(image.pixels[8] == lab::rgba(255, 255, 180), "gradient bottom-right");
    check(image.pixels[4] == lab::rgba(127, 127, 180), "gradient truncates midpoint like Canvas");

    check(image.resize(1, 1), "create one-pixel image");
    image.gradient();
    check(image.pixels[0] == lab::rgba(0, 0, 180), "1 by 1 avoids division by zero");
    check(image.resize(1, 3), "create one-column image");
    image.gradient();
    check(image.pixels.back() == lab::rgba(0, 255, 180), "one-column gradient");
    check(image.resize(3, 1), "create one-row image");
    image.gradient();
    check(image.pixels.back() == lab::rgba(255, 0, 180), "one-row gradient");

    check(image.resize(4, 4), "create checker image");
    image.checker(2);
    check(image.pixels[image.index(0, 0)] == image.pixels[image.index(1, 1)], "checker same cell");
    check(image.pixels[image.index(0, 0)] != image.pixels[image.index(2, 0)], "checker horizontal neighbor");
    check(image.pixels[image.index(0, 0)] == image.pixels[image.index(2, 2)], "checker diagonal neighbor");
    image.checker(0);
    check(image.pixels[0] != image.pixels[1], "zero cell is clamped to one");
    const auto clamped = image.pixels;
    image.checker(-7);
    check(image.pixels == clamped, "negative cell is clamped to one");

    check(image.resize(3, 2), "create noise image");
    image.noise(17);
    const std::array<std::uint8_t, 6> expected{{62, 210, 117, 76, 182, 85}};
    for (std::size_t index = 0; index < expected.size(); ++index) {
        const auto value = expected[index];
        check(image.pixels[index] == lab::rgba(value, static_cast<std::uint8_t>(value / 2), static_cast<std::uint8_t>(255 - value)), "noise matches independent seed-17 fixture");
    }
    const auto seed17 = image.pixels;
    image.noise(17);
    check(image.pixels == seed17, "equal seed reproduces every pixel");
    image.noise(18);
    check(image.pixels != seed17, "different seed changes pixels");
}
} // namespace

int main() {
    // static_assert kiểm bit packing; check không bị tắt ở bản Release.
    static_assert(lab::rgba(255, 0, 0) == 0xFF0000FFu);
    static_assert(lab::rgba(1, 2, 3, 4) == 0x01020304u);
    static_assert(lab::rgba(0, 0, 0, 0) == 0u);
    static_assert(lab::rgba(255, 255, 255, 255) == 0xFFFFFFFFu);

    testMemoryAndBounds();
    testScenes();

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 01 validation checks passed\n";
    return EXIT_SUCCESS;
}
