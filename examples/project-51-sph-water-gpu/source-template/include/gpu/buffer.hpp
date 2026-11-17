#pragma once
#include "gpu/api.hpp"
#include <cstddef>
#include <limits>
#include <utility>

namespace water51 {
// Own one SSBO allocation. Read back only after the submitting fence signals.

class Buffer {
    Gl* gl_ = nullptr;
    GLuint id_ = 0;
    std::size_t bytes_ = 0;

    public:
    Buffer() = default;

    Buffer(Gl& gl, std::size_t bytes)
        : gl_(&gl), bytes_(bytes) {
        if (bytes == 0 || bytes > static_cast<std::size_t>(std::numeric_limits<GLsizeiptr>::max()))
            throw std::length_error("Invalid GPU buffer size");
        gl.GenBuffers(1, &id_);
        gl.BindBuffer(GL_SHADER_STORAGE_BUFFER, id_);
        gl.BufferData(GL_SHADER_STORAGE_BUFFER, static_cast<GLsizeiptr>(bytes), nullptr, GL_DYNAMIC_COPY);
        try {
            gl.check("Allocate buffer");
        } catch (...) {
            gl.DeleteBuffers(1, &id_);
            id_ = 0;
            throw;
        }
    }

    ~Buffer() {
        if (id_ != 0)
            gl_->DeleteBuffers(1, &id_);
    }

    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;

    Buffer(Buffer&& other) noexcept
        : gl_(other.gl_), id_(std::exchange(other.id_, 0)), bytes_(other.bytes_) {}

    Buffer& operator=(Buffer&& other) noexcept {
        if (this == &other)
            return *this;
        if (id_ != 0)
            gl_->DeleteBuffers(1, &id_);
        gl_ = other.gl_;
        id_ = std::exchange(other.id_, 0);
        bytes_ = other.bytes_;
        return *this;
    }

    // [snippet ssbo-bind]
    void bind(GLuint binding) const {
        gl_->BindBufferBase(GL_SHADER_STORAGE_BUFFER, binding, id_);
    }

    // [/snippet ssbo-bind]

    void write(const void* data, std::size_t bytes, std::size_t offset = 0) const {
        if (offset > bytes_ || bytes > bytes_ - offset)
            throw std::out_of_range("Buffer write");
        gl_->BindBuffer(GL_SHADER_STORAGE_BUFFER, id_);
        gl_->BufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(offset), static_cast<GLsizeiptr>(bytes), data);
    }

    // [snippet readback]
    void read(void* data, std::size_t bytes, std::size_t offset = 0) const {
        if (offset > bytes_ || bytes > bytes_ - offset)
            throw std::out_of_range("Buffer read");
        gl_->BindBuffer(GL_SHADER_STORAGE_BUFFER, id_);
        gl_->GetBufferSubData(GL_SHADER_STORAGE_BUFFER, static_cast<GLintptr>(offset), static_cast<GLsizeiptr>(bytes), data);
    }

    // [/snippet readback]

    GLuint id() const {
        return id_;
    }
};
} // namespace water51
