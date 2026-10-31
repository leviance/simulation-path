#pragma once
#include "chamber_renderer.hpp"
#include <cctype>
#include <cstdio>
#include <string_view>

namespace chamber {

// Supplied UI scaffold: one batched triangle draw, no font library or per-letter GL calls.
inline std::array<unsigned, 5> hudGlyph(char character) {
    switch (character) {
    case 'A':
        return {2, 5, 7, 5, 5};
    case 'B':
        return {6, 5, 6, 5, 6};
    case 'C':
        return {3, 4, 4, 4, 3};
    case 'D':
        return {6, 5, 5, 5, 6};
    case 'E':
        return {7, 4, 6, 4, 7};
    case 'F':
        return {7, 4, 6, 4, 4};
    case 'G':
        return {3, 4, 5, 5, 3};
    case 'H':
        return {5, 5, 7, 5, 5};
    case 'I':
        return {7, 2, 2, 2, 7};
    case 'J':
        return {1, 1, 1, 5, 2};
    case 'K':
        return {5, 5, 6, 5, 5};
    case 'L':
        return {4, 4, 4, 4, 7};
    case 'M':
        return {5, 7, 7, 5, 5};
    case 'N':
        return {5, 7, 7, 7, 5};
    case 'O':
        return {2, 5, 5, 5, 2};
    case 'P':
        return {6, 5, 6, 4, 4};
    case 'Q':
        return {2, 5, 5, 3, 1};
    case 'R':
        return {6, 5, 6, 5, 5};
    case 'S':
        return {3, 4, 2, 1, 6};
    case 'T':
        return {7, 2, 2, 2, 2};
    case 'U':
        return {5, 5, 5, 5, 7};
    case 'V':
        return {5, 5, 5, 5, 2};
    case 'W':
        return {5, 5, 7, 7, 5};
    case 'X':
        return {5, 5, 2, 5, 5};
    case 'Y':
        return {5, 5, 2, 2, 2};
    case 'Z':
        return {7, 1, 2, 4, 7};
    case '0':
        return {7, 5, 5, 5, 7};
    case '1':
        return {2, 6, 2, 2, 7};
    case '2':
        return {6, 1, 2, 4, 7};
    case '3':
        return {6, 1, 2, 1, 6};
    case '4':
        return {5, 5, 7, 1, 1};
    case '5':
        return {7, 4, 6, 1, 6};
    case '6':
        return {3, 4, 7, 5, 7};
    case '7':
        return {7, 1, 2, 2, 2};
    case '8':
        return {7, 5, 7, 5, 7};
    case '9':
        return {7, 5, 7, 1, 6};
    case '-':
        return {0, 0, 7, 0, 0};
    case '.':
        return {0, 0, 0, 0, 2};
    case ':':
        return {0, 2, 0, 2, 0};
    case '/':
        return {1, 1, 2, 4, 4};
    case '+':
        return {0, 2, 7, 2, 0};
    case '=':
        return {0, 7, 0, 7, 0};
    case '[':
        return {3, 2, 2, 2, 3};
    case ']':
        return {6, 2, 2, 2, 6};
    default:
        return {};
    }
}

struct Overlay {
    int width{}, height{};
    std::vector<DrawVertex> triangles{};

    void rectangle(float x, float y, float w, float h, Vec3 color) {
        const float left = 2.0F * x / width - 1.0F;
        const float right = 2.0F * (x + w) / width - 1.0F;
        const float top = 1.0F - 2.0F * y / height;
        const float bottom = 1.0F - 2.0F * (y + h) / height;
        for (Vec3 point : {Vec3{left, top, 0}, Vec3{left, bottom, 0}, Vec3{right, top, 0}, Vec3{right, top, 0}, Vec3{left, bottom, 0}, Vec3{right, bottom, 0}}) {
            triangles.push_back({point, color});
        }
    }

    void text(float x, float y, std::string_view value, Vec3 color, float scale = 2.0F) {
        const float startX = x;
        for (const char original : value) {
            if (original == '\n') {
                x = startX;
                y += 7.0F * scale;
                continue;
            }
            const char character = static_cast<char>(std::toupper(static_cast<unsigned char>(original)));
            const auto rows = hudGlyph(character);
            for (int row = 0; row < 5; ++row) {
                for (int column = 0; column < 3; ++column) {
                    if ((rows[row] & (4U >> column)) != 0U) {
                        rectangle(x + column * scale, y + row * scale, scale, scale, color);
                    }
                }
            }
            x += 4.0F * scale;
        }
    }

    void wrapped(float x, float& y, const std::string& message, Vec3 color, float scale, std::size_t columns = 42U) {
        std::size_t offset = 0;
        for (int line = 0; line < 4 && offset < message.size(); ++line) {
            const std::size_t count = std::min(columns, message.size() - offset);
            text(x, y, message.substr(offset, count), color, scale);
            offset += count;
            y += 7.0F * scale;
        }
    }

    void draw(GlApi& gl, SceneRenderer& renderer) {
        gl.Viewport(0, 0, width, height);
        gl.Disable(GL_DEPTH_TEST);
        renderer.drawVertices(gl, triangles, GL_TRIANGLES, identityMatrix());
        gl.Enable(GL_DEPTH_TEST);
        triangles.clear();
    }
};

} // namespace chamber
