#pragma once
#include "program.hpp"
#include <array>
#include <cctype>
#include <cstddef>
#include <vector>

namespace volume54 {
struct Rect {
    float x;
    float y;
    float width;
    float height;

    bool contains(float px, float py) const {
        return px >= x && py >= y && px < x + width && py < y + height;
    }
};

struct Tint {
    float r;
    float g;
    float b;
    float a = 1;
};

constexpr Tint ink{0.86F, 0.92F, 0.94F};
constexpr Tint muted{0.48F, 0.65F, 0.71F};
constexpr Tint amber{1, 0.67F, 0.36F};
constexpr Tint teal{0.29F, 0.83F, 0.77F};

// Tiny original bitmap font: presentation scaffold, no font download or UI library.
inline std::array<unsigned char, 7> glyph(char character) {
    const char c = static_cast<char>(std::toupper(static_cast<unsigned char>(character)));
    switch (c) {
    case 'A':
        return {14, 17, 17, 31, 17, 17, 17};
    case 'B':
        return {30, 17, 17, 30, 17, 17, 30};
    case 'C':
        return {14, 17, 16, 16, 16, 17, 14};
    case 'D':
        return {30, 17, 17, 17, 17, 17, 30};
    case 'E':
        return {31, 16, 16, 30, 16, 16, 31};
    case 'F':
        return {31, 16, 16, 30, 16, 16, 16};
    case 'G':
        return {14, 17, 16, 23, 17, 17, 15};
    case 'H':
        return {17, 17, 17, 31, 17, 17, 17};
    case 'I':
        return {14, 4, 4, 4, 4, 4, 14};
    case 'J':
        return {7, 2, 2, 2, 18, 18, 12};
    case 'K':
        return {17, 18, 20, 24, 20, 18, 17};
    case 'L':
        return {16, 16, 16, 16, 16, 16, 31};
    case 'M':
        return {17, 27, 21, 21, 17, 17, 17};
    case 'N':
        return {17, 25, 21, 19, 17, 17, 17};
    case 'O':
        return {14, 17, 17, 17, 17, 17, 14};
    case 'P':
        return {30, 17, 17, 30, 16, 16, 16};
    case 'Q':
        return {14, 17, 17, 17, 21, 18, 13};
    case 'R':
        return {30, 17, 17, 30, 20, 18, 17};
    case 'S':
        return {15, 16, 16, 14, 1, 1, 30};
    case 'T':
        return {31, 4, 4, 4, 4, 4, 4};
    case 'U':
        return {17, 17, 17, 17, 17, 17, 14};
    case 'V':
        return {17, 17, 17, 17, 17, 10, 4};
    case 'W':
        return {17, 17, 17, 21, 21, 21, 10};
    case 'X':
        return {17, 17, 10, 4, 10, 17, 17};
    case 'Y':
        return {17, 17, 10, 4, 4, 4, 4};
    case 'Z':
        return {31, 1, 2, 4, 8, 16, 31};
    case '0':
        return {14, 17, 19, 21, 25, 17, 14};
    case '1':
        return {4, 12, 4, 4, 4, 4, 14};
    case '2':
        return {14, 17, 1, 2, 4, 8, 31};
    case '3':
        return {30, 1, 1, 14, 1, 1, 30};
    case '4':
        return {2, 6, 10, 18, 31, 2, 2};
    case '5':
        return {31, 16, 16, 30, 1, 1, 30};
    case '6':
        return {14, 16, 16, 30, 17, 17, 14};
    case '7':
        return {31, 1, 2, 4, 8, 8, 8};
    case '8':
        return {14, 17, 17, 14, 17, 17, 14};
    case '9':
        return {14, 17, 17, 15, 1, 1, 14};
    case '.':
        return {0, 0, 0, 0, 0, 6, 6};
    case ',':
        return {0, 0, 0, 0, 6, 4, 8};
    case ':':
        return {0, 6, 6, 0, 6, 6, 0};
    case '-':
        return {0, 0, 0, 31, 0, 0, 0};
    case '+':
        return {0, 4, 4, 31, 4, 4, 0};
    case '/':
        return {1, 2, 2, 4, 8, 8, 16};
    case '=':
        return {0, 0, 31, 0, 31, 0, 0};
    case '^':
        return {4, 10, 17, 0, 0, 0, 0};
    case '(':
        return {2, 4, 8, 8, 8, 4, 2};
    case ')':
        return {8, 4, 2, 2, 2, 4, 8};
    case '[':
        return {14, 8, 8, 8, 8, 8, 14};
    case ']':
        return {14, 2, 2, 2, 2, 2, 14};
    case '<':
        return {1, 2, 4, 8, 4, 2, 1};
    case '>':
        return {16, 8, 4, 2, 4, 8, 16};
    case '|':
        return {4, 4, 4, 4, 4, 4, 4};
    default:
        return {};
    }
}

class Overlay {
    struct Vertex {
        float x;
        float y;
        Tint color;
    };

