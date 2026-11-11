#pragma once

#include "morph_ui_geometry.hpp"

namespace morph {

// Supplied 5 x 7 UI font. These bit rows describe glyphs, not any part of the geometry lesson.
inline std::array<unsigned, 7> panelGlyph(char character) {
    static constexpr std::array<std::array<unsigned, 7>, 36> glyphs{{
        {14, 17, 17, 31, 17, 17, 17},
        {30, 17, 17, 30, 17, 17, 30},
        {14, 17, 16, 16, 16, 17, 14},
        {30, 17, 17, 17, 17, 17, 30},
        {31, 16, 16, 30, 16, 16, 31},
        {31, 16, 16, 30, 16, 16, 16},
        {14, 17, 16, 23, 17, 17, 14},
        {17, 17, 17, 31, 17, 17, 17},
        {14, 4, 4, 4, 4, 4, 14},
        {7, 2, 2, 2, 18, 18, 12},
        {17, 18, 20, 24, 20, 18, 17},
        {16, 16, 16, 16, 16, 16, 31},
        {17, 27, 21, 21, 17, 17, 17},
        {17, 25, 21, 19, 17, 17, 17},
        {14, 17, 17, 17, 17, 17, 14},
        {30, 17, 17, 30, 16, 16, 16},
        {14, 17, 17, 17, 21, 18, 13},
        {30, 17, 17, 30, 20, 18, 17},
        {15, 16, 16, 14, 1, 1, 30},
        {31, 4, 4, 4, 4, 4, 4},
        {17, 17, 17, 17, 17, 17, 14},
        {17, 17, 17, 17, 17, 10, 4},
        {17, 17, 17, 21, 21, 21, 10},
        {17, 17, 10, 4, 10, 17, 17},
        {17, 17, 10, 4, 4, 4, 4},
        {31, 1, 2, 4, 8, 16, 31},
        {14, 17, 19, 21, 25, 17, 14},
        {4, 12, 4, 4, 4, 4, 14},
        {14, 17, 1, 2, 4, 8, 31},
        {30, 1, 1, 14, 1, 1, 30},
        {2, 6, 10, 18, 31, 2, 2},
        {31, 16, 16, 30, 1, 1, 30},
        {14, 16, 16, 30, 17, 17, 14},
        {31, 1, 2, 4, 8, 8, 8},
        {14, 17, 17, 14, 17, 17, 14},
        {14, 17, 17, 15, 1, 1, 14},
    }};
    if (character >= 'a' && character <= 'z')
        character = static_cast<char>(character - 'a' + 'A');
    if (character >= 'A' && character <= 'Z')
        return glyphs[character - 'A'];
    if (character >= '0' && character <= '9')
        return glyphs[26 + character - '0'];
    switch (character) {
    case '-':
        return {0, 0, 0, 31, 0, 0, 0};
    case '+':
        return {0, 4, 4, 31, 4, 4, 0};
    case '.':
        return {0, 0, 0, 0, 0, 0, 4};
    case ',':
        return {0, 0, 0, 0, 0, 4, 8};
    case ':':
        return {0, 0, 4, 0, 4, 0, 0};
    case '/':
        return {1, 2, 2, 4, 8, 8, 16};
    case '[':
        return {14, 8, 8, 8, 8, 8, 14};
    case ']':
        return {14, 2, 2, 2, 2, 2, 14};
    case '%':
        return {24, 25, 2, 4, 8, 19, 3};
    default:
        return {};
    }
}

class Overlay {
    public:
    void reset(int width, int height) {
        width_ = static_cast<float>(width);
        height_ = static_cast<float>(height);
        vertices_.clear();
    }

    void rect(const UiRect &box, Vec3 color) {
        const float left = 2.0F * box.x / width_ - 1.0F;
        const float right = 2.0F * (box.x + box.width) / width_ - 1.0F;
        const float top = 1.0F - 2.0F * box.y / height_;
        const float bottom = 1.0F - 2.0F * (box.y + box.height) / height_;
        const auto tint = colorArray(color);
        vertices_.push_back({{left, top, 0}, tint});
        vertices_.push_back({{left, bottom, 0}, tint});
        vertices_.push_back({{right, top, 0}, tint});
        vertices_.push_back({{right, top, 0}, tint});
        vertices_.push_back({{left, bottom, 0}, tint});
        vertices_.push_back({{right, bottom, 0}, tint});
    }

    void text(float x, float y, std::string_view value, Vec3 color, float scale, float maxWidth) {
        const float end = x + maxWidth;
        for (char character : value) {
            if (x + 5.0F * scale > end)
                break;
            const auto glyph = panelGlyph(character);
            for (int row = 0; row < 7; ++row) {
                for (int column = 0; column < 5; ++column) {
                    if (glyph[row] & (16U >> column)) {
                        rect({x + static_cast<float>(column) * scale, y + static_cast<float>(row) * scale, scale, scale}, color);
                    }
                }
            }
            x += 6.0F * scale;
        }
    }

    const std::vector<LineVertex> &vertices() const {
        return vertices_;
    }

    private:
    float width_{};
    float height_{};
    std::vector<LineVertex> vertices_;
};

} // namespace morph
