#include "lab.hpp"
#include <algorithm>
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
} // namespace

int main() {
    // RGBA packing phải giữ đúng thứ tự byte mà streaming texture mong đợi.
    static_assert(lab::rgba(255, 0, 0) == 0xFF0000FFu);
    static_assert(lab::rgba(1, 2, 3, 4) == 0x01020304u);

    // Kiểm tra kích thước và row-major index của framebuffer nhỏ, dễ tính tay.
    lab::Framebuffer framebuffer{4, 3};
    check(framebuffer.width == 4, "framebuffer width is preserved");
    check(framebuffer.height == 3, "framebuffer height is preserved");
    check(framebuffer.pixels.size() == 12, "4 by 3 framebuffer owns 12 pixels");
    check(framebuffer.index(0, 0) == 0, "top-left index is zero");
    check(framebuffer.index(3, 0) == 3, "top-right index stays in the first row");
    check(framebuffer.index(0, 1) == 4, "next row advances by width");
    check(framebuffer.index(3, 2) == 11, "bottom-right index is the final element");

    // Ghi ngoài biên không được làm thay đổi bất kỳ pixel nào.
    const auto before = framebuffer.pixels;
    const auto red = lab::rgba(255, 0, 0);
    framebuffer.putPixel(-1, 0, red);
    framebuffer.putPixel(0, -1, red);
    framebuffer.putPixel(framebuffer.width, 0, red);
    framebuffer.putPixel(0, framebuffer.height, red);
    check(framebuffer.pixels == before, "out-of-bounds writes leave the framebuffer unchanged");

    // Ghi hợp lệ, resize và các pattern được kiểm tra tách thành từng nhóm.
    const auto sampleColor = lab::rgba(1, 2, 3, 4);
    framebuffer.putPixel(3, 2, sampleColor);
    check(framebuffer.pixels[11] == sampleColor, "valid putPixel writes the requested color");
    framebuffer.resize(8, 5);
    check(framebuffer.width == 8, "resize updates width");
    check(framebuffer.height == 5, "resize updates height");
    check(framebuffer.pixels.size() == 40, "resize updates storage size");
    lab::Framebuffer gradient{3, 3};
    gradient.gradient();
    check(gradient.pixels[gradient.index(0, 0)] == lab::rgba(0, 0, 180), "gradient starts at zero on both axes");
    check(gradient.pixels[gradient.index(2, 0)] == lab::rgba(255, 0, 180), "gradient reaches the red endpoint");
    check(gradient.pixels[gradient.index(0, 2)] == lab::rgba(0, 255, 180), "gradient reaches the green endpoint");
    check(gradient.pixels[gradient.index(2, 2)] == lab::rgba(255, 255, 180), "gradient reaches both endpoints");
    lab::Framebuffer singlePixel{1, 1};
    singlePixel.gradient();
    check(singlePixel.pixels.front() == lab::rgba(0, 0, 180), "single-pixel gradient avoids division by zero");
    lab::Framebuffer checker{4, 4};
    checker.checker(0);
    check(checker.pixels.size() == 16, "checker keeps framebuffer size");
    check(checker.pixels[checker.index(0, 0)] != checker.pixels[checker.index(1, 0)], "zero cell size is clamped to one");
    lab::Framebuffer noiseA{8, 8};
    lab::Framebuffer noiseB{8, 8};
    lab::Framebuffer noiseC{8, 8};
    noiseA.noise(17);
    noiseB.noise(17);
    noiseC.noise(18);
    check(noiseA.pixels == noiseB.pixels, "equal noise seeds reproduce the same pixels");
    check(noiseA.pixels != noiseC.pixels, "different noise seeds change the pixels");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 01 validation checks passed\n";
    return EXIT_SUCCESS;
}