    GlApi& gl_;
    GLuint program_ = 0;
    GLuint vao_ = 0;
    GLuint buffer_ = 0;
    std::vector<Vertex> vertices_;

    public:
    explicit Overlay(GlApi& gl)
        : gl_(gl) {}

    void open() {
        program_ = loadProgram(gl_, shaderDirectory(), "overlay.frag", "overlay.vert");
        gl_.GenVertexArrays(1, &vao_);
        gl_.GenBuffers(1, &buffer_);
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl_.EnableVertexAttribArray(0);
        gl_.VertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, sizeof(Vertex), nullptr);
        gl_.EnableVertexAttribArray(1);
        gl_.VertexAttribPointer(1, 4, GL_FLOAT, GL_FALSE, sizeof(Vertex), reinterpret_cast<void*>(offsetof(Vertex, color)));
    }

    void begin() {
        vertices_.clear();
    }

    void rectangle(Rect rect, Tint color) {
        const float x = rect.x;
        const float y = rect.y;
        const float right = x + rect.width;
        const float bottom = y + rect.height;
        vertices_.insert(vertices_.end(), {{x, y, color}, {right, y, color}, {right, bottom, color}, {x, y, color}, {right, bottom, color}, {x, bottom, color}});
    }

    void text(float x, float y, const std::string& text, Tint color = ink, float scale = 1.5F) {
        for (char character : text) {
            const auto rows = glyph(character);
            for (int row = 0; row < 7; ++row)
                for (int column = 0; column < 5; ++column)
                    if (rows[row] & (1 << (4 - column)))
                        rectangle({x + column * scale, y + row * scale, scale, scale}, color);
            x += 6 * scale;
        }
    }

    void line(float x1, float y1, float x2, float y2, Tint color, float thickness = 1) {
        const float length = std::hypot(x2 - x1, y2 - y1);
        if (length <= 0)
            return;
        const float dx = (y1 - y2) * thickness / (2 * length);
        const float dy = (x2 - x1) * thickness / (2 * length);
        vertices_.insert(vertices_.end(), {{x1 + dx, y1 + dy, color}, {x2 + dx, y2 + dy, color}, {x2 - dx, y2 - dy, color}, {x1 + dx, y1 + dy, color}, {x2 - dx, y2 - dy, color}, {x1 - dx, y1 - dy, color}});
    }

    void draw(int logicalWidth, int logicalHeight, int pixelWidth, int pixelHeight) {
        if (vertices_.size() > 500000)
            throw std::runtime_error("Overlay geometry budget exceeded");
        gl_.BindFramebuffer(GL_FRAMEBUFFER, 0);
        gl_.Viewport(0, 0, pixelWidth, pixelHeight);
        gl_.Enable(GL_BLEND);
        gl_.BlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
        gl_.UseProgram(program_);
        gl_.Uniform2f(uniform(gl_, program_, "uViewport"), static_cast<float>(logicalWidth), static_cast<float>(logicalHeight));
        gl_.BindVertexArray(vao_);
        gl_.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl_.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices_.size() * sizeof(Vertex)), vertices_.data(), GL_STREAM_DRAW);
        gl_.DrawArrays(GL_TRIANGLES, 0, static_cast<GLsizei>(vertices_.size()));
        gl_.Disable(GL_BLEND);
    }

    ~Overlay() {
        if (buffer_)
            gl_.DeleteBuffers(1, &buffer_);
        if (vao_)
            gl_.DeleteVertexArrays(1, &vao_);
        if (program_)
            gl_.DeleteProgram(program_);
    }
};
} // namespace volume54
