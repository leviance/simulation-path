#pragma once
#include "program.hpp"
#include "ui-font.hpp"
#include "ui-layout.hpp"
#include <cstddef>
#include <string_view>

namespace water3 {
using UiColor = std::array<float, 3>;

struct UiVertex {
    std::array<float, 2> position;
    UiColor color;
};

class Overlay {
    public:
    void load(lab::GlApi& gl, const std::string& directory) {
        program_ = loadProgram(gl, directory, {{GL_VERTEX_SHADER, "ui.vert"}, {GL_FRAGMENT_SHADER, "ui.frag"}});
        gl.GenVertexArrays(1, &vao_);
        gl.GenBuffers(1, &buffer_);
        if (!vao_ || !buffer_)
            throw std::runtime_error("Cannot create UI resources");
        gl.BindVertexArray(vao_);
        gl.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl.EnableVertexAttribArray(0);
        gl.VertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, static_cast<GLsizei>(sizeof(UiVertex)), nullptr);
        gl.EnableVertexAttribArray(1);
        gl.VertexAttribPointer(1, 3, GL_FLOAT, GL_FALSE, static_cast<GLsizei>(sizeof(UiVertex)), reinterpret_cast<const void*>(offsetof(UiVertex, color)));
        gl.BindVertexArray(0);
        vertices_.reserve(120000);
    }

    void reset(int width, int height) {
        width_ = static_cast<float>(std::max(1, width));
        height_ = static_cast<float>(std::max(1, height));
        vertices_.clear();
    }

    void rect(UiRect box, UiColor color) {
        const float left = 2 * box.x / width_ - 1;
        const float right = 2 * (box.x + box.width) / width_ - 1;
        const float top = 1 - 2 * box.y / height_;
        const float bottom = 1 - 2 * (box.y + box.height) / height_;
        vertices_.push_back({{left, top}, color});
        vertices_.push_back({{left, bottom}, color});
        vertices_.push_back({{right, top}, color});
        vertices_.push_back({{right, top}, color});
        vertices_.push_back({{left, bottom}, color});
        vertices_.push_back({{right, bottom}, color});
    }

    void text(float x, float y, std::string_view value, UiColor color, float scale = 1.3F, float maxWidth = 280) {
        const float end = x + maxWidth;
        for (const char c : value) {
            if (x + 5 * scale > end)
                break;
            const auto glyph = uiGlyph(c);
            for (int row = 0; row < 7; ++row) {
                for (int column = 0; column < 5; ++column) {
                    if (glyph[row] & (16U >> column))
                        rect({x + static_cast<float>(column) * scale, y + static_cast<float>(row) * scale, scale, scale}, color);
                }
            }
            x += 6 * scale;
        }
    }

    void draw(lab::GlApi& gl) {
        if (vertices_.size() > 500000)
            throw std::runtime_error("UI vertex budget exceeded");
        gl.Disable(GL_DEPTH_TEST);
        gl.UseProgram(program_);
        gl.BindVertexArray(vao_);
        gl.BindBuffer(GL_ARRAY_BUFFER, buffer_);
        gl.BufferData(GL_ARRAY_BUFFER, static_cast<GLsizeiptr>(vertices_.size() * sizeof(UiVertex)), vertices_.data(), GL_STREAM_DRAW);
        gl.DrawArrays(GL_TRIANGLES, 0, static_cast<GLsizei>(vertices_.size()));
        gl.BindVertexArray(0);
    }

    void destroy(lab::GlApi& gl) {
        gl.DeleteBuffers(1, &buffer_);
        gl.DeleteVertexArrays(1, &vao_);
        gl.DeleteProgram(program_);
        buffer_ = 0;
        vao_ = 0;
        program_ = 0;
    }

    private:
    GLuint program_ = 0, vao_ = 0, buffer_ = 0;
    float width_ = 1, height_ = 1;
    std::vector<UiVertex> vertices_;
};
} // namespace water3
